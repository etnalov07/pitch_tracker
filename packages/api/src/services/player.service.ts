import { query } from '../config/database';
import { Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PlayerService {
    async createPlayer(playerData: Partial<Player>): Promise<Player> {
        const { team_id, first_name, last_name, jersey_number, primary_position, bats, throws } = playerData;

        if (!team_id || !first_name || !last_name || !primary_position) {
            throw new Error('team_id, first_name, last_name, and primary_position are required');
        }

        const player_id = uuidv4();
        const result = await query(
            `INSERT INTO players (id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [player_id, team_id, first_name, last_name, jersey_number, primary_position, bats, throws]
        );

        return result.rows[0];
    }

    async getPlayerById(player_id: string): Promise<Player | null> {
        const result = await query('SELECT * FROM players WHERE id = $1', [player_id]);
        return result.rows[0] || null;
    }

    async getPlayersByTeam(team_id: string): Promise<Player[]> {
        const result = await query(
            `SELECT * FROM players 
       WHERE team_id = $1 AND is_active = true 
       ORDER BY jersey_number, last_name`,
            [team_id]
        );
        return result.rows;
    }

    async updatePlayer(player_id: string, updates: Partial<Player>): Promise<Player> {
        const player = await this.getPlayerById(player_id);
        if (!player) {
            throw new Error('Player not found');
        }

        const { first_name, last_name, jersey_number, primary_position, bats, throws, is_active } = updates;

        const result = await query(
            `UPDATE players 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           jersey_number = COALESCE($3, jersey_number),
           primary_position = COALESCE($4, primary_position),
           bats = COALESCE($5, bats),
           throws = COALESCE($6, throws),
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
            [first_name, last_name, jersey_number, primary_position, bats, throws, is_active, player_id]
        );

        return result.rows[0];
    }

    async deletePlayer(player_id: string): Promise<void> {
        // Soft delete by setting is_active to false
        await query('UPDATE players SET is_active = false WHERE id = $1', [player_id]);
    }

    async getPlayerStats(player_id: string): Promise<any> {
        const statsResult = await query(
            `SELECT
         COUNT(ab.id) as total_at_bats,
         COUNT(CASE WHEN ab.result IN ('single', 'double', 'triple', 'home_run') THEN 1 END) as hits,
         COUNT(CASE WHEN ab.result = 'strikeout' THEN 1 END) as strikeouts,
         COUNT(CASE WHEN ab.result = 'walk' THEN 1 END) as walks,
         SUM(ab.rbi) as total_rbi,
         SUM(ab.runs_scored) as total_runs
       FROM at_bats ab
       WHERE ab.batter_id = $1`,
            [player_id]
        );

        const stats = statsResult.rows[0];
        const battingAverage = stats.total_at_bats > 0 ? (stats.hits / stats.total_at_bats).toFixed(3) : '0.000';

        return {
            ...stats,
            batting_average: battingAverage,
        };
    }

    // Get only pitchers from a team
    async getPitchersByTeam(team_id: string): Promise<Player[]> {
        const result = await query(
            `SELECT * FROM players
       WHERE team_id = $1 AND is_active = true AND primary_position = 'P'
       ORDER BY jersey_number, last_name`,
            [team_id]
        );
        return result.rows;
    }

    // Pitcher pitch types management
    async getPitcherPitchTypes(player_id: string): Promise<string[]> {
        const result = await query(`SELECT pitch_type FROM pitcher_pitch_types WHERE player_id = $1 ORDER BY pitch_type`, [
            player_id,
        ]);
        return result.rows.map((row: { pitch_type: string }) => row.pitch_type);
    }

    async setPitcherPitchTypes(player_id: string, pitch_types: string[]): Promise<string[]> {
        // Delete existing pitch types
        await query('DELETE FROM pitcher_pitch_types WHERE player_id = $1', [player_id]);

        // Insert new pitch types
        for (const pitch_type of pitch_types) {
            const id = uuidv4();
            await query('INSERT INTO pitcher_pitch_types (id, player_id, pitch_type) VALUES ($1, $2, $3)', [
                id,
                player_id,
                pitch_type,
            ]);
        }

        return pitch_types;
    }

    async getPlayerWithPitchTypes(player_id: string): Promise<any> {
        const player = await this.getPlayerById(player_id);
        if (!player) return null;

        const pitch_types = await this.getPitcherPitchTypes(player_id);
        return { ...player, pitch_types };
    }

    async getPitchersWithPitchTypes(team_id: string): Promise<any[]> {
        const pitchers = await this.getPitchersByTeam(team_id);
        const results = [];

        for (const pitcher of pitchers) {
            const pitch_types = await this.getPitcherPitchTypes(pitcher.id);
            results.push({ ...pitcher, pitch_types });
        }

        return results;
    }

    // Get pitcher stats for current game (live tally)
    async getPitcherGameStats(pitcher_id: string, game_id: string): Promise<any> {
        // Get pitch counts by type and result
        const countResult = await query(
            `SELECT
         pitch_type,
         pitch_result,
         COUNT(*) as count
       FROM pitches
       WHERE pitcher_id = $1 AND game_id = $2
       GROUP BY pitch_type, pitch_result`,
            [pitcher_id, game_id]
        );

        // Get velocity stats by pitch type
        const velocityResult = await query(
            `SELECT
         pitch_type,
         MAX(velocity) as top_velocity,
         AVG(velocity) as avg_velocity
       FROM pitches
       WHERE pitcher_id = $1 AND game_id = $2 AND velocity IS NOT NULL
       GROUP BY pitch_type`,
            [pitcher_id, game_id]
        );

        const stats = {
            pitcher_id,
            game_id,
            total_pitches: 0,
            strikes: 0,
            balls: 0,
            pitch_type_breakdown: {} as {
                [key: string]: {
                    total: number;
                    strikes: number;
                    balls: number;
                    top_velocity: number | null;
                    avg_velocity: number | null;
                };
            },
        };

        // Process count results
        for (const row of countResult.rows) {
            const { pitch_type, pitch_result, count } = row;
            const pitchCount = parseInt(count);

            // Initialize pitch type if not exists
            if (!stats.pitch_type_breakdown[pitch_type]) {
                stats.pitch_type_breakdown[pitch_type] = { total: 0, strikes: 0, balls: 0, top_velocity: null, avg_velocity: null };
            }

            stats.total_pitches += pitchCount;
            stats.pitch_type_breakdown[pitch_type].total += pitchCount;

            // Count as strike if not a ball (in_play, called_strike, swinging_strike, foul all count as strikes)
            if (pitch_result === 'ball') {
                stats.balls += pitchCount;
                stats.pitch_type_breakdown[pitch_type].balls += pitchCount;
            } else {
                stats.strikes += pitchCount;
                stats.pitch_type_breakdown[pitch_type].strikes += pitchCount;
            }
        }

        // Add velocity stats to pitch type breakdown
        for (const row of velocityResult.rows) {
            const { pitch_type, top_velocity, avg_velocity } = row;
            if (stats.pitch_type_breakdown[pitch_type]) {
                stats.pitch_type_breakdown[pitch_type].top_velocity = top_velocity ? parseFloat(top_velocity) : null;
                stats.pitch_type_breakdown[pitch_type].avg_velocity = avg_velocity
                    ? parseFloat(parseFloat(avg_velocity).toFixed(1))
                    : null;
            }
        }

        return stats;
    }
}

export default new PlayerService();
