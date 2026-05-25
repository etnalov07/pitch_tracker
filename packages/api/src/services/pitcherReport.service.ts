// Pitcher Performance Report — cross-game aggregation, velocity trend,
// trend detection, and Claude-generated narrative. Backs the
// /analytics/pitcher/:id/report endpoint. See docs/plans/2026-05-25-pitcher-performance-report.md.

import { query } from '../config/database';
import { aggregateAccuracy } from './performanceSummary.service';
import type {
    PitcherReportPayload,
    PitcherReportPitchTypeRow,
    PitcherReportStats,
    PitcherReportWindow,
    PitcherReportZoneRow,
    PitcherTrendCallout,
    VelocityTrendPoint,
} from '../types';

const WINDOW_LIMITS: Record<PitcherReportWindow, number | null> = {
    last5: 5,
    last10: 10,
    last20: 20,
    season: null, // gated by year-of-game_date instead of LIMIT
    all: null,
};

const WINDOW_LABELS: Record<PitcherReportWindow, string> = {
    last5: 'Last 5 games',
    last10: 'Last 10 games',
    last20: 'Last 20 games',
    season: 'This season',
    all: 'All time',
};

// Coaching thresholds for success/struggles tagging per pitch type and per
// zone. Mirrors performanceSummary.service.ts BENCHMARKS where possible.
const PITCH_TYPE_BENCHMARK = { works: 62, mixed: 50 }; // strike_pct
const ZONE_BENCHMARK = { works: 60, mixed: 45 }; // strike_pct (zones)

// Trend thresholds — last 3 games vs prior N for trend detection.
const TREND_VELOCITY_DELTA = 1; // mph
const TREND_PCT_DELTA = 5; // percentage points
const TREND_MIN_PRIOR = 3; // need >=3 prior games to compare

interface PerGameAgg {
    game_id: string;
    game_date: string;
    opponent_name: string | null;
    pitches: number;
    strikes: number;
    balls: number;
    strike_pct: number;
    batters_faced: number;
    avg_velocity: number | null;
    top_velocity: number | null;
    velocity_count: number;
    target_accuracy_pct: number | null;
    first_pitch_strikes: number;
    first_pitches: number;
    three_ball_abs: number;
    total_abs: number;
    runs_allowed: number;
    hits_allowed: number;
    whiffs: number;
    swings: number;
}

class PitcherReportService {
    // -----------------------------------------------------------------
    // Public entry
    // -----------------------------------------------------------------

    async getReport(pitcherId: string, window: PitcherReportWindow): Promise<PitcherReportPayload> {
        const pitcher = await this.fetchPitcher(pitcherId);
        if (!pitcher) {
            throw new Error('Pitcher not found');
        }

        const games = await this.fetchGamesForWindow(pitcherId, window);
        if (games.length === 0) {
            return this.emptyPayload(pitcherId, pitcher.name, window);
        }

        const perGame = await this.aggregatePerGame(pitcherId, games);
        const stats = await this.aggregateAcrossGames(pitcherId, games);
        const velocityTrend = this.buildVelocityTrend(perGame);
        const trends = this.detectTrends(perGame);

        // Upsert the cached row so the narrative job can update it. source_id
        // stays NULL — the partial unique index keys by (pitcher_id, window_key).
        const cached = await this.upsertReportRow(pitcherId, pitcher.name, window, stats);

        let narrative: string | null = cached.narrative;
        let narrativeAt: string | null = cached.narrative_generated_at;

        if (!narrative) {
            // Fire-and-forget. Client polls until narrative lands.
            this.generateNarrative(cached.id, pitcher.name, window, stats, trends).catch((err) => {
                console.error('pitcher-report narrative generation failed:', err);
            });
        }

        return {
            pitcher_id: pitcherId,
            pitcher_name: pitcher.name,
            window,
            window_label: WINDOW_LABELS[window],
            stats,
            velocity_trend: velocityTrend,
            trends,
            games: perGame.map((g) => ({
                game_id: g.game_id,
                game_date: g.game_date,
                opponent_name: g.opponent_name,
                pitches: g.pitches,
                strikes: g.strikes,
                strike_pct: g.strike_pct,
                batters_faced: g.batters_faced,
                target_accuracy_pct: g.target_accuracy_pct,
                avg_velocity: g.avg_velocity,
                runs_allowed: g.runs_allowed,
                hits_allowed: g.hits_allowed,
            })),
            narrative,
            narrative_generated_at: narrativeAt,
        };
    }

    async regenerateNarrative(pitcherId: string, window: PitcherReportWindow): Promise<PitcherReportPayload> {
        // Force regen: clear narrative on the cached row, fall through to getReport
        // which will fire generation again because narrative is null.
        await query(
            `UPDATE performance_summaries
             SET narrative = NULL, narrative_generated_at = NULL
             WHERE source_type = 'pitcher_report' AND pitcher_id = $1 AND window_key = $2`,
            [pitcherId, window]
        );
        return this.getReport(pitcherId, window);
    }

    // -----------------------------------------------------------------
    // Pitcher lookup
    // -----------------------------------------------------------------

    private async fetchPitcher(pitcherId: string): Promise<{ name: string } | null> {
        const result = await query(`SELECT first_name, last_name FROM players WHERE id = $1`, [pitcherId]);
        if (result.rows.length === 0) return null;
        const r = result.rows[0];
        return { name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || 'Pitcher' };
    }

    // -----------------------------------------------------------------
    // Window resolution
    // -----------------------------------------------------------------

    private async fetchGamesForWindow(pitcherId: string, window: PitcherReportWindow): Promise<string[]> {
        const limit = WINDOW_LIMITS[window];
        if (window === 'season') {
            const r = await query(
                `SELECT DISTINCT g.id
                 FROM games g
                 JOIN pitches p ON p.game_id = g.id
                 WHERE p.pitcher_id = $1
                   AND EXTRACT(YEAR FROM g.game_date) = EXTRACT(YEAR FROM NOW())
                 ORDER BY g.id`,
                [pitcherId]
            );
            // Re-order by game_date desc so trend math is consistent. Two-step
            // because DISTINCT + ORDER BY non-distinct column requires a wrap.
            const gameIds = r.rows.map((x: any) => x.id);
            if (gameIds.length === 0) return [];
            const ordered = await query(`SELECT id FROM games WHERE id = ANY($1::uuid[]) ORDER BY game_date DESC`, [gameIds]);
            return ordered.rows.map((x: any) => x.id);
        }

        const limitSql = limit ? `LIMIT ${limit}` : '';
        const r = await query(
            `SELECT g.id
             FROM games g
             WHERE g.id IN (SELECT DISTINCT p.game_id FROM pitches p WHERE p.pitcher_id = $1)
             ORDER BY g.game_date DESC
             ${limitSql}`,
            [pitcherId]
        );
        return r.rows.map((x: any) => x.id);
    }

    // -----------------------------------------------------------------
    // Per-game aggregation (one pass with grouped queries)
    // -----------------------------------------------------------------

    private async aggregatePerGame(pitcherId: string, gameIds: string[]): Promise<PerGameAgg[]> {
        if (gameIds.length === 0) return [];

        // Pitch-level totals per game
        const pitchesResult = await query(
            `SELECT
                p.game_id,
                g.game_date,
                g.opponent_name,
                COUNT(*) AS pitches,
                COUNT(CASE WHEN p.pitch_result != 'ball' THEN 1 END) AS strikes,
                COUNT(CASE WHEN p.pitch_result = 'ball' THEN 1 END) AS balls,
                AVG(p.velocity) AS avg_velocity,
                MAX(p.velocity) AS top_velocity,
                COUNT(p.velocity) AS velocity_count,
                COUNT(CASE WHEN p.pitch_result = 'swinging_strike' THEN 1 END) AS whiffs,
                COUNT(CASE WHEN p.pitch_result IN ('swinging_strike', 'foul', 'in_play') THEN 1 END) AS swings,
                COUNT(CASE WHEN p.pitch_number = 1 THEN 1 END) AS first_pitches,
                COUNT(CASE WHEN p.pitch_number = 1 AND p.pitch_result != 'ball' THEN 1 END) AS first_pitch_strikes
             FROM pitches p
             JOIN games g ON g.id = p.game_id
             WHERE p.pitcher_id = $1 AND p.game_id = ANY($2::uuid[])
             GROUP BY p.game_id, g.game_date, g.opponent_name`,
            [pitcherId, gameIds]
        );

        // Batters faced + 3-ball ABs + runs allowed + hits allowed per game
        const atBatsResult = await query(
            `SELECT
                ab.game_id,
                COUNT(DISTINCT COALESCE(ab.opponent_batter_id, ab.batter_id)) AS batters_faced,
                COUNT(DISTINCT ab.id) AS total_abs,
                COUNT(DISTINCT CASE WHEN EXISTS (
                    SELECT 1 FROM pitches pp
                    WHERE pp.at_bat_id = ab.id AND pp.balls_before >= 3
                ) THEN ab.id END) AS three_ball_abs,
                COALESCE(SUM(ab.runs_scored), 0) AS runs_allowed,
                COUNT(CASE WHEN ab.result IN ('single','double','triple','home_run') THEN 1 END) AS hits_allowed
             FROM at_bats ab
             WHERE ab.pitcher_id = $1 AND ab.game_id = ANY($2::uuid[])
             GROUP BY ab.game_id`,
            [pitcherId, gameIds]
        );
        const abByGame = new Map<string, any>(atBatsResult.rows.map((r: any) => [r.game_id, r]));

        // Zone-based accuracy per game
        const accuracyResult = await query(
            `SELECT game_id, pitch_type, target_zone, target_location_x, target_location_y, location_x, location_y
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])
               AND target_location_x IS NOT NULL AND target_location_y IS NOT NULL
               AND location_x IS NOT NULL AND location_y IS NOT NULL`,
            [pitcherId, gameIds]
        );
        const accuracyByGame = new Map<string, any[]>();
        for (const row of accuracyResult.rows) {
            if (!accuracyByGame.has(row.game_id)) accuracyByGame.set(row.game_id, []);
            accuracyByGame.get(row.game_id)!.push(row);
        }

        const result: PerGameAgg[] = pitchesResult.rows.map((r: any) => {
            const pitches = parseInt(r.pitches) || 0;
            const strikes = parseInt(r.strikes) || 0;
            const balls = parseInt(r.balls) || 0;
            const ab = abByGame.get(r.game_id) ?? {};
            const accRows = accuracyByGame.get(r.game_id) ?? [];
            const accAgg = accRows.length > 0 ? aggregateAccuracy(accRows) : { overall: null };
            return {
                game_id: r.game_id,
                game_date: r.game_date instanceof Date ? r.game_date.toISOString() : String(r.game_date),
                opponent_name: r.opponent_name ?? null,
                pitches,
                strikes,
                balls,
                strike_pct: pitches > 0 ? Math.round((strikes / pitches) * 100) : 0,
                batters_faced: parseInt(ab.batters_faced) || 0,
                avg_velocity: r.avg_velocity ? parseFloat(parseFloat(r.avg_velocity).toFixed(1)) : null,
                top_velocity: r.top_velocity ? parseFloat(r.top_velocity) : null,
                velocity_count: parseInt(r.velocity_count) || 0,
                target_accuracy_pct: accAgg.overall,
                first_pitches: parseInt(r.first_pitches) || 0,
                first_pitch_strikes: parseInt(r.first_pitch_strikes) || 0,
                total_abs: parseInt(ab.total_abs) || 0,
                three_ball_abs: parseInt(ab.three_ball_abs) || 0,
                runs_allowed: parseInt(ab.runs_allowed) || 0,
                hits_allowed: parseInt(ab.hits_allowed) || 0,
                whiffs: parseInt(r.whiffs) || 0,
                swings: parseInt(r.swings) || 0,
            };
        });

        // Sort newest game first to match the velocity trend / game log expectations.
        result.sort((a, b) => (a.game_date < b.game_date ? 1 : -1));
        return result;
    }

    // -----------------------------------------------------------------
    // Cross-game aggregate stats
    // -----------------------------------------------------------------

    private async aggregateAcrossGames(pitcherId: string, gameIds: string[]): Promise<PitcherReportStats> {
        // Global pitch + accuracy + count metrics
        const globalsResult = await query(
            `SELECT
                COUNT(*) AS total_pitches,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) AS strikes,
                COUNT(CASE WHEN pitch_result = 'ball' THEN 1 END) AS balls,
                COUNT(CASE WHEN pitch_number = 1 THEN 1 END) AS first_pitches,
                COUNT(CASE WHEN pitch_number = 1 AND pitch_result != 'ball' THEN 1 END) AS first_pitch_strikes
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])`,
            [pitcherId, gameIds]
        );
        const g = globalsResult.rows[0];
        const totalPitches = parseInt(g.total_pitches) || 0;
        const strikes = parseInt(g.strikes) || 0;
        const balls = parseInt(g.balls) || 0;
        const firstPitches = parseInt(g.first_pitches) || 0;
        const firstPitchStrikes = parseInt(g.first_pitch_strikes) || 0;

        // 3-ball rate over distinct at-bats
        const threeBallResult = await query(
            `SELECT
                COUNT(DISTINCT at_bat_id) AS total_abs,
                COUNT(DISTINCT CASE WHEN balls_before >= 3 THEN at_bat_id END) AS three_ball_abs
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[]) AND at_bat_id IS NOT NULL`,
            [pitcherId, gameIds]
        );
        const tb = threeBallResult.rows[0];
        const totalAbs = parseInt(tb.total_abs) || 0;
        const threeBallAbs = parseInt(tb.three_ball_abs) || 0;

        // Batters faced + runs + hits
        const abResult = await query(
            `SELECT
                COUNT(DISTINCT COALESCE(opponent_batter_id, batter_id)) AS batters_faced,
                COALESCE(SUM(runs_scored), 0) AS runs_allowed,
                COUNT(CASE WHEN result IN ('single','double','triple','home_run') THEN 1 END) AS hits_allowed
             FROM at_bats
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])`,
            [pitcherId, gameIds]
        );
        const ab = abResult.rows[0];

        // Innings pitched (distinct innings the pitcher threw in)
        const inningsResult = await query(
            `SELECT COUNT(*) AS innings_count
             FROM (
                 SELECT DISTINCT i.id
                 FROM pitches p
                 JOIN at_bats ab2 ON p.at_bat_id = ab2.id
                 JOIN innings i ON ab2.inning_id = i.id
                 WHERE p.pitcher_id = $1 AND p.game_id = ANY($2::uuid[])
             ) ip`,
            [pitcherId, gameIds]
        );

        // Zone-based accuracy across the window
        const accuracyResult = await query(
            `SELECT pitch_type, target_zone, target_location_x, target_location_y, location_x, location_y
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])
               AND target_location_x IS NOT NULL AND target_location_y IS NOT NULL
               AND location_x IS NOT NULL AND location_y IS NOT NULL`,
            [pitcherId, gameIds]
        );
        const accuracyAgg = aggregateAccuracy(accuracyResult.rows);

        // Per-pitch-type breakdown across the window
        const pitchTypeResult = await query(
            `SELECT
                pitch_type,
                COUNT(*) AS count,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) AS strikes,
                COUNT(CASE WHEN pitch_result = 'swinging_strike' THEN 1 END) AS whiffs,
                COUNT(CASE WHEN pitch_result IN ('swinging_strike','foul','in_play') THEN 1 END) AS swings,
                AVG(velocity) AS avg_velocity,
                MAX(velocity) AS top_velocity
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])
             GROUP BY pitch_type
             ORDER BY count DESC`,
            [pitcherId, gameIds]
        );
        const pitchTypes: PitcherReportPitchTypeRow[] = pitchTypeResult.rows
            .filter((r: any) => r.pitch_type)
            .map((r: any) => {
                const count = parseInt(r.count) || 0;
                const ptStrikes = parseInt(r.strikes) || 0;
                const whiffs = parseInt(r.whiffs) || 0;
                const swings = parseInt(r.swings) || 0;
                const strikePct = count > 0 ? Math.round((ptStrikes / count) * 100) : 0;
                const whiffPct = swings > 0 ? Math.round((whiffs / swings) * 100) : 0;
                const success: PitcherReportPitchTypeRow['success'] =
                    strikePct >= PITCH_TYPE_BENCHMARK.works
                        ? 'works'
                        : strikePct >= PITCH_TYPE_BENCHMARK.mixed
                          ? 'mixed'
                          : 'struggles';
                return {
                    pitch_type: r.pitch_type,
                    count,
                    usage_pct: totalPitches > 0 ? Math.round((count / totalPitches) * 100) : 0,
                    strike_pct: strikePct,
                    whiff_pct: whiffPct,
                    avg_velocity: r.avg_velocity ? parseFloat(parseFloat(r.avg_velocity).toFixed(1)) : null,
                    top_velocity: r.top_velocity ? parseFloat(r.top_velocity) : null,
                    success,
                };
            });

        // Per-target-zone breakdown across the window
        const zoneResult = await query(
            `SELECT
                target_zone,
                COUNT(*) AS count,
                COUNT(CASE WHEN pitch_result != 'ball' THEN 1 END) AS strikes,
                COUNT(CASE WHEN pitch_result = 'in_play' THEN 1 END) AS in_play,
                COUNT(CASE WHEN pitch_result = 'swinging_strike' THEN 1 END) AS whiffs,
                COUNT(CASE WHEN pitch_result IN ('swinging_strike','foul','in_play') THEN 1 END) AS swings
             FROM pitches
             WHERE pitcher_id = $1 AND game_id = ANY($2::uuid[])
               AND target_zone IS NOT NULL
             GROUP BY target_zone
             ORDER BY count DESC`,
            [pitcherId, gameIds]
        );
        // Per-zone weak/hard contact via at_bat result join.
        const zoneContactResult = await query(
            `SELECT p.target_zone,
                COUNT(CASE WHEN ab.result IN ('single','double','triple','home_run') THEN 1 END) AS hard_contact,
                COUNT(CASE WHEN ab.result IN ('out_groundout','out_flyout','out_lineout','out_popup','fielders_choice','sacrifice_fly','sacrifice_bunt') THEN 1 END) AS weak_contact
             FROM pitches p
             LEFT JOIN at_bats ab ON ab.id = p.at_bat_id
             WHERE p.pitcher_id = $1 AND p.game_id = ANY($2::uuid[])
               AND p.target_zone IS NOT NULL AND p.pitch_result = 'in_play'
             GROUP BY p.target_zone`,
            [pitcherId, gameIds]
        );
        const contactByZone = new Map<string, any>(zoneContactResult.rows.map((r: any) => [r.target_zone, r]));

        const zones: PitcherReportZoneRow[] = zoneResult.rows.map((r: any) => {
            const count = parseInt(r.count) || 0;
            const zStrikes = parseInt(r.strikes) || 0;
            const whiffs = parseInt(r.whiffs) || 0;
            const swings = parseInt(r.swings) || 0;
            const inPlay = parseInt(r.in_play) || 0;
            const contact = contactByZone.get(r.target_zone) ?? {};
            const hardContact = parseInt(contact.hard_contact) || 0;
            const weakContact = parseInt(contact.weak_contact) || 0;
            const strikePct = count > 0 ? Math.round((zStrikes / count) * 100) : 0;
            const success: PitcherReportZoneRow['success'] =
                strikePct >= ZONE_BENCHMARK.works ? 'works' : strikePct >= ZONE_BENCHMARK.mixed ? 'mixed' : 'struggles';
            return {
                zone: r.target_zone,
                count,
                strike_pct: strikePct,
                in_play_pct: count > 0 ? Math.round((inPlay / count) * 100) : 0,
                weak_contact_pct: count > 0 ? Math.round((weakContact / count) * 100) : 0,
                hard_contact_pct: count > 0 ? Math.round((hardContact / count) * 100) : 0,
                whiff_pct: swings > 0 ? Math.round((whiffs / swings) * 100) : 0,
                success,
            };
        });

        return {
            games_included: gameIds.length,
            total_pitches: totalPitches,
            strikes,
            balls,
            strike_pct: totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0,
            target_accuracy_pct: accuracyAgg.overall,
            first_pitch_strike_pct: firstPitches > 0 ? Math.round((firstPitchStrikes / firstPitches) * 100) : null,
            three_ball_rate: totalAbs > 0 ? Math.round((threeBallAbs / totalAbs) * 100) : null,
            batters_faced: parseInt(ab.batters_faced) || 0,
            innings_pitched: parseInt(inningsResult.rows[0]?.innings_count) || 0,
            runs_allowed: parseInt(ab.runs_allowed) || 0,
            hits_allowed: parseInt(ab.hits_allowed) || 0,
            pitch_types: pitchTypes,
            zones,
        };
    }

    // -----------------------------------------------------------------
    // Velocity trend
    // -----------------------------------------------------------------

    private buildVelocityTrend(perGame: PerGameAgg[]): VelocityTrendPoint[] | null {
        const withVelo = perGame.filter((g) => g.velocity_count > 0 && g.avg_velocity != null && g.top_velocity != null);
        if (withVelo.length === 0) return null;
        // Oldest first for left-to-right charting
        return withVelo
            .slice()
            .reverse()
            .map((g) => ({
                game_id: g.game_id,
                game_date: g.game_date,
                opponent_name: g.opponent_name,
                avg_velocity: g.avg_velocity!,
                top_velocity: g.top_velocity!,
                pitch_count: g.velocity_count,
            }));
    }

    // -----------------------------------------------------------------
    // Trend detection (last 3 vs prior N)
    // -----------------------------------------------------------------

    private detectTrends(perGame: PerGameAgg[]): PitcherTrendCallout[] {
        const trends: PitcherTrendCallout[] = [];
        if (perGame.length < 3 + TREND_MIN_PRIOR) return trends;

        // perGame is newest first. Slice the most-recent 3 vs the next chunk.
        const recent = perGame.slice(0, 3);
        const prior = perGame.slice(3);

        const recentVelo = avgIgnoringNull(recent.map((g) => g.avg_velocity));
        const priorVelo = avgIgnoringNull(prior.map((g) => g.avg_velocity));
        if (recentVelo != null && priorVelo != null) {
            const delta = +(recentVelo - priorVelo).toFixed(1);
            if (Math.abs(delta) >= TREND_VELOCITY_DELTA) {
                trends.push({
                    kind: 'velocity',
                    direction: delta > 0 ? 'up' : 'down',
                    magnitude: Math.abs(delta),
                    copy: `Velocity ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)} mph over last 3 games (avg ${recentVelo.toFixed(1)} vs ${priorVelo.toFixed(1)} prior).`,
                });
            }
        }

        const recentStrikePct = avg(recent.map((g) => g.strike_pct));
        const priorStrikePct = avg(prior.map((g) => g.strike_pct));
        if (Math.abs(recentStrikePct - priorStrikePct) >= TREND_PCT_DELTA) {
            const direction = recentStrikePct > priorStrikePct ? 'up' : 'down';
            trends.push({
                kind: 'strike_pct',
                direction,
                magnitude: Math.abs(recentStrikePct - priorStrikePct),
                copy: `Strike% ${direction} ${Math.abs(recentStrikePct - priorStrikePct)} pts last 3 (${recentStrikePct}% vs ${priorStrikePct}% prior).`,
            });
        }

        const recentAcc = avgIgnoringNull(recent.map((g) => g.target_accuracy_pct));
        const priorAcc = avgIgnoringNull(prior.map((g) => g.target_accuracy_pct));
        if (recentAcc != null && priorAcc != null && Math.abs(recentAcc - priorAcc) >= TREND_PCT_DELTA) {
            const direction = recentAcc > priorAcc ? 'up' : 'down';
            trends.push({
                kind: 'command',
                direction,
                magnitude: Math.round(Math.abs(recentAcc - priorAcc)),
                copy: `Command grade ${direction} ${Math.round(Math.abs(recentAcc - priorAcc))} pts last 3 (${Math.round(recentAcc)} vs ${Math.round(priorAcc)} prior).`,
            });
        }

        const recentWhiffPct = pctFromSums(
            recent.map((g) => g.whiffs),
            recent.map((g) => g.swings)
        );
        const priorWhiffPct = pctFromSums(
            prior.map((g) => g.whiffs),
            prior.map((g) => g.swings)
        );
        if (recentWhiffPct != null && priorWhiffPct != null && Math.abs(recentWhiffPct - priorWhiffPct) >= TREND_PCT_DELTA) {
            const direction = recentWhiffPct > priorWhiffPct ? 'up' : 'down';
            trends.push({
                kind: 'whiff',
                direction,
                magnitude: Math.abs(recentWhiffPct - priorWhiffPct),
                copy: `Whiff rate ${direction} ${Math.abs(recentWhiffPct - priorWhiffPct)} pts last 3 (${recentWhiffPct}% vs ${priorWhiffPct}% prior).`,
            });
        }

        const recentFps = pctFromSums(
            recent.map((g) => g.first_pitch_strikes),
            recent.map((g) => g.first_pitches)
        );
        const priorFps = pctFromSums(
            prior.map((g) => g.first_pitch_strikes),
            prior.map((g) => g.first_pitches)
        );
        if (recentFps != null && priorFps != null && Math.abs(recentFps - priorFps) >= TREND_PCT_DELTA) {
            const direction = recentFps > priorFps ? 'up' : 'down';
            trends.push({
                kind: 'first_pitch_strike',
                direction,
                magnitude: Math.abs(recentFps - priorFps),
                copy: `1st-pitch strike rate ${direction} ${Math.abs(recentFps - priorFps)} pts last 3 (${recentFps}% vs ${priorFps}% prior).`,
            });
        }

        return trends;
    }

    // -----------------------------------------------------------------
    // Cache upsert + narrative
    // -----------------------------------------------------------------

    private async upsertReportRow(
        pitcherId: string,
        pitcherName: string,
        window: PitcherReportWindow,
        stats: PitcherReportStats
    ): Promise<{ id: string; narrative: string | null; narrative_generated_at: string | null }> {
        // Try to fetch existing cached row.
        const existing = await query(
            `SELECT id, narrative, narrative_generated_at
             FROM performance_summaries
             WHERE source_type = 'pitcher_report' AND pitcher_id = $1 AND window_key = $2`,
            [pitcherId, window]
        );

        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            // Refresh the stats fields. Keep narrative as-is; let regenerate or
            // null-narrative-fallthrough drive new generation.
            await query(
                `UPDATE performance_summaries
                 SET total_pitches = $1,
                     strikes = $2,
                     balls = $3,
                     strike_percentage = $4,
                     target_accuracy_percentage = $5,
                     batters_faced = $6,
                     innings_pitched = $7,
                     runs_allowed = $8,
                     hits_allowed = $9,
                     pitcher_name = $10,
                     updated_at = NOW()
                 WHERE id = $11`,
                [
                    stats.total_pitches,
                    stats.strikes,
                    stats.balls,
                    stats.strike_pct,
                    stats.target_accuracy_pct,
                    stats.batters_faced,
                    stats.innings_pitched,
                    stats.runs_allowed,
                    stats.hits_allowed,
                    pitcherName,
                    row.id,
                ]
            );
            return {
                id: row.id,
                narrative: row.narrative,
                narrative_generated_at:
                    row.narrative_generated_at instanceof Date
                        ? row.narrative_generated_at.toISOString()
                        : row.narrative_generated_at,
            };
        }

        const inserted = await query(
            `INSERT INTO performance_summaries (
                source_type, source_id, pitcher_id, pitcher_name, window_key,
                total_pitches, strikes, balls, strike_percentage,
                target_accuracy_percentage, batters_faced, innings_pitched,
                runs_allowed, hits_allowed
             ) VALUES ('pitcher_report', NULL, $1, $2, $3,
                       $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id, narrative, narrative_generated_at`,
            [
                pitcherId,
                pitcherName,
                window,
                stats.total_pitches,
                stats.strikes,
                stats.balls,
                stats.strike_pct,
                stats.target_accuracy_pct,
                stats.batters_faced,
                stats.innings_pitched,
                stats.runs_allowed,
                stats.hits_allowed,
            ]
        );
        const row = inserted.rows[0];
        return { id: row.id, narrative: row.narrative, narrative_generated_at: row.narrative_generated_at };
    }

    private async generateNarrative(
        summaryId: string,
        pitcherName: string,
        window: PitcherReportWindow,
        stats: PitcherReportStats,
        trends: PitcherTrendCallout[]
    ): Promise<void> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return;
        if (stats.total_pitches === 0) return;

        try {
            const Anthropic = (await import('@anthropic-ai/sdk')).default;
            const client = new Anthropic({ apiKey });

            const topTypes = stats.pitch_types
                .slice(0, 4)
                .map(
                    (t) =>
                        `${t.pitch_type}: ${t.count} pitches (${t.usage_pct}% usage), ${t.strike_pct}% strikes, ${t.whiff_pct}% whiffs${t.avg_velocity != null ? `, ${t.avg_velocity} mph avg` : ''}`
                )
                .join('\n');

            const topWorkingZones =
                stats.zones
                    .filter((z) => z.success === 'works')
                    .slice(0, 3)
                    .map((z) => `- ${z.zone}: ${z.strike_pct}% strikes, ${z.whiff_pct}% whiffs (${z.count} pitches)`)
                    .join('\n') || '- (none with strong results)';

            const topStruggleZones =
                stats.zones
                    .filter((z) => z.success === 'struggles')
                    .slice(0, 3)
                    .map((z) => `- ${z.zone}: ${z.strike_pct}% strikes, ${z.hard_contact_pct}% hard contact (${z.count} pitches)`)
                    .join('\n') || '- (none flagged as struggles)';

            const trendLines =
                trends.length > 0 ? trends.map((t) => `- ${t.copy}`).join('\n') : '- (no significant trends vs prior outings)';

            const userPrompt = `Pitcher: ${pitcherName}
Window: ${WINDOW_LABELS[window]} (${stats.games_included} games)
Aggregate stats:
- ${stats.total_pitches} pitches, ${stats.strike_pct}% strikes${stats.target_accuracy_pct != null ? `, ${stats.target_accuracy_pct}% command grade` : ''}
- ${stats.batters_faced} batters faced, ${stats.innings_pitched} innings
- ${stats.runs_allowed} runs, ${stats.hits_allowed} hits allowed
${stats.first_pitch_strike_pct != null ? `- 1st-pitch strike rate: ${stats.first_pitch_strike_pct}%` : ''}
${stats.three_ball_rate != null ? `- 3-ball count rate: ${stats.three_ball_rate}%` : ''}

Pitch arsenal (top 4 by usage):
${topTypes || '- (no pitch types logged)'}

Working best in these zones:
${topWorkingZones}

Struggling in these zones:
${topStruggleZones}

Recent trends (last 3 outings vs prior):
${trendLines}

Write a 3-5 sentence coaching summary that covers: (1) what's working well, (2) where the pitcher has been most successful (which pitches and zones), (3) what they're struggling with, and (4) any notable trend. Reference specific numbers. Encouraging but honest. Natural paragraph, no bullets or headers.`;

            const response = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                system: 'You are an experienced pitching coach writing a brief multi-outing performance review for a baseball pitcher. Be encouraging but honest. Reference specific numbers. 3-5 sentences. Do not use bullet points or headers — write a natural paragraph.',
                messages: [{ role: 'user', content: userPrompt }],
            });

            const narrative = response.content[0].type === 'text' ? response.content[0].text : null;
            if (narrative) {
                await query(
                    `UPDATE performance_summaries
                     SET narrative = $1, narrative_generated_at = NOW(), updated_at = NOW()
                     WHERE id = $2`,
                    [narrative, summaryId]
                );
            }
        } catch (err) {
            console.error('pitcher-report narrative generation failed:', err);
        }
    }

    // -----------------------------------------------------------------
    // Empty payload (pitcher has 0 games in window)
    // -----------------------------------------------------------------

    private emptyPayload(pitcherId: string, pitcherName: string, window: PitcherReportWindow): PitcherReportPayload {
        return {
            pitcher_id: pitcherId,
            pitcher_name: pitcherName,
            window,
            window_label: WINDOW_LABELS[window],
            stats: {
                games_included: 0,
                total_pitches: 0,
                strikes: 0,
                balls: 0,
                strike_pct: 0,
                target_accuracy_pct: null,
                first_pitch_strike_pct: null,
                three_ball_rate: null,
                batters_faced: 0,
                innings_pitched: 0,
                runs_allowed: 0,
                hits_allowed: 0,
                pitch_types: [],
                zones: [],
            },
            velocity_trend: null,
            trends: [],
            games: [],
            narrative: null,
            narrative_generated_at: null,
        };
    }
}

// -----------------------------------------------------------------
// Pure helpers
// -----------------------------------------------------------------

function avg(arr: number[]): number {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function avgIgnoringNull(arr: (number | null)[]): number | null {
    const present = arr.filter((x): x is number => x != null);
    if (present.length === 0) return null;
    return present.reduce((a, b) => a + b, 0) / present.length;
}

function pctFromSums(num: number[], den: number[]): number | null {
    const n = num.reduce((a, b) => a + b, 0);
    const d = den.reduce((a, b) => a + b, 0);
    if (d === 0) return null;
    return Math.round((n / d) * 100);
}

export default new PitcherReportService();
