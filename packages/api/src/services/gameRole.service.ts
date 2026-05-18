import { query } from '../config/database';
import { GameRole, GameRoleRecord } from '../types';

class GameRoleService {
    async getRole(userId: string, gameId: string): Promise<GameRoleRecord | null> {
        const res = await query('SELECT * FROM game_roles WHERE user_id = $1 AND game_id = $2', [userId, gameId]);
        return res.rows[0] ?? null;
    }

    private async writeRole(userId: string, gameId: string, role: GameRole): Promise<GameRoleRecord> {
        const res = await query(
            `INSERT INTO game_roles (user_id, game_id, role)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, game_id) DO UPDATE SET role = EXCLUDED.role, assigned_at = NOW()
             RETURNING *`,
            [userId, gameId, role]
        );
        return res.rows[0];
    }

    /**
     * Claim a role for a game. Only one charter is allowed per game: if the
     * caller asks for `charter` but another user already holds it, they are
     * assigned `viewer` instead. The returned record reflects the role they
     * actually got. A partial unique index on game_roles guards against the
     * check-then-write race (the 23505 fallback below).
     */
    async claimRole(userId: string, gameId: string, requested: GameRole): Promise<GameRoleRecord> {
        if (requested !== 'charter') {
            return this.writeRole(userId, gameId, requested);
        }

        const existing = await query(`SELECT user_id FROM game_roles WHERE game_id = $1 AND role = 'charter'`, [gameId]);
        const heldByOther = existing.rows[0] && existing.rows[0].user_id !== userId;
        if (heldByOther) {
            return this.writeRole(userId, gameId, 'viewer');
        }

        try {
            return await this.writeRole(userId, gameId, 'charter');
        } catch (err) {
            // 23505 = unique_violation — another user claimed charter in the
            // gap between the check above and this write.
            if ((err as { code?: string }).code === '23505') {
                return this.writeRole(userId, gameId, 'viewer');
            }
            throw err;
        }
    }
}

export default new GameRoleService();
