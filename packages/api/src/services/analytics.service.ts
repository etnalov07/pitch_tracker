import { HeatZoneData } from '@pitch-tracker/shared';
import { query } from '../config/database';
import { HEAT_ZONES } from '../utils/heatZones';

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
       JOIN teams at ON g.away_team_id = at.id
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
}

export default new AnalyticsService();
