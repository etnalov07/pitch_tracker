import { query, transaction } from '../config/database';
import { CreateOpposingPitcherParams, OpposingPitcher } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class OpposingPitcherService {
    async getByGame(gameId: string): Promise<OpposingPitcher[]> {
        const result = await query('SELECT * FROM opposing_pitchers WHERE game_id = $1 ORDER BY created_at ASC', [gameId]);
        return result.rows;
    }

    async create(params: CreateOpposingPitcherParams): Promise<OpposingPitcher> {
        const { game_id, team_name, pitcher_name, jersey_number, throws } = params;
        const result = await transaction(async (client) => {
            return client.query(
                `INSERT INTO opposing_pitchers (id, game_id, team_name, pitcher_name, jersey_number, throws)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [uuidv4(), game_id, team_name, pitcher_name, jersey_number ?? null, throws]
            );
        });
        return result.rows[0];
    }

    async delete(id: string): Promise<void> {
        await query('DELETE FROM opposing_pitchers WHERE id = $1', [id]);
    }
}

export default new OpposingPitcherService();
