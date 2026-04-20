import fs from 'fs';
import path from 'path';
import { query, transaction } from '../config/database';
import { PerformanceSummary, PerformanceMetric, PitchTypeSummary, MetricRating, SummarySourceType } from '../types';

const COACH_SUM_LOG = path.join(process.cwd(), 'CoachSum.log');

function logCoachSum(label: string, data: unknown): void {
    const line = `[${new Date().toISOString()}] ${label}\n${JSON.stringify(data, null, 2)}\n${'─'.repeat(80)}\n`;
    fs.appendFileSync(COACH_SUM_LOG, line);
}

const TARGET_ACCURACY_THRESHOLD = 0.15;

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

interface HistoricalBaseline {
    strike_percentage: { avg: number; stddev: number } | null;
    target_accuracy: { avg: number; stddev: number } | null;
    first_pitch_strike_pct: { avg: number; stddev: number } | null;
    three_ball_rate: { avg: number; stddev: number } | null;
}

export class PerformanceSummaryService {
    async getSummary(sourceType: SummarySourceType, sourceId: string): Promise<PerformanceSummary | null> {
        const result = await query('SELECT * FROM performance_summaries WHERE source_type = $1 AND source_id = $2', [
            sourceType,
            sourceId,
        ]);
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
        pitcherId: string,
        teamId: string
    ): Promise<PerformanceSummary> {
        // Check for existing summary
        const existing = await this.getSummary(sourceType, sourceId);
        if (existing) return existing;

        // Get pitcher name
        const playerResult = await query("SELECT first_name || ' ' || last_name AS name FROM players WHERE id = $1", [pitcherId]);
        const pitcherName = playerResult.rows[0]?.name || 'Unknown Pitcher';

        // Gather stats based on source type
        const stats =
            sourceType === 'game' ? await this.gatherGameStats(sourceId, pitcherId) : await this.gatherBullpenStats(sourceId);

        // Get historical baseline
        const baseline = await this.getHistoricalBaseline(pitcherId, sourceType);

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

        const summary = await this.getSummary(sourceType, sourceId);
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
        const accurateCount = withTarget.filter((p: any) => {
            const dist = Math.sqrt(Math.pow(p.actual_x - p.target_x, 2) + Math.pow(p.actual_y - p.target_y, 2));
            return dist <= TARGET_ACCURACY_THRESHOLD;
        }).length;

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
                    const dist = Math.sqrt(Math.pow(p.actual_x - p.target_x, 2) + Math.pow(p.actual_y - p.target_y, 2));
                    if (dist <= TARGET_ACCURACY_THRESHOLD) entry.accurate++;
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

            logCoachSum('REQUEST', {
                summaryId,
                pitcherName,
                sourceType,
                model: 'claude-haiku-4-5-20251001',
                system: 'You are an experienced pitching coach writing a brief post-session summary for a baseball pitcher. Be encouraging but honest. Reference specific numbers. Keep it to 2-4 sentences. Do not use bullet points or headers — write a natural paragraph.',
                userPrompt,
            });

            const response = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                system: 'You are an experienced pitching coach writing a brief post-session summary for a baseball pitcher. Be encouraging but honest. Reference specific numbers. Keep it to 2-4 sentences. Do not use bullet points or headers — write a natural paragraph.',
                messages: [{ role: 'user', content: userPrompt }],
            });

            logCoachSum('RESPONSE', {
                summaryId,
                stop_reason: response.stop_reason,
                usage: response.usage,
                content: response.content,
            });

            const narrative = response.content[0].type === 'text' ? response.content[0].text : null;

            if (narrative) {
                await query(
                    'UPDATE performance_summaries SET narrative = $1, narrative_generated_at = NOW(), updated_at = NOW() WHERE id = $2',
                    [narrative, summaryId]
                );
            }
        } catch (err) {
            logCoachSum('ERROR', { summaryId, error: String(err) });
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
