import { TARGET_ACCURACY_THRESHOLD, isTargetHit } from '../utils/pitchLocation';
import { query, transaction } from '../config/database';
import {
    PerformanceSummary,
    PerformanceMetric,
    PitchTypeSummary,
    MetricRating,
    SummarySourceType,
    BatterBreakdown,
    BatterAtBatSummary,
    BatterAtBatPitch,
} from '../types';

// Fixed coaching benchmarks
const BENCHMARKS = {
    strike_pct: { highlight: 62, concern: 50 },
    first_pitch_strike_pct: { highlight: 60, concern: 45 },
    target_accuracy: { highlight: 70, concern: 50 },
    velocity_std_dev: { highlight: 2, concern: 5 },
    three_ball_rate: { highlight: 20, concern: 35 },
    call_type_accuracy: { highlight: 80, concern: 60 },
};

// Historical comparison thresholds
const HISTORICAL_DELTA_THRESHOLD = 10; // percentage points

interface RawStats {
    total_pitches: number;
    strikes: number;
    balls: number;
    strike_percentage: number;
    target_accuracy_percentage: number | null;
    first_pitch_strike_pct: number | null;
    three_ball_rate: number | null;
    batters_faced: number | null;
    innings_pitched: number | null;
    runs_allowed: number | null;
    hits_allowed: number | null;
    intensity: string | null;
    plan_name: string | null;
    pitch_type_breakdown: {
        pitch_type: string;
        count: number;
        strikes: number;
        balls: number;
        avg_velocity: number | null;
        top_velocity: number | null;
        target_accuracy_percentage: number | null;
        velocities: number[];
    }[];
}

interface ScoutingPitcherStats {
    pitcher_id: string;
    pitcher_name: string;
    throws: string;
    team_side: string;
    team_name: string;
    total_pitches: number;
    pitch_mix: {
        pitch_type: string;
        count: number;
        strike_pct: number;
        early_count_pct: number;
        two_strike_pct: number;
    }[];
}

interface ScoutingTeamStats {
    team_name: string;
    team_side: 'home' | 'away';
    total_abs: number;
    k_pct: number | null;
    bb_pct: number | null;
    lhh_count: number;
    rhh_count: number;
    pull_pct: number | null;
    groundball_pct: number | null;
}

interface ScoutingRawStats {
    game_info: { opponent_name: string; scouting_home_team: string; game_date: string };
    pitchers: ScoutingPitcherStats[];
    teams: ScoutingTeamStats[];
    total_pitches: number;
    total_strikes: number;
    total_balls: number;
}

interface HistoricalBaseline {
    strike_percentage: { avg: number; stddev: number } | null;
    target_accuracy: { avg: number; stddev: number } | null;
    first_pitch_strike_pct: { avg: number; stddev: number } | null;
    three_ball_rate: { avg: number; stddev: number } | null;
}

export class PerformanceSummaryService {
    async getSummary(sourceType: SummarySourceType, sourceId: string, pitcherId?: string): Promise<PerformanceSummary | null> {
        if (pitcherId) {
            const result = await query(
                'SELECT * FROM performance_summaries WHERE source_type = $1 AND source_id = $2 AND pitcher_id = $3',
                [sourceType, sourceId, pitcherId]
            );
            if (result.rows.length === 0) return null;
            return this.mapRow(result.rows[0]);
        }
        const result = await query(
            'SELECT * FROM performance_summaries WHERE source_type = $1 AND source_id = $2 ORDER BY created_at DESC LIMIT 1',
            [sourceType, sourceId]
        );
        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    async getSummariesByPitcher(
        pitcherId: string,
        limit = 20,
        offset = 0
    ): Promise<{ summaries: PerformanceSummary[]; total_count: number }> {
        const result = await query(
            'SELECT * FROM performance_summaries WHERE pitcher_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [pitcherId, limit, offset]
        );
        const countResult = await query('SELECT COUNT(*) as total FROM performance_summaries WHERE pitcher_id = $1', [pitcherId]);
        return {
            summaries: result.rows.map((r: any) => this.mapRow(r)),
            total_count: parseInt(countResult.rows[0].total) || 0,
        };
    }

    async generateSummary(
        sourceType: SummarySourceType,
        sourceId: string,
        pitcherId: string | undefined,
        teamId: string
    ): Promise<PerformanceSummary> {
        // Scouting summaries: whole-game analysis of opposing tendencies
        if (sourceType === 'scouting') {
            return this.generateScoutingSummary(sourceId, teamId);
        }

        // Check for existing summary
        const existing = await this.getSummary(sourceType, sourceId, pitcherId);
        if (existing) {
            return existing;
        }

        // Get pitcher name
        const playerResult = await query("SELECT first_name || ' ' || last_name AS name FROM players WHERE id = $1", [pitcherId]);
        const pitcherName = playerResult.rows[0]?.name || 'Unknown Pitcher';

        // Gather stats based on source type
        const stats =
            sourceType === 'game' ? await this.gatherGameStats(sourceId, pitcherId!) : await this.gatherBullpenStats(sourceId);

        // Get historical baseline
        const baseline = await this.getHistoricalBaseline(pitcherId!, sourceType);

        // Evaluate metrics
        const metrics = this.evaluateMetrics(stats, baseline, sourceType);

        // Build pitch type summary with ratings
        const pitchTypeBreakdown = this.buildPitchTypeSummary(stats, baseline);

        // Categorize highlights and concerns
        const { highlights, concerns } = this.categorizeHighlightsAndConcerns(metrics, pitchTypeBreakdown, stats);

        // Persist summary
        const summaryId = await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO performance_summaries
                    (source_type, source_id, pitcher_id, team_id,
                     total_pitches, strikes, balls, strike_percentage, target_accuracy_percentage,
                     batters_faced, innings_pitched, runs_allowed, hits_allowed,
                     intensity, plan_name,
                     metrics, pitch_type_breakdown, highlights, concerns)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                 RETURNING id`,
                [
                    sourceType,
                    sourceId,
                    pitcherId,
                    teamId,
                    stats.total_pitches,
                    stats.strikes,
                    stats.balls,
                    stats.strike_percentage,
                    stats.target_accuracy_percentage,
                    stats.batters_faced,
                    stats.innings_pitched,
                    stats.runs_allowed,
                    stats.hits_allowed,
                    stats.intensity,
                    stats.plan_name,
                    JSON.stringify(metrics),
                    JSON.stringify(pitchTypeBreakdown),
                    JSON.stringify(highlights),
                    JSON.stringify(concerns),
                ]
            );
            return result.rows[0].id;
        });

        // Generate AI narrative (non-blocking — update after insert)
        this.generateNarrative(summaryId, pitcherName, sourceType, stats, metrics, highlights, concerns).catch((err) => {
            console.error('Failed to generate AI narrative:', err);
        });

        const summary = await this.getSummary(sourceType, sourceId, pitcherId);
        return { ...summary!, pitcher_name: pitcherName };
    }

    async regenerateNarrative(summaryId: string): Promise<PerformanceSummary | null> {
        const result = await query('SELECT * FROM performance_summaries WHERE id = $1', [summaryId]);
        if (result.rows.length === 0) return null;
        const row = result.rows[0];

        const playerResult = await query("SELECT first_name || ' ' || last_name AS name FROM players WHERE id = $1", [
            row.pitcher_id,
        ]);
        const pitcherName = playerResult.rows[0]?.name || 'Unknown Pitcher';

        await this.generateNarrative(
            summaryId,
            pitcherName,
            row.source_type,
            {
                total_pitches: row.total_pitches,
                strikes: row.strikes,
                balls: row.balls,
                strike_percentage: parseFloat(row.strike_percentage),
                target_accuracy_percentage: row.target_accuracy_percentage ? parseFloat(row.target_accuracy_percentage) : null,
                first_pitch_strike_pct: null,
                three_ball_rate: null,
                batters_faced: row.batters_faced,
                innings_pitched: row.innings_pitched ? parseFloat(row.innings_pitched) : null,
                runs_allowed: row.runs_allowed,
                hits_allowed: row.hits_allowed,
                intensity: row.intensity,
                plan_name: row.plan_name,
                pitch_type_breakdown: [],
            },
            row.metrics,
            row.highlights,
            row.concerns
        );

        return this.mapRow({ ...row, pitcher_name: pitcherName });
    }

    // ========================================================================
    // Stats Gathering
    // ========================================================================

    private async gatherGameStats(gameId: string, pitcherId: string): Promise<RawStats> {
        // Aggregate pitch stats
        const statsResult = await query(
            `SELECT
                COUNT(*) as total_pitches,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) as strikes,
                COUNT(CASE WHEN pitch_result = 'ball' THEN 1 END) as balls,
                COUNT(CASE
                    WHEN target_location_x IS NOT NULL AND target_location_y IS NOT NULL
                    AND location_x IS NOT NULL AND location_y IS NOT NULL
                    AND SQRT(POWER(location_x - target_location_x, 2) + POWER(location_y - target_location_y, 2)) <= $3
                    THEN 1 END) as accurate_pitches,
                COUNT(CASE WHEN target_location_x IS NOT NULL AND target_location_y IS NOT NULL THEN 1 END) as targeted_pitches
             FROM pitches WHERE pitcher_id = $1 AND game_id = $2`,
            [pitcherId, gameId, TARGET_ACCURACY_THRESHOLD]
        );

        const s = statsResult.rows[0];
        const totalPitches = parseInt(s.total_pitches) || 0;
        const strikes = parseInt(s.strikes) || 0;
        const balls = parseInt(s.balls) || 0;
        const targeted = parseInt(s.targeted_pitches) || 0;
        const accurate = parseInt(s.accurate_pitches) || 0;

        // First-pitch strike rate
        const fpsResult = await query(
            `SELECT
                COUNT(*) as first_pitches,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) as first_pitch_strikes
             FROM pitches WHERE pitcher_id = $1 AND game_id = $2 AND pitch_number = 1`,
            [pitcherId, gameId]
        );
        const fps = fpsResult.rows[0];
        const firstPitches = parseInt(fps.first_pitches) || 0;
        const firstPitchStrikes = parseInt(fps.first_pitch_strikes) || 0;

        // 3-ball count rate
        const threeBallResult = await query(
            `SELECT
                COUNT(DISTINCT at_bat_id) as total_abs,
                COUNT(DISTINCT CASE WHEN balls_before >= 3 THEN at_bat_id END) as three_ball_abs
             FROM pitches WHERE pitcher_id = $1 AND game_id = $2 AND at_bat_id IS NOT NULL`,
            [pitcherId, gameId]
        );
        const tb = threeBallResult.rows[0];
        const totalAbs = parseInt(tb.total_abs) || 0;
        const threeBallAbs = parseInt(tb.three_ball_abs) || 0;

        // Batters faced
        const battersResult = await query(
            `SELECT COUNT(DISTINCT COALESCE(ab.opponent_batter_id, ab.batter_id)) as batters_faced
             FROM at_bats ab WHERE ab.pitcher_id = $1 AND ab.game_id = $2`,
            [pitcherId, gameId]
        );

        // Innings pitched (count distinct innings where pitcher was active)
        const inningsResult = await query(
            `SELECT COUNT(DISTINCT i.id) as innings_count,
                    COALESCE(SUM(i.runs_scored), 0) as runs_allowed
             FROM innings i
             JOIN pitches p ON p.game_id = i.game_id
             WHERE p.pitcher_id = $1 AND p.game_id = $2
               AND i.pitching_team_id = (SELECT home_team_id FROM games WHERE id = $2)`,
            [pitcherId, gameId]
        );
        const inn = inningsResult.rows[0];

        const hitsResult = await query(
            `SELECT COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits_allowed
             FROM at_bats ab
             WHERE ab.pitcher_id = $1 AND ab.game_id = $2`,
            [pitcherId, gameId]
        );

        // Pitch type breakdown
        const ptResult = await query(
            `SELECT
                pitch_type,
                COUNT(*) as count,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) as strikes,
                COUNT(CASE WHEN pitch_result = 'ball' THEN 1 END) as balls,
                AVG(velocity) as avg_velocity,
                MAX(velocity) as top_velocity,
                ARRAY_AGG(velocity) FILTER (WHERE velocity IS NOT NULL) as velocities,
                COUNT(CASE
                    WHEN target_location_x IS NOT NULL AND target_location_y IS NOT NULL
                    AND location_x IS NOT NULL AND location_y IS NOT NULL
                    AND SQRT(POWER(location_x - target_location_x, 2) + POWER(location_y - target_location_y, 2)) <= $3
                    THEN 1 END) as accurate,
                COUNT(CASE WHEN target_location_x IS NOT NULL AND target_location_y IS NOT NULL THEN 1 END) as targeted
             FROM pitches WHERE pitcher_id = $1 AND game_id = $2
             GROUP BY pitch_type ORDER BY count DESC`,
            [pitcherId, gameId, TARGET_ACCURACY_THRESHOLD]
        );

        return {
            total_pitches: totalPitches,
            strikes,
            balls,
            strike_percentage: totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0,
            target_accuracy_percentage: targeted > 0 ? Math.round((accurate / targeted) * 100) : null,
            first_pitch_strike_pct: firstPitches > 0 ? Math.round((firstPitchStrikes / firstPitches) * 100) : null,
            three_ball_rate: totalAbs > 0 ? Math.round((threeBallAbs / totalAbs) * 100) : null,
            batters_faced: parseInt(battersResult.rows[0]?.batters_faced) || 0,
            innings_pitched: parseInt(inn?.innings_count) || null,
            runs_allowed: parseInt(inn?.runs_allowed) || null,
            hits_allowed: parseInt(hitsResult.rows[0]?.hits_allowed) || null,
            intensity: null,
            plan_name: null,
            pitch_type_breakdown: ptResult.rows.map((r: any) => ({
                pitch_type: r.pitch_type,
                count: parseInt(r.count) || 0,
                strikes: parseInt(r.strikes) || 0,
                balls: parseInt(r.balls) || 0,
                avg_velocity: r.avg_velocity ? parseFloat(parseFloat(r.avg_velocity).toFixed(1)) : null,
                top_velocity: r.top_velocity ? parseFloat(r.top_velocity) : null,
                target_accuracy_percentage:
                    parseInt(r.targeted) > 0 ? Math.round((parseInt(r.accurate) / parseInt(r.targeted)) * 100) : null,
                velocities: (r.velocities || []).map(Number),
            })),
        };
    }

    private async gatherBullpenStats(sessionId: string): Promise<RawStats> {
        const sessionResult = await query(
            `SELECT bs.*, bp.name AS plan_name
             FROM bullpen_sessions bs
             LEFT JOIN bullpen_plans bp ON bs.plan_id = bp.id
             WHERE bs.id = $1`,
            [sessionId]
        );
        if (sessionResult.rows.length === 0) throw new Error('Session not found');
        const session = sessionResult.rows[0];

        const pitchesResult = await query('SELECT * FROM bullpen_pitches WHERE session_id = $1 ORDER BY pitch_number ASC', [
            sessionId,
        ]);
        const pitches = pitchesResult.rows;

        const totalPitches = pitches.length;
        const strikes = pitches.filter((p: any) => ['called_strike', 'swinging_strike', 'foul'].includes(p.result)).length;
        const balls = pitches.filter((p: any) => p.result === 'ball').length;

        // Target accuracy
        const withTarget = pitches.filter(
            (p: any) => p.target_x != null && p.target_y != null && p.actual_x != null && p.actual_y != null
        );
        const accurateCount = withTarget.filter((p: any) => isTargetHit(p.target_x, p.target_y, p.actual_x, p.actual_y)).length;

        // Pitch type breakdown
        const typeMap = new Map<
            string,
            { count: number; strikes: number; balls: number; velocities: number[]; accurate: number; targeted: number }
        >();
        for (const p of pitches) {
            const entry = typeMap.get(p.pitch_type) || {
                count: 0,
                strikes: 0,
                balls: 0,
                velocities: [],
                accurate: 0,
                targeted: 0,
            };
            entry.count++;
            if (['called_strike', 'swinging_strike', 'foul'].includes(p.result)) entry.strikes++;
            if (p.result === 'ball') entry.balls++;
            if (p.velocity != null) entry.velocities.push(Number(p.velocity));
            if (p.target_x != null && p.target_y != null) {
                entry.targeted++;
                if (p.actual_x != null && p.actual_y != null) {
                    if (isTargetHit(p.target_x, p.target_y, p.actual_x, p.actual_y)) entry.accurate++;
                }
            }
            typeMap.set(p.pitch_type, entry);
        }

        return {
            total_pitches: totalPitches,
            strikes,
            balls,
            strike_percentage: totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0,
            target_accuracy_percentage: withTarget.length > 0 ? Math.round((accurateCount / withTarget.length) * 100) : null,
            first_pitch_strike_pct: null,
            three_ball_rate: null,
            batters_faced: null,
            innings_pitched: null,
            runs_allowed: null,
            hits_allowed: null,
            intensity: session.intensity,
            plan_name: session.plan_name || null,
            pitch_type_breakdown: Array.from(typeMap.entries()).map(([pitch_type, s]) => ({
                pitch_type,
                count: s.count,
                strikes: s.strikes,
                balls: s.balls,
                avg_velocity:
                    s.velocities.length > 0
                        ? Math.round((s.velocities.reduce((a, b) => a + b, 0) / s.velocities.length) * 10) / 10
                        : null,
                top_velocity: s.velocities.length > 0 ? Math.max(...s.velocities) : null,
                target_accuracy_percentage: s.targeted > 0 ? Math.round((s.accurate / s.targeted) * 100) : null,
                velocities: s.velocities,
            })),
        };
    }

    // ========================================================================
    // Scouting Summary
    // ========================================================================

    private async generateScoutingSummary(gameId: string, teamId: string): Promise<PerformanceSummary> {
        const existing = await this.getSummary('scouting', gameId);
        if (existing) return existing;

        const stats = await this.gatherScoutingStats(gameId);
        const { highlights, concerns } = this.buildScoutingHighlightsAndConcerns(stats);

        const summaryId = await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO performance_summaries
                    (source_type, source_id, pitcher_id, team_id,
                     total_pitches, strikes, balls, strike_percentage, target_accuracy_percentage,
                     batters_faced, innings_pitched, runs_allowed, hits_allowed,
                     intensity, plan_name,
                     metrics, pitch_type_breakdown, highlights, concerns)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
                 RETURNING id`,
                [
                    'scouting',
                    gameId,
                    null,
                    teamId,
                    stats.total_pitches,
                    stats.total_strikes,
                    stats.total_balls,
                    stats.total_pitches > 0 ? Math.round((stats.total_strikes / stats.total_pitches) * 100) : 0,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    JSON.stringify([]),
                    JSON.stringify([]),
                    JSON.stringify(highlights),
                    JSON.stringify(concerns),
                ]
            );
            return result.rows[0].id;
        });

        this.generateScoutingNarrative(summaryId, stats, highlights, concerns).catch((err) => {
            console.error('Failed to generate scouting AI narrative:', err);
        });

        const summary = await this.getSummary('scouting', gameId);
        return summary!;
    }

    private async gatherScoutingStats(gameId: string): Promise<ScoutingRawStats> {
        const gameResult = await query(`SELECT opponent_name, scouting_home_team, game_date FROM games WHERE id = $1`, [gameId]);
        const gameRow = gameResult.rows[0] || {};

        // Pitch mix per opposing pitcher with count state breakdowns
        const pitchResult = await query(
            `SELECT
                op.id AS pitcher_id,
                op.pitcher_name,
                op.throws,
                COALESCE(op.team_side, 'away') AS team_side,
                op.team_name,
                p.pitch_type,
                COUNT(*) AS pitch_count,
                COUNT(CASE WHEN p.pitch_result != 'ball' THEN 1 END) AS strikes,
                COUNT(CASE WHEN p.balls_before <= 1 AND p.strikes_before <= 1 THEN 1 END) AS early_count_pitches,
                COUNT(CASE WHEN p.strikes_before = 2 THEN 1 END) AS two_strike_pitches
             FROM pitches p
             JOIN at_bats ab ON p.at_bat_id = ab.id
             JOIN opposing_pitchers op ON ab.opposing_pitcher_id = op.id
             WHERE p.game_id = $1
             GROUP BY op.id, op.pitcher_name, op.throws, op.team_side, op.team_name, p.pitch_type
             ORDER BY op.pitcher_name, pitch_count DESC`,
            [gameId]
        );

        // Aggregate by pitcher
        const pitcherMap = new Map<string, ScoutingPitcherStats>();
        let totalPitches = 0;
        let totalStrikes = 0;
        let totalBalls = 0;

        for (const row of pitchResult.rows) {
            const pid = row.pitcher_id;
            if (!pitcherMap.has(pid)) {
                pitcherMap.set(pid, {
                    pitcher_id: pid,
                    pitcher_name: row.pitcher_name,
                    throws: row.throws?.trim(),
                    team_side: row.team_side,
                    team_name: row.team_name,
                    total_pitches: 0,
                    pitch_mix: [],
                });
            }
            const pitcher = pitcherMap.get(pid)!;
            const count = parseInt(row.pitch_count) || 0;
            const strikes = parseInt(row.strikes) || 0;
            pitcher.total_pitches += count;
            totalPitches += count;
            totalStrikes += strikes;
            totalBalls += count - strikes;
            pitcher.pitch_mix.push({
                pitch_type: row.pitch_type,
                count,
                strike_pct: count > 0 ? Math.round((strikes / count) * 100) : 0,
                early_count_pct: count > 0 ? Math.round((parseInt(row.early_count_pitches) / count) * 100) : 0,
                two_strike_pct: count > 0 ? Math.round((parseInt(row.two_strike_pitches) / count) * 100) : 0,
            });
        }

        // Batting result tendencies per team
        const battingResult = await query(
            `SELECT
                COALESCE(ol.team_side, 'away') AS team_side,
                ol.bats,
                ab.result,
                COUNT(*) AS cnt
             FROM at_bats ab
             JOIN opponent_lineup ol ON ab.opponent_batter_id = ol.id
             WHERE ab.game_id = $1 AND ab.result IS NOT NULL
             GROUP BY ol.team_side, ol.bats, ab.result`,
            [gameId]
        );

        // Hit direction tendencies per team
        const hitResult = await query(
            `SELECT
                COALESCE(ol.team_side, 'away') AS team_side,
                pl.hit_direction,
                pl.contact_type,
                COUNT(*) AS cnt
             FROM plays pl
             JOIN at_bats ab ON pl.at_bat_id = ab.id
             JOIN opponent_lineup ol ON ab.opponent_batter_id = ol.id
             WHERE ab.game_id = $1
             GROUP BY ol.team_side, pl.hit_direction, pl.contact_type`,
            [gameId]
        );

        // Team names from opposing_pitchers (most common per side)
        const teamNameResult = await query(
            `SELECT team_side, team_name, COUNT(*) AS cnt
             FROM opposing_pitchers WHERE game_id = $1 AND team_side IS NOT NULL
             GROUP BY team_side, team_name ORDER BY cnt DESC`,
            [gameId]
        );
        const teamNames: Record<string, string> = {};
        for (const r of teamNameResult.rows) {
            if (!teamNames[r.team_side]) teamNames[r.team_side] = r.team_name;
        }
        if (!teamNames['home']) teamNames['home'] = gameRow.scouting_home_team || 'Home Team';
        if (!teamNames['away']) teamNames['away'] = gameRow.opponent_name || 'Away Team';

        // Build team batting stats
        const teamStatsMap = new Map<string, ScoutingTeamStats>();
        for (const side of ['home', 'away'] as const) {
            teamStatsMap.set(side, {
                team_name: teamNames[side] || side,
                team_side: side,
                total_abs: 0,
                k_pct: null,
                bb_pct: null,
                lhh_count: 0,
                rhh_count: 0,
                pull_pct: null,
                groundball_pct: null,
            });
        }

        // Aggregate batting results
        const teamAbCounts: Record<string, { total: number; ks: number; bbs: number }> = {};
        const teamHandedness: Record<string, { L: number; R: number; S: number }> = {};
        for (const row of battingResult.rows) {
            const side = row.team_side as string;
            if (!teamAbCounts[side]) teamAbCounts[side] = { total: 0, ks: 0, bbs: 0 };
            if (!teamHandedness[side]) teamHandedness[side] = { L: 0, R: 0, S: 0 };
            const cnt = parseInt(row.cnt) || 0;
            teamAbCounts[side].total += cnt;
            if (row.result === 'strikeout') teamAbCounts[side].ks += cnt;
            if (row.result === 'walk' || row.result === 'hit_by_pitch') teamAbCounts[side].bbs += cnt;
            const bats = row.bats as string;
            if (bats === 'L' || bats === 'R' || bats === 'S') teamHandedness[side][bats] += cnt;
        }

        // Aggregate hit directions
        const hitDir: Record<string, { pull: number; center: number; opposite: number; total: number }> = {};
        const contactTypes: Record<string, { gb: number; fb: number; ld: number; total: number }> = {};
        for (const row of hitResult.rows) {
            const side = row.team_side as string;
            if (!hitDir[side]) hitDir[side] = { pull: 0, center: 0, opposite: 0, total: 0 };
            if (!contactTypes[side]) contactTypes[side] = { gb: 0, fb: 0, ld: 0, total: 0 };
            const cnt = parseInt(row.cnt) || 0;
            if (row.hit_direction) {
                hitDir[side].total += cnt;
                if (row.hit_direction === 'pull') hitDir[side].pull += cnt;
                else if (row.hit_direction === 'center') hitDir[side].center += cnt;
                else if (row.hit_direction === 'opposite') hitDir[side].opposite += cnt;
            }
            if (row.contact_type) {
                contactTypes[side].total += cnt;
                if (row.contact_type === 'ground_ball') contactTypes[side].gb += cnt;
                else if (row.contact_type === 'fly_ball') contactTypes[side].fb += cnt;
                else if (row.contact_type === 'line_drive') contactTypes[side].ld += cnt;
            }
        }

        for (const side of ['home', 'away'] as const) {
            const ts = teamStatsMap.get(side)!;
            const abc = teamAbCounts[side];
            if (abc) {
                ts.total_abs = abc.total;
                ts.k_pct = abc.total > 0 ? Math.round((abc.ks / abc.total) * 100) : null;
                ts.bb_pct = abc.total > 0 ? Math.round((abc.bbs / abc.total) * 100) : null;
            }
            const hand = teamHandedness[side];
            if (hand) {
                ts.lhh_count = hand.L + hand.S;
                ts.rhh_count = hand.R + hand.S;
            }
            const hd = hitDir[side];
            if (hd && hd.total >= 3) {
                ts.pull_pct = Math.round((hd.pull / hd.total) * 100);
            }
            const ct = contactTypes[side];
            if (ct && ct.total >= 3) {
                ts.groundball_pct = Math.round((ct.gb / ct.total) * 100);
            }
        }

        return {
            game_info: {
                opponent_name: gameRow.opponent_name || 'Away Team',
                scouting_home_team: gameRow.scouting_home_team || 'Home Team',
                game_date: gameRow.game_date,
            },
            pitchers: Array.from(pitcherMap.values()),
            teams: Array.from(teamStatsMap.values()),
            total_pitches: totalPitches,
            total_strikes: totalStrikes,
            total_balls: totalBalls,
        };
    }

    private buildScoutingHighlightsAndConcerns(stats: ScoutingRawStats): { highlights: string[]; concerns: string[] } {
        const highlights: string[] = [];
        const concerns: string[] = [];

        for (const pitcher of stats.pitchers) {
            if (pitcher.total_pitches < 5) continue;
            const topPitch = pitcher.pitch_mix[0];
            if (!topPitch) continue;

            const topPct = Math.round((topPitch.count / pitcher.total_pitches) * 100);
            const isFastball = ['4-seam', '2-seam', 'sinker', 'cutter', 'fastball', 'fb'].includes(
                topPitch.pitch_type.toLowerCase()
            );

            if (topPct >= 60) {
                highlights.push(
                    `${pitcher.pitcher_name} (${pitcher.team_name}): relies heavily on ${topPitch.pitch_type} — ${topPct}% of pitches`
                );
            }

            // Offspeed usage early in count
            const offspeedEarlyPitches = pitcher.pitch_mix
                .filter((pt) => !['4-seam', '2-seam', 'sinker', 'cutter', 'fastball', 'fb'].includes(pt.pitch_type.toLowerCase()))
                .reduce((sum, pt) => sum + Math.round((pt.early_count_pct / 100) * pt.count), 0);
            const totalEarlyPitches = pitcher.pitch_mix.reduce(
                (sum, pt) => sum + Math.round((pt.early_count_pct / 100) * pt.count),
                0
            );
            if (totalEarlyPitches >= 5) {
                const offspeedEarlyPct = Math.round((offspeedEarlyPitches / totalEarlyPitches) * 100);
                if (offspeedEarlyPct >= 35) {
                    highlights.push(
                        `${pitcher.pitcher_name} (${pitcher.team_name}): uses offspeed ${offspeedEarlyPct}% of early-count pitches — catches hitters off guard`
                    );
                } else if (isFastball && offspeedEarlyPct <= 15 && topPct >= 50) {
                    concerns.push(
                        `${pitcher.pitcher_name} (${pitcher.team_name}): fastball-heavy early in count (${100 - offspeedEarlyPct}% heaters) — predictable attack`
                    );
                }
            }

            // Pitch variety
            if (pitcher.pitch_mix.length === 1) {
                concerns.push(
                    `${pitcher.pitcher_name} (${pitcher.team_name}): one-pitch pitcher — only throws ${topPitch.pitch_type}`
                );
            } else if (pitcher.pitch_mix.length >= 4) {
                highlights.push(
                    `${pitcher.pitcher_name} (${pitcher.team_name}): diverse arsenal — ${pitcher.pitch_mix.length} pitch types`
                );
            }

            // Low strike rate on any pitch type used frequently
            for (const pt of pitcher.pitch_mix) {
                if (pt.count >= 5 && pt.strike_pct < 45) {
                    concerns.push(
                        `${pitcher.pitcher_name} (${pitcher.team_name}): poor command of ${pt.pitch_type} — ${pt.strike_pct}% strikes`
                    );
                }
            }
        }

        for (const team of stats.teams) {
            if (team.total_abs < 3) continue;

            // K rate
            if (team.k_pct !== null && team.k_pct >= 35) {
                highlights.push(`${team.team_name} offense: high strikeout rate (${team.k_pct}%) — attack with strikes early`);
            } else if (team.k_pct !== null && team.k_pct <= 15) {
                concerns.push(
                    `${team.team_name} offense: low strikeout rate (${team.k_pct}%) — disciplined lineup, hard to put away`
                );
            }

            // Pull tendency
            if (team.pull_pct !== null && team.pull_pct >= 60) {
                highlights.push(
                    `${team.team_name} hitters: strong pull tendency (${team.pull_pct}% pull contact) — pitch away and shift defense`
                );
            }

            // Groundball tendency
            if (team.groundball_pct !== null) {
                if (team.groundball_pct >= 60) {
                    highlights.push(`${team.team_name}: ground ball-heavy (${team.groundball_pct}%) — pitch down in the zone`);
                } else if (team.groundball_pct <= 25) {
                    concerns.push(`${team.team_name}: fly ball-heavy — elevation in zone increases extra-base hit risk`);
                }
            }

            // LHH/RHH split
            const totalBatters = team.lhh_count + team.rhh_count;
            if (totalBatters >= 3) {
                const lhhPct = Math.round((team.lhh_count / totalBatters) * 100);
                if (lhhPct >= 60) {
                    highlights.push(`${team.team_name}: majority left-handed lineup (${lhhPct}% LHH)`);
                } else if (lhhPct <= 20) {
                    highlights.push(`${team.team_name}: right-hand dominated lineup (${100 - lhhPct}% RHH)`);
                }
            }
        }

        if (highlights.length === 0 && stats.total_pitches > 0) {
            highlights.push(`Scouting data collected: ${stats.total_pitches} total pitches charted`);
        }

        return { highlights, concerns };
    }

    private async generateScoutingNarrative(
        summaryId: string,
        stats: ScoutingRawStats,
        highlights: string[],
        concerns: string[]
    ): Promise<void> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return;

        try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic({ apiKey });

            const pitcherLines = stats.pitchers
                .filter((p) => p.total_pitches >= 5)
                .map((p) => {
                    const topTwo = p.pitch_mix
                        .slice(0, 2)
                        .map((pt) => `${pt.pitch_type} (${Math.round((pt.count / p.total_pitches) * 100)}%)`);
                    return `${p.pitcher_name} (${p.team_name}, ${p.throws === 'L' ? 'LHP' : 'RHP'}): ${p.total_pitches} pitches, arsenal: ${topTwo.join(', ')}`;
                })
                .join('\n');

            const teamLines = stats.teams
                .filter((t) => t.total_abs >= 3)
                .map(
                    (t) =>
                        `${t.team_name}: ${t.total_abs} AB, K%=${t.k_pct ?? 'N/A'}%, BB%=${t.bb_pct ?? 'N/A'}%, pull%=${t.pull_pct ?? 'N/A'}%, GB%=${t.groundball_pct ?? 'N/A'}%`
                )
                .join('\n');

            const userPrompt = `Scouting report — game between ${stats.game_info.scouting_home_team} (home) and ${stats.game_info.opponent_name} (away).

Pitchers scouted:
${pitcherLines || 'No pitcher data'}

Team offensive tendencies:
${teamLines || 'No batting data'}

Key observations:
${highlights.map((h) => `- ${h}`).join('\n')}

Matchup concerns:
${concerns.length > 0 ? concerns.map((c) => `- ${c}`).join('\n') : '- None identified'}

Write a 3-5 sentence scouting report summary.`;

            const response = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                system: `You are an experienced baseball scout writing a concise scouting report for a coaching staff.
Focus on actionable insights: how opposing pitchers attack hitters (pitch selection by count, primary offerings, command), and offensive tendencies (pull rates, contact patterns, handedness split, disciplined vs. free-swinging).
Do not mention "my team" — describe both teams as the scouted subjects. Write in a direct, professional tone. No bullet points — natural paragraphs only. 3-5 sentences.`,
                messages: [{ role: 'user', content: userPrompt }],
            });

            const narrative = response.content[0].type === 'text' ? response.content[0].text : null;
            if (narrative) {
                await query(
                    'UPDATE performance_summaries SET narrative = $1, narrative_generated_at = NOW(), updated_at = NOW() WHERE id = $2',
                    [narrative, summaryId]
                );
            }
        } catch (err) {
            console.error('Scouting AI narrative generation failed:', err);
        }
    }

    // ========================================================================
    // Historical Baseline
    // ========================================================================

    private async getHistoricalBaseline(pitcherId: string, sourceType: SummarySourceType): Promise<HistoricalBaseline> {
        const blank: HistoricalBaseline = {
            strike_percentage: null,
            target_accuracy: null,
            first_pitch_strike_pct: null,
            three_ball_rate: null,
        };

        if (sourceType === 'game') {
            const result = await query(
                `SELECT
                    COUNT(*) FILTER (WHERE pitch_result != 'ball')::float / NULLIF(COUNT(*), 0) * 100 as strike_pct,
                    g.id as game_id
                 FROM pitches p
                 JOIN games g ON p.game_id = g.id
                 WHERE p.pitcher_id = $1 AND g.status = 'completed'
                 GROUP BY g.id
                 ORDER BY g.game_date DESC LIMIT 10`,
                [pitcherId]
            );
            if (result.rows.length < 3) return blank;

            const strikePcts = result.rows.map((r: any) => parseFloat(r.strike_pct));
            blank.strike_percentage = { avg: mean(strikePcts), stddev: stddev(strikePcts) };
        } else {
            const result = await query(
                `SELECT
                    bs.id,
                    COUNT(*) FILTER (WHERE bp.result IN ('called_strike','swinging_strike','foul'))::float
                        / NULLIF(COUNT(*), 0) * 100 as strike_pct
                 FROM bullpen_sessions bs
                 JOIN bullpen_pitches bp ON bp.session_id = bs.id
                 WHERE bs.pitcher_id = $1 AND bs.status = 'completed'
                 GROUP BY bs.id
                 ORDER BY bs.date DESC LIMIT 10`,
                [pitcherId]
            );
            if (result.rows.length < 3) return blank;

            const strikePcts = result.rows.map((r: any) => parseFloat(r.strike_pct));
            blank.strike_percentage = { avg: mean(strikePcts), stddev: stddev(strikePcts) };
        }

        return blank;
    }

    // ========================================================================
    // Metric Evaluation
    // ========================================================================

    private evaluateMetrics(stats: RawStats, baseline: HistoricalBaseline, sourceType: SummarySourceType): PerformanceMetric[] {
        const metrics: PerformanceMetric[] = [];

        // Strike %
        metrics.push(this.buildMetric('Strike %', stats.strike_percentage, BENCHMARKS.strike_pct, baseline.strike_percentage));

        // First-pitch strike % (game only)
        if (sourceType === 'game' && stats.first_pitch_strike_pct != null) {
            metrics.push(
                this.buildMetric(
                    'First-Pitch Strike %',
                    stats.first_pitch_strike_pct,
                    BENCHMARKS.first_pitch_strike_pct,
                    baseline.first_pitch_strike_pct
                )
            );
        }

        // Target accuracy
        if (stats.target_accuracy_percentage != null) {
            metrics.push(
                this.buildMetric(
                    'Target Accuracy',
                    stats.target_accuracy_percentage,
                    BENCHMARKS.target_accuracy,
                    baseline.target_accuracy
                )
            );
        }

        // 3-ball count rate (game only, lower is better)
        if (sourceType === 'game' && stats.three_ball_rate != null) {
            metrics.push(
                this.buildMetric(
                    '3-Ball Count Rate',
                    stats.three_ball_rate,
                    BENCHMARKS.three_ball_rate,
                    baseline.three_ball_rate,
                    true // inverted: lower is better
                )
            );
        }

        return metrics;
    }

    private buildMetric(
        name: string,
        value: number,
        benchmark: { highlight: number; concern: number },
        historical: { avg: number; stddev: number } | null,
        inverted = false
    ): PerformanceMetric {
        // Benchmark rating
        let benchmarkRating: MetricRating = 'neutral';
        if (!inverted) {
            if (value >= benchmark.highlight) benchmarkRating = 'highlight';
            else if (value <= benchmark.concern) benchmarkRating = 'concern';
        } else {
            if (value <= benchmark.highlight) benchmarkRating = 'highlight';
            else if (value >= benchmark.concern) benchmarkRating = 'concern';
        }

        // Historical rating
        let histRating: MetricRating = 'neutral';
        const deltaFromAvg = historical ? value - historical.avg : null;
        if (historical && Math.abs(deltaFromAvg!) >= HISTORICAL_DELTA_THRESHOLD) {
            if (!inverted) {
                histRating = deltaFromAvg! > 0 ? 'highlight' : 'concern';
            } else {
                histRating = deltaFromAvg! < 0 ? 'highlight' : 'concern';
            }
        }

        // Combined rating: if both agree, use that. If one is neutral, use the other.
        let rating: MetricRating = 'neutral';
        if (benchmarkRating === histRating) {
            rating = benchmarkRating;
        } else if (benchmarkRating === 'neutral') {
            rating = histRating;
        } else if (histRating === 'neutral') {
            rating = benchmarkRating;
        } else {
            // Disagree: lean neutral
            rating = 'neutral';
        }

        return {
            metric_name: name,
            value,
            benchmark_value: !inverted ? benchmark.highlight : benchmark.highlight,
            historical_avg: historical?.avg ?? null,
            rating,
            delta_from_avg: deltaFromAvg != null ? Math.round(deltaFromAvg * 10) / 10 : null,
        };
    }

    // ========================================================================
    // Pitch Type Summary
    // ========================================================================

    private buildPitchTypeSummary(stats: RawStats, _baseline: HistoricalBaseline): PitchTypeSummary[] {
        return stats.pitch_type_breakdown.map((pt) => {
            const strikePct = pt.count > 0 ? Math.round((pt.strikes / pt.count) * 100) : 0;
            const velStdDev = pt.velocities.length >= 3 ? stddev(pt.velocities) : null;

            // Rate pitch type: good strike % and consistent velocity = highlight
            let rating: MetricRating = 'neutral';
            if (strikePct >= BENCHMARKS.strike_pct.highlight) rating = 'highlight';
            else if (strikePct <= BENCHMARKS.strike_pct.concern) rating = 'concern';
            // Override to concern if velocity is wildly inconsistent
            if (velStdDev != null && velStdDev >= BENCHMARKS.velocity_std_dev.concern) rating = 'concern';

            return {
                pitch_type: pt.pitch_type,
                count: pt.count,
                strikes: pt.strikes,
                balls: pt.balls,
                strike_percentage: strikePct,
                avg_velocity: pt.avg_velocity,
                top_velocity: pt.top_velocity,
                target_accuracy_percentage: pt.target_accuracy_percentage,
                rating,
            };
        });
    }

    // ========================================================================
    // Highlights & Concerns
    // ========================================================================

    private categorizeHighlightsAndConcerns(
        metrics: PerformanceMetric[],
        pitchTypes: PitchTypeSummary[],
        stats: RawStats
    ): { highlights: string[]; concerns: string[] } {
        const highlights: string[] = [];
        const concerns: string[] = [];

        for (const m of metrics) {
            const deltaStr = m.delta_from_avg != null ? ` (${m.delta_from_avg > 0 ? '+' : ''}${m.delta_from_avg}% vs avg)` : '';
            if (m.rating === 'highlight') {
                highlights.push(`${m.metric_name}: ${m.value}%${deltaStr}`);
            } else if (m.rating === 'concern') {
                concerns.push(`${m.metric_name}: ${m.value}%${deltaStr}`);
            }
        }

        for (const pt of pitchTypes) {
            const name = pt.pitch_type.charAt(0).toUpperCase() + pt.pitch_type.slice(1);
            if (pt.rating === 'highlight' && pt.count >= 5) {
                highlights.push(
                    `${name} was sharp: ${pt.strike_percentage}% strikes${pt.top_velocity ? `, topped ${pt.top_velocity} mph` : ''}`
                );
            } else if (pt.rating === 'concern' && pt.count >= 5) {
                concerns.push(`${name} command needs work: ${pt.strike_percentage}% strikes`);
            }
        }

        // If no highlights, add something positive
        if (highlights.length === 0 && stats.total_pitches > 0) {
            highlights.push(`Completed session with ${stats.total_pitches} pitches`);
        }

        return { highlights, concerns };
    }

    // ========================================================================
    // Batter Breakdown
    // ========================================================================

    async getBatterBreakdown(gameId: string): Promise<BatterBreakdown[]> {
        const result = await query(
            `SELECT
                ol.id AS batter_id,
                ol.player_name AS batter_name,
                ol.batting_order,
                ol.bats,
                ol.position,
                ab.id AS at_bat_id,
                ab.result AS at_bat_result,
                ab.created_at AS ab_created_at,
                i.inning_number,
                i.half AS inning_half,
                pl.fielded_by_position,
                p.pitch_number,
                p.pitch_type,
                p.pitch_result,
                p.balls_before,
                p.strikes_before,
                p.velocity,
                p.target_zone,
                p.target_location_x,
                p.target_location_y,
                (p.pitch_number = (
                    SELECT MAX(p2.pitch_number) FROM pitches p2 WHERE p2.at_bat_id = ab.id
                )) AS is_ab_ending
             FROM opponent_lineup ol
             JOIN at_bats ab ON ab.opponent_batter_id = ol.id
             JOIN innings i ON ab.inning_id = i.id
             JOIN pitches p ON p.at_bat_id = ab.id
             LEFT JOIN plays pl ON pl.at_bat_id = ab.id
             WHERE ol.game_id = $1
             ORDER BY ol.batting_order, i.inning_number,
                 CASE i.half WHEN 'top' THEN 0 ELSE 1 END,
                 ab.created_at, p.pitch_number`,
            [gameId]
        );

        // Aggregate rows into nested BatterBreakdown[]
        const batterMap = new Map<string, BatterBreakdown>();
        const atBatMap = new Map<string, BatterAtBatSummary>();

        for (const row of result.rows) {
            if (!batterMap.has(row.batter_id)) {
                batterMap.set(row.batter_id, {
                    batter_id: row.batter_id,
                    batter_name: row.batter_name,
                    batting_order: row.batting_order,
                    bats: row.bats,
                    position: row.position || undefined,
                    at_bats: [],
                });
            }
            const batter = batterMap.get(row.batter_id)!;

            if (!atBatMap.has(row.at_bat_id)) {
                const atBat: BatterAtBatSummary = {
                    at_bat_id: row.at_bat_id,
                    inning_number: row.inning_number,
                    inning_half: row.inning_half,
                    result: row.at_bat_result || undefined,
                    fielded_by_position: row.fielded_by_position || undefined,
                    pitches: [],
                };
                atBatMap.set(row.at_bat_id, atBat);
                batter.at_bats.push(atBat);
            }
            const atBat = atBatMap.get(row.at_bat_id)!;

            const pitch: BatterAtBatPitch = {
                pitch_number: row.pitch_number,
                pitch_type: row.pitch_type,
                pitch_result: row.pitch_result,
                balls_before: row.balls_before,
                strikes_before: row.strikes_before,
                velocity: row.velocity != null ? parseFloat(row.velocity) : undefined,
                is_ab_ending: row.is_ab_ending === true || row.is_ab_ending === 't',
                target_zone: row.target_zone ?? undefined,
                target_location_x: row.target_location_x != null ? parseFloat(row.target_location_x) : undefined,
                target_location_y: row.target_location_y != null ? parseFloat(row.target_location_y) : undefined,
            };
            atBat.pitches.push(pitch);
        }

        return Array.from(batterMap.values());
    }

    async getMyTeamBatterBreakdown(gameId: string): Promise<BatterBreakdown[]> {
        const result = await query(
            `WITH active_lineup AS (
                SELECT DISTINCT ON (player_id) player_id, batting_order, position
                FROM my_team_lineup
                WHERE game_id = $1
                ORDER BY player_id, batting_order
            )
            SELECT
                ab.batter_id,
                p.first_name || ' ' || p.last_name AS batter_name,
                COALESCE(al.batting_order, ab.batting_order) AS batting_order,
                COALESCE(p.bats, 'R') AS bats,
                al.position,
                ab.id AS at_bat_id,
                ab.result AS at_bat_result,
                ab.created_at AS ab_created_at,
                i.inning_number,
                i.half AS inning_half,
                pl.fielded_by_position,
                pt.pitch_number,
                pt.pitch_type,
                pt.pitch_result,
                pt.balls_before,
                pt.strikes_before,
                pt.velocity,
                pt.target_zone,
                pt.target_location_x,
                pt.target_location_y,
                (pt.pitch_number = (
                    SELECT MAX(p2.pitch_number) FROM pitches p2 WHERE p2.at_bat_id = ab.id
                )) AS is_ab_ending
            FROM at_bats ab
            JOIN players p ON p.id = ab.batter_id
            JOIN innings i ON ab.inning_id = i.id
            JOIN pitches pt ON pt.at_bat_id = ab.id
            LEFT JOIN active_lineup al ON al.player_id = ab.batter_id
            LEFT JOIN plays pl ON pl.at_bat_id = ab.id
            WHERE ab.game_id = $1
              AND ab.batter_id IS NOT NULL
            ORDER BY COALESCE(al.batting_order, ab.batting_order) NULLS LAST,
                     i.inning_number,
                     CASE i.half WHEN 'top' THEN 0 ELSE 1 END,
                     ab.created_at, pt.pitch_number`,
            [gameId]
        );

        const batterMap = new Map<string, BatterBreakdown>();
        const atBatMap = new Map<string, BatterAtBatSummary>();

        for (const row of result.rows) {
            if (!batterMap.has(row.batter_id)) {
                batterMap.set(row.batter_id, {
                    batter_id: row.batter_id,
                    batter_name: row.batter_name,
                    batting_order: row.batting_order,
                    bats: row.bats,
                    position: row.position || undefined,
                    at_bats: [],
                });
            }
            const batter = batterMap.get(row.batter_id)!;

            if (!atBatMap.has(row.at_bat_id)) {
                const atBat: BatterAtBatSummary = {
                    at_bat_id: row.at_bat_id,
                    inning_number: row.inning_number,
                    inning_half: row.inning_half,
                    result: row.at_bat_result || undefined,
                    fielded_by_position: row.fielded_by_position || undefined,
                    pitches: [],
                };
                atBatMap.set(row.at_bat_id, atBat);
                batter.at_bats.push(atBat);
            }
            const atBat = atBatMap.get(row.at_bat_id)!;

            const pitch: BatterAtBatPitch = {
                pitch_number: row.pitch_number,
                pitch_type: row.pitch_type,
                pitch_result: row.pitch_result,
                balls_before: row.balls_before,
                strikes_before: row.strikes_before,
                velocity: row.velocity != null ? parseFloat(row.velocity) : undefined,
                is_ab_ending: row.is_ab_ending === true || row.is_ab_ending === 't',
                target_zone: row.target_zone ?? undefined,
                target_location_x: row.target_location_x != null ? parseFloat(row.target_location_x) : undefined,
                target_location_y: row.target_location_y != null ? parseFloat(row.target_location_y) : undefined,
            };
            atBat.pitches.push(pitch);
        }

        return Array.from(batterMap.values());
    }

    // ========================================================================
    // AI Narrative
    // ========================================================================

    private async generateNarrative(
        summaryId: string,
        pitcherName: string,
        sourceType: SummarySourceType,
        stats: RawStats,
        metrics: PerformanceMetric[],
        highlights: string[],
        concerns: string[]
    ): Promise<void> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return;

        try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic({ apiKey });

            const sessionLabel = sourceType === 'game' ? 'game' : 'bullpen session';
            const userPrompt = `Pitcher: ${pitcherName}
Session type: ${sessionLabel}
Total pitches: ${stats.total_pitches}, Strike%: ${stats.strike_percentage}%, Target accuracy: ${stats.target_accuracy_percentage ?? 'N/A'}%
${stats.batters_faced != null ? `Batters faced: ${stats.batters_faced}` : ''}
${stats.innings_pitched != null ? `Innings pitched: ${stats.innings_pitched}` : ''}

Highlights (things that went well):
${highlights.map((h) => `- ${h}`).join('\n')}

Concerns (things to work on):
${concerns.length > 0 ? concerns.map((c) => `- ${c}`).join('\n') : '- None'}

Key metrics:
${JSON.stringify(metrics, null, 2)}

Write a 2-4 sentence coaching summary paragraph.`;

            const response = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: 'You are an experienced pitching coach writing a brief post-session summary for a baseball pitcher. Be encouraging but honest. Reference specific numbers. Keep it to 2-4 sentences. Do not use bullet points or headers — write a natural paragraph.',
                messages: [{ role: 'user', content: userPrompt }],
            });

            const narrative = response.content[0].type === 'text' ? response.content[0].text : null;

            if (narrative) {
                await query(
                    'UPDATE performance_summaries SET narrative = $1, narrative_generated_at = NOW(), updated_at = NOW() WHERE id = $2',
                    [narrative, summaryId]
                );
            }
        } catch (err) {
            console.error('AI narrative generation failed:', err);
        }
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private mapRow(row: any): PerformanceSummary {
        return {
            id: row.id,
            source_type: row.source_type,
            source_id: row.source_id,
            pitcher_id: row.pitcher_id,
            pitcher_name: row.pitcher_name || '',
            team_id: row.team_id,
            created_at: row.created_at,
            narrative: row.narrative,
            narrative_generated_at: row.narrative_generated_at,
            total_pitches: row.total_pitches,
            strikes: row.strikes,
            balls: row.balls,
            strike_percentage: parseFloat(row.strike_percentage) || 0,
            target_accuracy_percentage: row.target_accuracy_percentage ? parseFloat(row.target_accuracy_percentage) : null,
            batters_faced: row.batters_faced,
            innings_pitched: row.innings_pitched ? parseFloat(row.innings_pitched) : null,
            runs_allowed: row.runs_allowed,
            hits_allowed: row.hits_allowed,
            intensity: row.intensity,
            plan_name: row.plan_name,
            metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics || [],
            pitch_type_breakdown:
                typeof row.pitch_type_breakdown === 'string'
                    ? JSON.parse(row.pitch_type_breakdown)
                    : row.pitch_type_breakdown || [],
            highlights: typeof row.highlights === 'string' ? JSON.parse(row.highlights) : row.highlights || [],
            concerns: typeof row.concerns === 'string' ? JSON.parse(row.concerns) : row.concerns || [],
        };
    }
}

// Math helpers
function mean(arr: number[]): number {
    return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    const variance = arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (arr.length - 1);
    return Math.round(Math.sqrt(variance) * 10) / 10;
}

export default new PerformanceSummaryService();
