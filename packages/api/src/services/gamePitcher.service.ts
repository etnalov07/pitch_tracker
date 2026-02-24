import { query } from '../config/database';
import { GamePitcher, GamePitcherWithPlayer } from '@pitch-tracker/shared';
import { v4 as uuidv4 } from 'uuid';

export class GamePitcherService {
    async addPitcher(gameId: string, playerId: string, pitchingOrder: number, inningEntered: number = 1): Promise<GamePitcher> {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO game_pitchers (id, game_id, player_id, pitching_order, inning_entered)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, gameId, playerId, pitchingOrder, inningEntered]
        );

        return result.rows[0];
    }

    async getPitchersByGameId(gameId: string): Promise<GamePitcherWithPlayer[]> {
        const result = await query(
            `SELECT gp.*,
                    p.first_name, p.last_name, p.jersey_number, p.throws
             FROM game_pitchers gp
             JOIN players p ON gp.player_id = p.id
             WHERE gp.game_id = $1
             ORDER BY gp.pitching_order`,
            [gameId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            game_id: row.game_id,
            player_id: row.player_id,
            pitching_order: row.pitching_order,
            inning_entered: row.inning_entered,
            inning_exited: row.inning_exited,
            created_at: row.created_at,
            player: {
                id: row.player_id,
                team_id: '',
                first_name: row.first_name,
                last_name: row.last_name,
                jersey_number: row.jersey_number,
                primary_position: 'P',
                bats: 'R',
                throws: row.throws,
                created_at: '',
            },
        }));
    }

    async getCurrentPitcher(gameId: string): Promise<GamePitcherWithPlayer | null> {
        const result = await query(
            `SELECT gp.*,
                    p.first_name, p.last_name, p.jersey_number, p.throws
             FROM game_pitchers gp
             JOIN players p ON gp.player_id = p.id
             WHERE gp.game_id = $1 AND gp.inning_exited IS NULL
             ORDER BY gp.pitching_order DESC
             LIMIT 1`,
            [gameId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            game_id: row.game_id,
            player_id: row.player_id,
            pitching_order: row.pitching_order,
            inning_entered: row.inning_entered,
            inning_exited: row.inning_exited,
            created_at: row.created_at,
            player: {
                id: row.player_id,
                team_id: '',
                first_name: row.first_name,
                last_name: row.last_name,
                jersey_number: row.jersey_number,
                primary_position: 'P',
                bats: 'R',
                throws: row.throws,
                created_at: '',
            },
        };
    }

    async changePitcher(gameId: string, newPlayerId: string, inningEntered: number): Promise<GamePitcher> {
        const currentPitcher = await this.getCurrentPitcher(gameId);

        if (currentPitcher) {
            await query(`UPDATE game_pitchers SET inning_exited = $1 WHERE id = $2`, [inningEntered, currentPitcher.id]);
        }

        const nextOrder = currentPitcher ? currentPitcher.pitching_order + 1 : 1;
        return this.addPitcher(gameId, newPlayerId, nextOrder, inningEntered);
    }

    async updatePitcherExit(pitcherId: string, inningExited: number): Promise<GamePitcher> {
        const result = await query(`UPDATE game_pitchers SET inning_exited = $1 WHERE id = $2 RETURNING *`, [
            inningExited,
            pitcherId,
        ]);

        if (result.rows.length === 0) {
            throw new Error('Pitcher not found');
        }

        return result.rows[0];
    }

    async deletePitcher(pitcherId: string): Promise<void> {
        await query(`DELETE FROM game_pitchers WHERE id = $1`, [pitcherId]);
    }

    async clearPitchers(gameId: string): Promise<void> {
        await query(`DELETE FROM game_pitchers WHERE game_id = $1`, [gameId]);
    }
}

export default new GamePitcherService();
