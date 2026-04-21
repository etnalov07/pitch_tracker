import { query } from '../config/database';
import { GameRole, GameRoleRecord } from '../types';

class GameRoleService {
    async getRole(userId: string, gameId: string): Promise<GameRoleRecord | null> {
        const res = await query('SELECT * FROM game_roles WHERE user_id = $1 AND game_id = $2', [userId, gameId]);
        return res.rows[0] ?? null;
    }

    async upsertRole(userId: string, gameId: string, role: GameRole): Promise<GameRoleRecord> {
        const res = await query(
            `INSERT INTO game_roles (user_id, game_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role, assigned_at = NOW()
             RETURNING *`,
            [userId, gameId, role]
        );
        return res.rows[0];
    }
}

export default new GameRoleService();
