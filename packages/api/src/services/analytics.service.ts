import { query } from '../config/database';
import type {
    HeatZoneData,
    HitterPitchTypeStat,
    HitterTendenciesLive,
    HitterZoneStat,
    PitchCallZone,
    PitcherPitchTypeStat,
    PitcherTendenciesLive,
    PitcherZoneStat,
    SuggestedPitch,
} from '../types';
import { HEAT_ZONES } from '../utils/heatZones';

// Defined locally to avoid a runtime dependency on @pitch-tracker/shared
const PITCH_CALL_ZONE_LABELS: Record<string, string> = {
    '0-0': 'Up and In',
    '0-1': 'Up the Middle',
    '0-2': 'Up and Away',
    '1-0': 'Middle In',
    '1-1': 'Middle Middle',
    '1-2': 'Middle Away',
    '2-0': 'Down and In',
    '2-1': 'Down the Middle',
    '2-2': 'Down and Away',
    'W-high': 'High at the Shoulders',
    'W-low': 'Low in the Dirt',
    'W-in': 'Tight Inside',
    'W-out': 'Extended Outside',
    'W-high-in': 'High and Tight',
    'W-high-out': 'High and Away',
    'W-low-in': 'Low and Tight',
    'W-low-out': 'Low and Away',
};

export class AnalyticsService {
    // CRITICAL: Batter history for live game strategy
    async getBatterHistory(batterId: string, pitcherId?: string, gameId?: string): Promise<any> {
        let queryText = `
      SELECT 
        ab.*,
        g.game_date,
        g.home_team_id,
        g.away_team_id,
        p.first_name as pitcher_first_name,
        p.last_name as pitcher_last_name
      FROM at_bats ab
      JOIN games g ON ab.game_id = g.id
      JOIN players p ON ab.pitcher_id = p.id
      WHERE ab.batter_id = $1
    `;

        const params: any[] = [batterId];

        if (pitcherId) {
            queryText += ' AND ab.pitcher_id = $2';
            params.push(pitcherId);
        }

        if (gameId) {
            const paramIndex = params.length + 1;
            queryText += ` AND ab.game_id = $${paramIndex}`;
            params.push(gameId);
        }

        queryText += ' ORDER BY ab.created_at DESC LIMIT 10';

        const atBatsResult = await query(queryText, params);
        const atBats = atBatsResult.rows;

        // Get pitches for each at-bat
        for (const atBat of atBats) {
            const pitchesResult = await query('SELECT * FROM pitches WHERE at_bat_id = $1 ORDER BY pitch_number', [atBat.id]);
            atBat.pitches = pitchesResult.rows;

            // Get plays for each at-bat
            const playsResult = await query('SELECT * FROM plays WHERE at_bat_id = $1', [atBat.id]);
            atBat.plays = playsResult.rows;
        }

        // Calculate stats
        const statsResult = await query(
            `SELECT 
        COUNT(ab.id) as total_at_bats,
        COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
        COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
        COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
        SUM(ab.rbi) as total_rbi
      FROM at_bats ab
      WHERE ab.batter_id = $1
      ${pitcherId ? 'AND ab.pitcher_id = $2' : ''}`,
            pitcherId ? [batterId, pitcherId] : [batterId]
        );

        const stats = statsResult.rows[0];
        const battingAverage =
            stats.total_at_bats > 0 ? (parseFloat(stats.hits) / parseFloat(stats.total_at_bats)).toFixed(3) : '0.000';

        return {
            at_bats: atBats,
            stats: {
                ...stats,
                batting_average: battingAverage,
            },
        };
    }

    // Pitch location heat map for a batter
    async getBatterPitchHeatMap(batterId: string, pitcherId?: string): Promise<any[]> {
        let queryText = `
      SELECT 
        location_x,
        location_y,
        zone,
        pitch_type,
        pitch_result,
        velocity,
        COUNT(*) as count
      FROM pitches
      WHERE batter_id = $1
      AND location_x IS NOT NULL
      AND location_y IS NOT NULL
    `;

        const params: any[] = [batterId];

        if (pitcherId) {
            queryText += ' AND pitcher_id = $2';
            params.push(pitcherId);
        }

        queryText += ' GROUP BY location_x, location_y, zone, pitch_type, pitch_result, velocity';

        const result = await query(queryText, params);
        return result.rows;
    }

    // Spray chart for a batter
    async getBatterSprayChart(batterId: string, gameId?: string): Promise<any[]> {
        let queryText = `
      SELECT 
        p.field_location,
        p.contact_quality,
        p.hit_direction,
        p.hit_depth,
        p.hit_result,
        p.contact_type,
        COUNT(*) as count
      FROM plays p
      JOIN at_bats ab ON p.at_bat_id = ab.id
      WHERE ab.batter_id = $1
    `;

        const params: any[] = [batterId];

        if (gameId) {
            queryText += ' AND ab.game_id = $2';
            params.push(gameId);
        }

        queryText += ' GROUP BY p.field_location, p.contact_quality, p.hit_direction, p.hit_depth, p.hit_result, p.contact_type';

        const result = await query(queryText, params);
        return result.rows;
    }

    // Pitch type tendencies for a pitcher
    async getPitcherTendencies(pitcherId: string, gameId?: string): Promise<any> {
        let queryText = `
      SELECT 
        pitch_type,
        pitch_result,
        AVG(velocity) as avg_velocity,
        COUNT(*) as count
      FROM pitches
      WHERE pitcher_id = $1
    `;

        const params: any[] = [pitcherId];

        if (gameId) {
            queryText += ' AND game_id = $2';
            params.push(gameId);
        }

        queryText += ' GROUP BY pitch_type, pitch_result ORDER BY pitch_type, count DESC';

        const result = await query(queryText, params);
        return result.rows;
    }

    // Current game state with all context
    async getGameState(gameId: string): Promise<any> {
        const gameResult = await query(
            `SELECT g.*,
              ht.name as home_team_name,
              at.name as away_team_name
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.id
       LEFT JOIN teams at ON g.away_team_id = at.id
       WHERE g.id = $1`,
            [gameId]
        );

        if (gameResult.rows.length === 0) {
            throw new Error('Game not found');
        }

        const game = gameResult.rows[0];

        // Get current inning
        const inningResult = await query(
            `SELECT * FROM innings 
       WHERE game_id = $1 AND inning_number = $2 AND half = $3`,
            [gameId, game.current_inning, game.inning_half]
        );

        // Get all innings
        const allInningsResult = await query(
            `SELECT * FROM innings 
       WHERE game_id = $1 
       ORDER BY inning_number, CASE WHEN half = 'top' THEN 1 ELSE 2 END`,
            [gameId]
        );

        // Get current at-bat if in progress
        const currentAtBatResult = await query(
            `SELECT ab.*,
              b.first_name as batter_first_name,
              b.last_name as batter_last_name,
              b.jersey_number as batter_jersey,
              p.first_name as pitcher_first_name,
              p.last_name as pitcher_last_name,
              p.jersey_number as pitcher_jersey
       FROM at_bats ab
       JOIN players b ON ab.batter_id = b.id
       JOIN players p ON ab.pitcher_id = p.id
       WHERE ab.game_id = $1 AND ab.ab_end_time IS NULL
       ORDER BY ab.created_at DESC
       LIMIT 1`,
            [gameId]
        );

        return {
            game,
            current_inning: inningResult.rows[0] || null,
            all_innings: allInningsResult.rows,
            current_at_bat: currentAtBatResult.rows[0] || null,
        };
    }

    // Batter vs pitcher matchup stats
    async getMatchupStats(batterId: string, pitcherId: string): Promise<any> {
        const result = await query(
            `SELECT
        COUNT(ab.id) as total_at_bats,
        COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
        COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
        COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
        SUM(ab.rbi) as total_rbi,
        AVG(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1.0 ELSE 0.0 END) as batting_avg
      FROM at_bats ab
      WHERE ab.batter_id = $1 AND ab.pitcher_id = $2`,
            [batterId, pitcherId]
        );

        return result.rows[0];
    }

    // Threshold for target accuracy (within 0.15 units ~ half ball width)
    private readonly TARGET_ACCURACY_THRESHOLD = 0.15;

    // Get pitcher game logs with per-game statistics
    async getPitcherGameLogs(pitcherId: string, limit: number = 10, offset: number = 0): Promise<any> {
        // Get games where this pitcher pitched
        const gamesResult = await query(
            `
      SELECT DISTINCT
        g.id as game_id,
        g.game_date,
        COALESCE(g.opponent_name, at.name) as opponent_name,
        g.location,
        g.status as game_status
      FROM games g
      LEFT JOIN teams at ON g.away_team_id = at.id
      JOIN pitches p ON p.game_id = g.id AND p.pitcher_id = $1
      ORDER BY g.game_date DESC
      LIMIT $2 OFFSET $3
    `,
            [pitcherId, limit, offset]
        );

        const gameLogs = [];

        for (const game of gamesResult.rows) {
            // Get aggregate stats for this game
            const statsResult = await query(
                `
        SELECT
          COUNT(DISTINCT ab.opponent_batter_id) as batters_faced,
          COUNT(*) as total_pitches,
          COUNT(CASE WHEN p.pitch_result = 'ball' THEN 1 END) as balls,
          COUNT(CASE WHEN p.pitch_result != 'ball' THEN 1 END) as strikes,
          COUNT(CASE
            WHEN p.target_location_x IS NOT NULL
            AND p.target_location_y IS NOT NULL
            AND p.location_x IS NOT NULL
            AND p.location_y IS NOT NULL
            AND SQRT(
              POWER(p.location_x - p.target_location_x, 2) +
              POWER(p.location_y - p.target_location_y, 2)
            ) <= $3
            THEN 1
          END) as accurate_pitches,
          COUNT(CASE
            WHEN p.target_location_x IS NOT NULL
            AND p.target_location_y IS NOT NULL
            THEN 1
          END) as targeted_pitches
        FROM pitches p
        LEFT JOIN at_bats ab ON p.at_bat_id = ab.id
        WHERE p.pitcher_id = $1 AND p.game_id = $2
      `,
                [pitcherId, game.game_id, this.TARGET_ACCURACY_THRESHOLD]
            );

            const stats = statsResult.rows[0];
            const totalPitches = parseInt(stats.total_pitches) || 0;
            const strikes = parseInt(stats.strikes) || 0;
            const strike_percentage = totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0;
            const targetedPitches = parseInt(stats.targeted_pitches) || 0;
            const accuratePitches = parseInt(stats.accurate_pitches) || 0;
            const target_accuracy_percentage = targetedPitches > 0 ? Math.round((accuratePitches / targetedPitches) * 100) : null;

            // Get pitch type breakdown for this game
            const pitchTypeResult = await query(
                `
        SELECT
          p.pitch_type,
          COUNT(*) as count,
          COUNT(CASE WHEN p.pitch_result != 'ball' THEN 1 END) as strikes,
          COUNT(CASE WHEN p.pitch_result = 'ball' THEN 1 END) as balls,
          MAX(p.velocity) as top_velocity,
          AVG(p.velocity) as avg_velocity,
          COUNT(CASE
            WHEN p.target_location_x IS NOT NULL
            AND p.target_location_y IS NOT NULL
            AND p.location_x IS NOT NULL
            AND p.location_y IS NOT NULL
            AND SQRT(
              POWER(p.location_x - p.target_location_x, 2) +
              POWER(p.location_y - p.target_location_y, 2)
            ) <= $3
            THEN 1
          END) as accurate_pitches,
          COUNT(CASE
            WHEN p.target_location_x IS NOT NULL
            AND p.target_location_y IS NOT NULL
            THEN 1
          END) as targeted_pitches
        FROM pitches p
        WHERE p.pitcher_id = $1 AND p.game_id = $2
        GROUP BY p.pitch_type
        ORDER BY count DESC
      `,
                [pitcherId, game.game_id, this.TARGET_ACCURACY_THRESHOLD]
            );

            const pitch_type_breakdown = pitchTypeResult.rows.map((row) => {
                const count = parseInt(row.count) || 0;
                const rowStrikes = parseInt(row.strikes) || 0;
                const rowTargeted = parseInt(row.targeted_pitches) || 0;
                const rowAccurate = parseInt(row.accurate_pitches) || 0;

                return {
                    pitch_type: row.pitch_type,
                    count,
                    strikes: rowStrikes,
                    balls: parseInt(row.balls) || 0,
                    strike_percentage: count > 0 ? Math.round((rowStrikes / count) * 100) : 0,
                    target_accuracy_percentage: rowTargeted > 0 ? Math.round((rowAccurate / rowTargeted) * 100) : null,
                    top_velocity: row.top_velocity ? parseFloat(row.top_velocity) : null,
                    avg_velocity: row.avg_velocity ? parseFloat(parseFloat(row.avg_velocity).toFixed(1)) : null,
                };
            });

            gameLogs.push({
                game_id: game.game_id,
                game_date: game.game_date,
                opponent_name: game.opponent_name || 'Unknown',
                location: game.location,
                game_status: game.game_status,
                batters_faced: parseInt(stats.batters_faced) || 0,
                total_pitches: totalPitches,
                balls: parseInt(stats.balls) || 0,
                strikes,
                strike_percentage,
                target_accuracy_percentage,
                pitch_type_breakdown,
            });
        }

        // Get total count for pagination
        const countResult = await query(
            `
      SELECT COUNT(DISTINCT g.id) as total
      FROM games g
      JOIN pitches p ON p.game_id = g.id AND p.pitcher_id = $1
    `,
            [pitcherId]
        );

        return {
            game_logs: gameLogs,
            total_count: parseInt(countResult.rows[0].total) || 0,
        };
    }

    // Get full pitcher profile with career stats and recent game logs
    async getPitcherProfile(pitcherId: string): Promise<any> {
        // Get player info with team
        const playerResult = await query(
            `
      SELECT
        p.id as pitcher_id,
        p.first_name,
        p.last_name,
        p.jersey_number,
        p.throws,
        p.team_id,
        t.name as team_name
      FROM players p
      JOIN teams t ON p.team_id = t.id
      WHERE p.id = $1
    `,
            [pitcherId]
        );

        if (playerResult.rows.length === 0) {
            throw new Error('Pitcher not found');
        }

        const player = playerResult.rows[0];

        // Get pitch types
        const pitchTypesResult = await query(
            `
      SELECT pitch_type FROM pitcher_pitch_types
      WHERE player_id = $1 ORDER BY pitch_type
    `,
            [pitcherId]
        );
        const pitch_types = pitchTypesResult.rows.map((r: any) => r.pitch_type);

        // Get career stats
        const careerResult = await query(
            `
      SELECT
        COUNT(DISTINCT p.game_id) as total_games,
        COUNT(*) as total_pitches,
        COUNT(DISTINCT ab.opponent_batter_id) as total_batters_faced,
        COUNT(CASE WHEN p.pitch_result != 'ball' THEN 1 END) as total_strikes,
        COUNT(CASE
          WHEN p.target_location_x IS NOT NULL
          AND p.target_location_y IS NOT NULL
          AND p.location_x IS NOT NULL
          AND p.location_y IS NOT NULL
          AND SQRT(
            POWER(p.location_x - p.target_location_x, 2) +
            POWER(p.location_y - p.target_location_y, 2)
          ) <= $2
          THEN 1
        END) as accurate_pitches,
        COUNT(CASE
          WHEN p.target_location_x IS NOT NULL
          AND p.target_location_y IS NOT NULL
          THEN 1
        END) as targeted_pitches
      FROM pitches p
      LEFT JOIN at_bats ab ON p.at_bat_id = ab.id
      WHERE p.pitcher_id = $1
    `,
            [pitcherId, this.TARGET_ACCURACY_THRESHOLD]
        );

        const career = careerResult.rows[0];
        const totalPitches = parseInt(career.total_pitches) || 0;
        const totalStrikes = parseInt(career.total_strikes) || 0;
        const targetedPitches = parseInt(career.targeted_pitches) || 0;
        const accuratePitches = parseInt(career.accurate_pitches) || 0;

        const overall_strike_percentage = totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0;
        const overall_target_accuracy = targetedPitches > 0 ? Math.round((accuratePitches / targetedPitches) * 100) : null;

        // Get recent game logs (last 10)
        const gameLogsData = await this.getPitcherGameLogs(pitcherId, 10, 0);

        return {
            ...player,
            pitch_types,
            career_stats: {
                total_games: parseInt(career.total_games) || 0,
                total_pitches: totalPitches,
                total_batters_faced: parseInt(career.total_batters_faced) || 0,
                overall_strike_percentage,
                overall_target_accuracy,
            },
            game_logs: gameLogsData.game_logs,
        };
    }

    // Get pitcher heat zones showing strike percentage by zone
    async getPitcherHeatZones(pitcherId: string, gameId?: string, pitchType?: string): Promise<HeatZoneData[]> {
        // Query all pitches with locations for this pitcher
        let queryText = `
      SELECT
        location_x,
        location_y,
        pitch_result
      FROM pitches
      WHERE pitcher_id = $1
        AND location_x IS NOT NULL
        AND location_y IS NOT NULL
    `;

        const params: string[] = [pitcherId];
        let paramIndex = 2;

        if (gameId) {
            queryText += ` AND game_id = $${paramIndex}`;
            params.push(gameId);
            paramIndex++;
        }

        if (pitchType) {
            queryText += ` AND pitch_type = $${paramIndex}`;
            params.push(pitchType);
        }

        const result = await query(queryText, params);

        // Initialize zone counters
        const zoneCounts: { [zoneId: string]: { total: number; strikes: number } } = {};
        for (const zone of HEAT_ZONES) {
            zoneCounts[zone.id] = { total: 0, strikes: 0 };
        }

        // Classify each pitch into a zone
        for (const pitch of result.rows) {
            const x = parseFloat(pitch.location_x);
            const y = parseFloat(pitch.location_y);

            // Find which zone this pitch falls into
            for (const zone of HEAT_ZONES) {
                if (x >= zone.xMin && x < zone.xMax && y >= zone.yMin && y < zone.yMax) {
                    zoneCounts[zone.id].total++;
                    // Count strikes (anything that's not a ball)
                    if (pitch.pitch_result !== 'ball') {
                        zoneCounts[zone.id].strikes++;
                    }
                    break;
                }
            }
        }

        // Convert to HeatZoneData array
        const heatZones: HeatZoneData[] = HEAT_ZONES.map((zone) => {
            const counts = zoneCounts[zone.id];
            return {
                zone_id: zone.id,
                total_pitches: counts.total,
                strikes: counts.strikes,
                strike_percentage: counts.total > 0 ? Math.round((counts.strikes / counts.total) * 100) : 0,
            };
        });

        return heatZones;
    }

    // Live pitcher tendencies — pitch mix, zone grid, and sequence suggestion vs a given batter handedness
    async getPitcherLiveTendencies(pitcherId: string, batterHand: 'L' | 'R'): Promise<PitcherTendenciesLive> {
        // Fetch pitcher info
        const playerResult = await query(`SELECT first_name, last_name FROM players WHERE id = $1`, [pitcherId]);
        const pitcher = playerResult.rows[0];
        const pitcherName = pitcher ? `${pitcher.first_name} ${pitcher.last_name}` : 'Unknown';

        // Fetch all pitches thrown by this pitcher to batters of the requested handedness
        // Opponent batters have a handedness via opponent_lineup; team batters via players.bats
        const pitchResult = await query(
            `SELECT
                p.pitch_type,
                p.pitch_result,
                p.velocity,
                p.zone
             FROM pitches p
             LEFT JOIN opponent_lineup ol ON p.opponent_batter_id = ol.id
             LEFT JOIN players b ON p.batter_id = b.id
             WHERE p.pitcher_id = $1
               AND (
                 (p.opponent_batter_id IS NOT NULL AND ol.bats = $2)
                 OR
                 (p.batter_id IS NOT NULL AND b.bats = $2)
               )`,
            [pitcherId, batterHand]
        );

        const pitches = pitchResult.rows;
        const total = pitches.length;

        if (total < 10) {
            return {
                pitcher_id: pitcherId,
                pitcher_name: pitcherName,
                batter_hand: batterHand,
                total_pitches: total,
                has_data: false,
                pitch_mix: [],
                zone_grid: [],
                suggested_sequence: [],
            };
        }

        // --- Pitch mix ---
        const typeMap: Record<string, { count: number; strikes: number; swings: number; velocities: number[] }> = {};
        for (const p of pitches) {
            if (!p.pitch_type) continue;
            if (!typeMap[p.pitch_type]) typeMap[p.pitch_type] = { count: 0, strikes: 0, swings: 0, velocities: [] };
            typeMap[p.pitch_type].count++;
            if (p.pitch_result !== 'ball') typeMap[p.pitch_type].strikes++;
            if (p.pitch_result === 'swinging_strike' || p.pitch_result === 'foul' || p.pitch_result === 'in_play') {
                typeMap[p.pitch_type].swings++;
            }
            if (p.velocity) typeMap[p.pitch_type].velocities.push(parseFloat(p.velocity));
        }

        const pitch_mix: PitcherPitchTypeStat[] = Object.entries(typeMap)
            .map(([pitch_type, d]) => ({
                pitch_type,
                count: d.count,
                usage_pct: Math.round((d.count / total) * 100),
                strike_pct: d.count > 0 ? Math.round((d.strikes / d.count) * 100) : 0,
                whiff_pct: d.count > 0 ? Math.round((d.swings / d.count) * 100) : 0,
                avg_velocity:
                    d.velocities.length > 0
                        ? parseFloat((d.velocities.reduce((a, b) => a + b, 0) / d.velocities.length).toFixed(1))
                        : null,
            }))
            .sort((a, b) => b.count - a.count);

        // --- Zone grid (3x3 strike zone only) ---
        const strikeZones = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
        const zoneMap: Record<string, { count: number; strikes: number }> = {};
        for (const z of strikeZones) zoneMap[z] = { count: 0, strikes: 0 };

        for (const p of pitches) {
            if (p.zone && zoneMap[p.zone]) {
                zoneMap[p.zone].count++;
                if (p.pitch_result !== 'ball') zoneMap[p.zone].strikes++;
            }
        }

        const zone_grid: PitcherZoneStat[] = strikeZones.map((zone) => ({
            zone,
            count: zoneMap[zone].count,
            usage_pct: total > 0 ? Math.round((zoneMap[zone].count / total) * 100) : 0,
            strike_pct: zoneMap[zone].count > 0 ? Math.round((zoneMap[zone].strikes / zoneMap[zone].count) * 100) : 0,
        }));

        // --- Suggested sequence (heuristic) ---
        const suggested_sequence = this.buildPitcherSuggestedSequence(pitch_mix);

        return {
            pitcher_id: pitcherId,
            pitcher_name: pitcherName,
            batter_hand: batterHand,
            total_pitches: total,
            has_data: true,
            pitch_mix,
            zone_grid,
            suggested_sequence,
        };
    }

    private buildPitcherSuggestedSequence(pitchMix: PitcherPitchTypeStat[]): SuggestedPitch[] {
        if (pitchMix.length === 0) return [];

        const ZONE_MAP: Record<string, PitchCallZone> = {
            fastball: '0-1',
            '4-seam': '0-1',
            '2-seam': '2-1',
            sinker: '2-1',
            cutter: '1-2',
            slider: '2-2',
            curveball: '2-1',
            changeup: '2-2',
            splitter: '2-2',
            knuckleball: '1-1',
            screwball: '2-0',
            other: '1-1',
        };

        const fastballs = pitchMix.filter((p) => ['fastball', '4-seam', '2-seam', 'sinker'].includes(p.pitch_type));
        const offSpeed = pitchMix.filter((p) => ['changeup', 'splitter'].includes(p.pitch_type));
        const breaking = pitchMix.filter((p) => ['slider', 'curveball', 'cutter'].includes(p.pitch_type));

        const best = (arr: PitcherPitchTypeStat[]) => arr.sort((a, b) => b.strike_pct - a.strike_pct)[0];

        const setupPitch = best(fastballs) || pitchMix[0];
        const chasePitch = best(offSpeed) || best(breaking) || pitchMix[1];
        const putAwayPitch = best(breaking) || best(offSpeed) || pitchMix[pitchMix.length - 1];

        const toSuggested = (stat: PitcherPitchTypeStat, rationale: string): SuggestedPitch => {
            const zone = (ZONE_MAP[stat.pitch_type] as PitchCallZone) || '1-1';
            return {
                pitch_type: stat.pitch_type,
                zone,
                zone_label: PITCH_CALL_ZONE_LABELS[zone],
                rationale,
            };
        };

        const result: SuggestedPitch[] = [];
        if (setupPitch) {
            result.push(toSuggested(setupPitch, `Setup: ${setupPitch.strike_pct}% strike rate vs. this hand`));
        }
        if (chasePitch && chasePitch !== setupPitch) {
            result.push(
                toSuggested(chasePitch, `Chase off ${setupPitch?.pitch_type || 'fastball'}: ${chasePitch.whiff_pct}% whiff`)
            );
        }
        if (putAwayPitch && putAwayPitch !== chasePitch && putAwayPitch !== setupPitch) {
            result.push(toSuggested(putAwayPitch, `Put-away: ${putAwayPitch.whiff_pct}% whiff on 2-strike counts`));
        }
        return result;
    }

    // Live hitter tendencies — zone weakness map, pitch vulnerability, and suggested attack sequence
    async getHitterLiveTendencies(batterId: string, batterType: 'team' | 'opponent'): Promise<HitterTendenciesLive> {
        // Fetch batter name
        let batterName = 'Unknown';
        let batterHand = 'R';

        if (batterType === 'opponent') {
            const scoutResult = await query(`SELECT player_name, bats FROM opponent_lineup WHERE id = $1 LIMIT 1`, [batterId]);
            if (scoutResult.rows[0]) {
                batterName = scoutResult.rows[0].player_name;
                batterHand = scoutResult.rows[0].bats || 'R';
            }
        } else {
            const playerResult = await query(`SELECT first_name, last_name, bats FROM players WHERE id = $1`, [batterId]);
            if (playerResult.rows[0]) {
                const p = playerResult.rows[0];
                batterName = `${p.first_name} ${p.last_name}`;
                batterHand = p.bats || 'R';
            }
        }

        // Fetch all pitches to this batter
        const pitchCol = batterType === 'opponent' ? 'opponent_batter_id' : 'batter_id';
        const pitchResult = await query(`SELECT pitch_type, pitch_result, zone FROM pitches WHERE ${pitchCol} = $1`, [batterId]);

        const pitches = pitchResult.rows;
        const total = pitches.length;

        if (total < 5) {
            // Try to fall back to scouting profile for opponent batters
            if (batterType === 'opponent') {
                return this.buildHitterTendenciesFromScoutingProfile(batterId, batterName, batterHand);
            }
            return {
                batter_id: batterId,
                batter_name: batterName,
                batter_hand: batterHand,
                total_pitches: 0,
                has_data: false,
                zone_weakness_map: [],
                pitch_type_vulnerability: [],
                early_count_swing_rate: null,
                two_strike_chase_rate: null,
                first_pitch_take_rate: null,
                suggested_sequence: [],
            };
        }

        // --- Zone weakness map (3x3 strike zone) ---
        const strikeZones = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
        const zoneMap: Record<string, { total: number; swings: number; contacts: number }> = {};
        for (const z of strikeZones) zoneMap[z] = { total: 0, swings: 0, contacts: 0 };

        const SWING_RESULTS = new Set(['swinging_strike', 'foul', 'in_play']);
        const CONTACT_RESULTS = new Set(['foul', 'in_play']);

        for (const p of pitches) {
            if (p.zone && zoneMap[p.zone]) {
                zoneMap[p.zone].total++;
                if (SWING_RESULTS.has(p.pitch_result)) zoneMap[p.zone].swings++;
                if (CONTACT_RESULTS.has(p.pitch_result)) zoneMap[p.zone].contacts++;
            }
        }

        const zone_weakness_map: HitterZoneStat[] = strikeZones.map((zone) => {
            const d = zoneMap[zone];
            return {
                zone,
                count: d.total,
                swing_rate: d.total > 0 ? Math.round((d.swings / d.total) * 100) / 100 : 0,
                contact_rate: d.swings > 0 ? Math.round((d.contacts / d.swings) * 100) / 100 : 0,
            };
        });

        // --- Pitch type vulnerability ---
        const ptMap: Record<string, { total: number; swings: number; whiffs: number }> = {};
        for (const p of pitches) {
            if (!p.pitch_type) continue;
            if (!ptMap[p.pitch_type]) ptMap[p.pitch_type] = { total: 0, swings: 0, whiffs: 0 };
            ptMap[p.pitch_type].total++;
            if (SWING_RESULTS.has(p.pitch_result)) ptMap[p.pitch_type].swings++;
            if (p.pitch_result === 'swinging_strike') ptMap[p.pitch_type].whiffs++;
        }

        const pitch_type_vulnerability: HitterPitchTypeStat[] = Object.entries(ptMap)
            .map(([pitch_type, d]) => ({
                pitch_type,
                times_seen: d.total,
                swing_pct: d.total > 0 ? Math.round((d.swings / d.total) * 100) : 0,
                whiff_pct: d.swings > 0 ? Math.round((d.whiffs / d.swings) * 100) : 0,
            }))
            .sort((a, b) => b.whiff_pct - a.whiff_pct);

        // --- Suggested attack sequence: target weakest zones ---
        const suggested_sequence = this.buildHitterSuggestedSequence(zone_weakness_map, pitch_type_vulnerability);

        return {
            batter_id: batterId,
            batter_name: batterName,
            batter_hand: batterHand,
            total_pitches: total,
            has_data: true,
            zone_weakness_map,
            pitch_type_vulnerability,
            early_count_swing_rate: null,
            two_strike_chase_rate: null,
            first_pitch_take_rate: null,
            suggested_sequence,
        };
    }

    private async buildHitterTendenciesFromScoutingProfile(
        batterId: string,
        batterName: string,
        batterHand: string
    ): Promise<HitterTendenciesLive> {
        // Look up scouting profile and tendencies for this opponent batter
        const profileResult = await query(
            `SELECT bt.zone_tendencies, bt.total_pitches_seen, bt.first_pitch_take_rate,
                    bt.breaking_chase_rate, bt.chase_rate
             FROM batter_tendencies bt
             JOIN batter_scouting_profiles bsp ON bt.profile_id = bsp.id
             JOIN opponent_lineup_profiles olp ON olp.profile_id = bsp.id
             WHERE olp.opponent_lineup_id = $1
             ORDER BY bt.last_calculated_at DESC NULLS LAST
             LIMIT 1`,
            [batterId]
        );

        if (profileResult.rows.length === 0) {
            return {
                batter_id: batterId,
                batter_name: batterName,
                batter_hand: batterHand,
                total_pitches: 0,
                has_data: false,
                zone_weakness_map: [],
                pitch_type_vulnerability: [],
                early_count_swing_rate: null,
                two_strike_chase_rate: null,
                first_pitch_take_rate: null,
                suggested_sequence: [],
            };
        }

        const t = profileResult.rows[0];
        const zoneTendencies: Record<string, { swing_rate: number; count: number }> = t.zone_tendencies || {};
        const strikeZones = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];

        const zone_weakness_map: HitterZoneStat[] = strikeZones.map((zone) => {
            const zd = zoneTendencies[zone];
            return {
                zone,
                count: zd?.count || 0,
                swing_rate: zd?.swing_rate || 0,
                contact_rate: 0,
            };
        });

        const suggested_sequence = this.buildHitterSuggestedSequence(zone_weakness_map, []);

        return {
            batter_id: batterId,
            batter_name: batterName,
            batter_hand: batterHand,
            total_pitches: parseInt(t.total_pitches_seen) || 0,
            has_data: (parseInt(t.total_pitches_seen) || 0) > 0,
            zone_weakness_map,
            pitch_type_vulnerability: [],
            early_count_swing_rate: null,
            two_strike_chase_rate: t.breaking_chase_rate ? parseFloat(t.breaking_chase_rate) : null,
            first_pitch_take_rate: t.first_pitch_take_rate ? parseFloat(t.first_pitch_take_rate) : null,
            suggested_sequence,
        };
    }

    private buildHitterSuggestedSequence(zoneMap: HitterZoneStat[], pitchVuln: HitterPitchTypeStat[]): SuggestedPitch[] {
        // Find the zones where swing_rate is high but contact_rate is low (prone to whiffs)
        const weakZones = [...zoneMap]
            .filter((z) => z.count >= 2)
            .sort((a, b) => b.swing_rate - a.swing_rate || a.contact_rate - b.contact_rate);

        const bestVuln = pitchVuln[0]; // highest whiff% pitch type
        const sequence: SuggestedPitch[] = [];

        if (weakZones[0]) {
            const zone = weakZones[0].zone as PitchCallZone;
            sequence.push({
                pitch_type: bestVuln?.pitch_type || 'fastball',
                zone,
                zone_label: PITCH_CALL_ZONE_LABELS[zone] || zone,
                rationale: `Attack weak zone: ${Math.round(weakZones[0].swing_rate * 100)}% swing rate, ${Math.round(weakZones[0].contact_rate * 100)}% contact`,
            });
        }

        if (weakZones[1]) {
            const zone = weakZones[1].zone as PitchCallZone;
            sequence.push({
                pitch_type: pitchVuln[1]?.pitch_type || bestVuln?.pitch_type || 'slider',
                zone,
                zone_label: PITCH_CALL_ZONE_LABELS[zone] || zone,
                rationale: `Secondary weak zone: ${Math.round(weakZones[1].swing_rate * 100)}% swing, expand then attack`,
            });
        }

        if (pitchVuln[0] && sequence.length < 3) {
            sequence.push({
                pitch_type: pitchVuln[0].pitch_type,
                zone: '2-2',
                zone_label: PITCH_CALL_ZONE_LABELS['2-2'],
                rationale: `Put-away: ${pitchVuln[0].whiff_pct}% whiff rate on ${pitchVuln[0].pitch_type}`,
            });
        }

        return sequence.slice(0, 3);
    }
}

export default new AnalyticsService();
