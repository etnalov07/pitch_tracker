import { query, transaction } from '../config/database';
import { CreateOpposingPitcherParams, OpposingPitcher } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class OpposingPitcherService {
    async getByGame(gameId: string, teamSide?: 'home' | 'away'): Promise<OpposingPitcher[]> {
        if (teamSide) {
            const result = await query(
                'SELECT * FROM opposing_pitchers WHERE game_id = $1 AND team_side = $2 ORDER BY created_at ASC',
                [gameId, teamSide]
            );
            return result.rows;
        }
        const result = await query('SELECT * FROM opposing_pitchers WHERE game_id = $1 ORDER BY created_at ASC', [gameId]);
        return result.rows;
    }

    async create(params: CreateOpposingPitcherParams): Promise<OpposingPitcher> {
        const { game_id, team_name, pitcher_name, jersey_number, throws, team_side } = params;
        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opposing_pitchers (id, game_id, team_name, pitcher_name, jersey_number, throws, team_side)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [uuidv4(), game_id, team_name, pitcher_name, jersey_number ?? null, throws, team_side ?? null]
            );
        });
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        await query('DELETE FROM opposing_pitchers WHERE id = $1', [id]);
    }
}

export default new OpposingPitcherService();
