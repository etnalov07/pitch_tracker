import { query } from '../config/database';
import { PitchCallAccuracy, GameCallAnalytics, SeasonCallAnalytics, PitchCallAbbrev } from '../types';

/**
 * Pitch Call Analytics Service
 *
 * Joins pitch_calls to pitches via pitch_id to compute call-vs-execution
 * accuracy metrics. Answers: "How well does the pitcher execute what was called?"
 */
export class PitchCallAnalyticsService {
    /**
     * Get call-vs-execution accuracy for a specific pitcher.
     * Optionally scoped to a single game.
     */
    async getPitcherAccuracy(pitcherId: string, gameId?: string): Promise<PitchCallAccuracy | null> {
        const gameFilter = gameId ? 'AND pc.game_id = $2' : '';
        const params = gameId ? [pitcherId, gameId] : [pitcherId];

        // Fetch all linked calls for this pitcher
        const result = await query(
            `SELECT
                pc.pitch_type AS called_type,
                pc.zone AS called_zone,
                p.pitch_type AS actual_type,
                p.zone AS actual_zone,
                p.target_zone AS actual_target_zone,
                pc.balls_before,
                pc.strikes_before,
                pl.first_name || ' ' || pl.last_name AS pitcher_name
             FROM pitch_calls pc
             JOIN pitches p ON pc.pitch_id = p.id
             LEFT JOIN players pl ON pc.pitcher_id = pl.id
             WHERE pc.pitcher_id = $1
               AND pc.pitch_id IS NOT NULL
               ${gameFilter}
             ORDER BY pc.created_at ASC`,
            params
        );

        if (result.rows.length === 0) return null;

        const rows = result.rows;
        const pitcherName = rows[0].pitcher_name || '';

        // Map abbreviated call types to full pitch types for comparison
        const abbrevToFull: Record<string, string[]> = {
            FB: ['fastball', '4-seam'],
            '2S': ['2-seam', 'sinker'],
            CB: ['curveball'],
            CH: ['changeup'],
            SL: ['slider'],
            CT: ['cutter'],
        };

        let typeMatches = 0;
        let zoneMatches = 0;
        const byTypeMap = new Map<string, { total: number; type_match: number; zone_match: number }>();
        const byCountMap = new Map<string, { total: number; type_match: number; zone_match: number }>();

        for (const row of rows) {
            const calledAbbrev = row.called_type;
            const actualType = row.actual_type;
            const calledZone = row.called_zone;
            const actualZone = row.actual_zone || row.actual_target_zone;

            // Type match: does the actual pitch type match the called abbreviation?
            const expectedTypes = abbrevToFull[calledAbbrev] || [];
            const isTypeMatch = expectedTypes.includes(actualType);
            if (isTypeMatch) typeMatches++;

            // Zone match: does the actual zone match the called zone?
            const isZoneMatch = calledZone && actualZone && calledZone === actualZone;
            if (isZoneMatch) zoneMatches++;

            // By type breakdown
            const typeEntry = byTypeMap.get(calledAbbrev) || { total: 0, type_match: 0, zone_match: 0 };
            typeEntry.total++;
            if (isTypeMatch) typeEntry.type_match++;
            if (isZoneMatch) typeEntry.zone_match++;
            byTypeMap.set(calledAbbrev, typeEntry);

            // By count breakdown
            const countKey = `${row.balls_before}-${row.strikes_before}`;
            const countEntry = byCountMap.get(countKey) || { total: 0, type_match: 0, zone_match: 0 };
            countEntry.total++;
            if (isTypeMatch) countEntry.type_match++;
            if (isZoneMatch) countEntry.zone_match++;
            byCountMap.set(countKey, countEntry);
        }

        const total = rows.length;

        return {
            pitcher_id: pitcherId,
            pitcher_name: pitcherName,
            total_linked: total,
            type_accuracy: total > 0 ? Math.round((typeMatches / total) * 1000) / 10 : 0,
            zone_accuracy: total > 0 ? Math.round((zoneMatches / total) * 1000) / 10 : 0,
            by_type: Array.from(byTypeMap.entries()).map(([called_type, stats]) => ({
                called_type: called_type as PitchCallAbbrev,
                ...stats,
            })),
            by_count: Array.from(byCountMap.entries()).map(([countKey, stats]) => {
                const [balls, strikes] = countKey.split('-').map(Number);
                return {
                    balls,
                    strikes,
                    total: stats.total,
                    type_accuracy: stats.total > 0 ? Math.round((stats.type_match / stats.total) * 1000) / 10 : 0,
                    zone_accuracy: stats.total > 0 ? Math.round((stats.zone_match / stats.total) * 1000) / 10 : 0,
                };
            }),
        };
    }

    /**
     * Get call analytics for a specific game across all pitchers.
     */
    async getGameAnalytics(gameId: string): Promise<GameCallAnalytics | null> {
        // Get all calls with results for this game
        const callsResult = await query(
            `SELECT pc.*, p.pitch_type AS actual_type, p.zone AS actual_zone,
                    p.target_zone AS actual_target_zone,
                    pl.first_name || ' ' || pl.last_name AS pitcher_name
             FROM pitch_calls pc
             LEFT JOIN pitches p ON pc.pitch_id = p.id
             LEFT JOIN players pl ON pc.pitcher_id = pl.id
             WHERE pc.game_id = $1
               AND pc.result IS NOT NULL
             ORDER BY pc.call_number ASC`,
            [gameId]
        );

        if (callsResult.rows.length === 0) return null;

        const rows = callsResult.rows;
        const results = { strike: 0, ball: 0, foul: 0, in_play: 0 };
        let totalLinked = 0;
        let typeMatches = 0;
        let zoneMatches = 0;

        const abbrevToFull: Record<string, string[]> = {
            FB: ['fastball', '4-seam'],
            '2S': ['2-seam', 'sinker'],
            CB: ['curveball'],
            CH: ['changeup'],
            SL: ['slider'],
            CT: ['cutter'],
        };

        const pitcherMap = new Map<
            string,
            { pitcher_id: string; pitcher_name: string; total: number; type_match: number; zone_match: number }
        >();

        for (const row of rows) {
            // Count results
            if (row.result in results) {
                results[row.result as keyof typeof results]++;
            }

            // If pitch is linked, compute accuracy
            if (row.actual_type) {
                totalLinked++;
                const expectedTypes = abbrevToFull[row.pitch_type] || [];
                const isTypeMatch = expectedTypes.includes(row.actual_type);
                if (isTypeMatch) typeMatches++;

                const isZoneMatch =
                    row.zone &&
                    (row.actual_zone || row.actual_target_zone) &&
                    row.zone === (row.actual_zone || row.actual_target_zone);
                if (isZoneMatch) zoneMatches++;

                // Per-pitcher
                if (row.pitcher_id) {
                    const entry = pitcherMap.get(row.pitcher_id) || {
                        pitcher_id: row.pitcher_id,
                        pitcher_name: row.pitcher_name || '',
                        total: 0,
                        type_match: 0,
                        zone_match: 0,
                    };
                    entry.total++;
                    if (isTypeMatch) entry.type_match++;
                    if (isZoneMatch) entry.zone_match++;
                    pitcherMap.set(row.pitcher_id, entry);
                }
            }
        }

        return {
            game_id: gameId,
            total_calls: rows.length,
            total_linked: totalLinked,
            type_accuracy: totalLinked > 0 ? Math.round((typeMatches / totalLinked) * 1000) / 10 : 0,
            zone_accuracy: totalLinked > 0 ? Math.round((zoneMatches / totalLinked) * 1000) / 10 : 0,
            results,
            by_pitcher: Array.from(pitcherMap.values()).map((entry) => ({
                pitcher_id: entry.pitcher_id,
                pitcher_name: entry.pitcher_name,
                total: entry.total,
                type_accuracy: entry.total > 0 ? Math.round((entry.type_match / entry.total) * 1000) / 10 : 0,
                zone_accuracy: entry.total > 0 ? Math.round((entry.zone_match / entry.total) * 1000) / 10 : 0,
            })),
        };
    }

    /**
     * Get season-level call analytics for a team.
     */
    async getSeasonAnalytics(teamId: string): Promise<SeasonCallAnalytics | null> {
        const result = await query(
            `SELECT
                COUNT(DISTINCT pc.game_id) AS games_with_calls,
                COUNT(pc.id) AS total_calls,
                COUNT(pc.pitch_id) AS total_linked,
                COUNT(CASE WHEN pc.result = 'strike' THEN 1 END) AS strikes,
                COUNT(CASE WHEN pc.result = 'ball' THEN 1 END) AS balls,
                COUNT(CASE WHEN pc.result = 'foul' THEN 1 END) AS fouls,
                COUNT(CASE WHEN pc.result = 'in_play' THEN 1 END) AS in_plays
             FROM pitch_calls pc
             WHERE pc.team_id = $1
               AND pc.result IS NOT NULL`,
            [teamId]
        );

        const row = result.rows[0];
        if (!row || parseInt(row.total_calls) === 0) return null;

        // For accuracy, we need to do the joins
        const linkedResult = await query(
            `SELECT pc.pitch_type AS called_type, pc.zone AS called_zone,
                    p.pitch_type AS actual_type, p.zone AS actual_zone,
                    p.target_zone AS actual_target_zone
             FROM pitch_calls pc
             JOIN pitches p ON pc.pitch_id = p.id
             WHERE pc.team_id = $1
               AND pc.pitch_id IS NOT NULL`,
            [teamId]
        );

        const abbrevToFull: Record<string, string[]> = {
            FB: ['fastball', '4-seam'],
            '2S': ['2-seam', 'sinker'],
            CB: ['curveball'],
            CH: ['changeup'],
            SL: ['slider'],
            CT: ['cutter'],
        };

        let typeMatches = 0;
        let zoneMatches = 0;
        const linked = linkedResult.rows;

        for (const r of linked) {
            const expectedTypes = abbrevToFull[r.called_type] || [];
            if (expectedTypes.includes(r.actual_type)) typeMatches++;
            if (r.called_zone && r.called_zone === (r.actual_zone || r.actual_target_zone)) zoneMatches++;
        }

        const totalLinked = linked.length;

        return {
            team_id: teamId,
            games_with_calls: parseInt(row.games_with_calls),
            total_calls: parseInt(row.total_calls),
            total_linked: totalLinked,
            type_accuracy: totalLinked > 0 ? Math.round((typeMatches / totalLinked) * 1000) / 10 : 0,
            zone_accuracy: totalLinked > 0 ? Math.round((zoneMatches / totalLinked) * 1000) / 10 : 0,
            results: {
                strike: parseInt(row.strikes),
                ball: parseInt(row.balls),
                foul: parseInt(row.fouls),
                in_play: parseInt(row.in_plays),
            },
        };
    }
}

export default new PitchCallAnalyticsService();
