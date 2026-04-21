import { query, transaction } from '../config/database';
import { MyTeamLineupPlayer, CreateMyTeamLineupPlayerParams } from '../types';

class MyTeamLineupService {
    async getByGame(gameId: string): Promise<MyTeamLineupPlayer[]> {
        const res = await query(
            `SELECT m.*, row_to_json(p.*) AS player
             FROM my_team_lineup m
             JOIN players p ON p.id = m.player_id
             WHERE m.game_id = $1
             ORDER BY m.batting_order, m.is_starter DESC, m.created_at`,
            [gameId]
        );
        return res.rows;
    }

    async bulkCreate(gameId: string, players: CreateMyTeamLineupPlayerParams[]): Promise<MyTeamLineupPlayer[]> {
        return transaction(async (client) => {
            await client.query('DELETE FROM my_team_lineup WHERE game_id = $1 AND is_starter = true', [gameId]);
            const results: MyTeamLineupPlayer[] = [];
            for (const p of players) {
                const res = await client.query(
                    `INSERT INTO my_team_lineup (game_id, player_id, batting_order, position, is_starter)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING *`,
                    [gameId, p.player_id, p.batting_order, p.position ?? null, p.is_starter]
                );
                results.push(res.rows[0]);
            }
            return results;
        });
    }

    async update(id: string, data: Partial<CreateMyTeamLineupPlayerParams>): Promise<MyTeamLineupPlayer | null> {
        const fields: string[] = [];
        const values: unknown[] = [];
        let idx = 1;
        if (data.batting_order !== undefined) {
            fields.push(`batting_order = $${idx++}`);
            values.push(data.batting_order);
        }
        if (data.position !== undefined) {
            fields.push(`position = $${idx++}`);
            values.push(data.position);
        }
        if (!fields.length) return null;
        values.push(id);
        const res = await query(`UPDATE my_team_lineup SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        return res.rows[0] ?? null;
    }
}

export default new MyTeamLineupService();
