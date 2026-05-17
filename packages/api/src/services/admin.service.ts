import { query } from '../config/database';
import authService from './auth.service';
import type {
    AdminUserListItem,
    AdminUserDetail,
    AdminOrgListItem,
    AdminTeamListItem,
    AdminGameListItem,
    AdminAuditEntry,
    AdminListResponse,
} from '../types';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

interface PaginationParams {
    page?: number;
    page_size?: number;
}

const normalize = ({ page, page_size }: PaginationParams): { offset: number; limit: number; page: number } => {
    const p = Math.max(1, Math.floor(page ?? 1));
    const ps = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(page_size ?? DEFAULT_PAGE_SIZE)));
    return { offset: (p - 1) * ps, limit: ps, page: p };
};

export class AdminService {
    async listUsers(params: PaginationParams & { search?: string }): Promise<AdminListResponse<AdminUserListItem>> {
        const { offset, limit, page } = normalize(params);
        const search = (params.search || '').trim();
        const whereClauses: string[] = [];
        const queryParams: unknown[] = [];
        if (search) {
            queryParams.push(`%${search.toLowerCase()}%`);
            const idx = queryParams.length;
            whereClauses.push(
                `(LOWER(u.email) LIKE $${idx} OR LOWER(u.first_name) LIKE $${idx} OR LOWER(u.last_name) LIKE $${idx})`
            );
        }
        const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countResult = await query(`SELECT COUNT(*)::text AS count FROM users u ${where}`, queryParams);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

        queryParams.push(limit, offset);
        const rows = await query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.email_verified, u.created_at,
                    COALESCE(tm.team_count, 0)::int AS team_count,
                    COALESCE(om.org_count, 0)::int AS org_count
             FROM users u
             LEFT JOIN (SELECT user_id, COUNT(*) AS team_count FROM team_members GROUP BY user_id) tm ON tm.user_id = u.id
             LEFT JOIN (SELECT user_id, COUNT(*) AS org_count FROM organization_members GROUP BY user_id) om ON om.user_id = u.id
             ${where}
             ORDER BY u.created_at DESC
             LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
            queryParams
        );

        return { items: rows.rows as AdminUserListItem[], total, page, page_size: limit };
    }

    async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
        const base = await authService.getUserById(userId);
        if (!base) return null;

        const verifyRow = await query(`SELECT email_verified, email_verified_at FROM users WHERE id = $1`, [userId]);

        const games = await query(
            `SELECT g.id, g.game_date, g.opponent_name, t.name AS home_team_name
             FROM games g
             LEFT JOIN teams t ON t.id = g.home_team_id
             WHERE g.created_by = $1
             ORDER BY g.game_date DESC
             LIMIT 25`,
            [userId]
        );

        return {
            ...(base as unknown as AdminUserDetail),
            email_verified: verifyRow.rows[0]?.email_verified ?? false,
            email_verified_at: verifyRow.rows[0]?.email_verified_at ?? null,
            recent_games: games.rows,
        };
    }

    async listOrgs(params: PaginationParams): Promise<AdminListResponse<AdminOrgListItem>> {
        const { offset, limit, page } = normalize(params);
        const countResult = await query(`SELECT COUNT(*)::text AS count FROM organizations`);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

        const rows = await query(
            `SELECT o.id, o.name, o.slug, o.created_at,
                    COALESCE(m.member_count, 0)::int AS member_count,
                    COALESCE(t.team_count, 0)::int AS team_count
             FROM organizations o
             LEFT JOIN (
                 SELECT organization_id, COUNT(*) AS member_count
                 FROM organization_members GROUP BY organization_id
             ) m ON m.organization_id = o.id
             LEFT JOIN (
                 SELECT organization_id, COUNT(*) AS team_count
                 FROM teams WHERE organization_id IS NOT NULL GROUP BY organization_id
             ) t ON t.organization_id = o.id
             ORDER BY o.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return { items: rows.rows as AdminOrgListItem[], total, page, page_size: limit };
    }

    async listTeams(params: PaginationParams & { organization_id?: string }): Promise<AdminListResponse<AdminTeamListItem>> {
        const { offset, limit, page } = normalize(params);
        const queryParams: unknown[] = [];
        const whereClauses: string[] = [];
        if (params.organization_id) {
            queryParams.push(params.organization_id);
            whereClauses.push(`t.organization_id = $${queryParams.length}`);
        }
        const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countResult = await query(`SELECT COUNT(*)::text AS count FROM teams t ${where}`, queryParams);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

        queryParams.push(limit, offset);
        const rows = await query(
            `SELECT t.id, t.name, t.organization_id, t.owner_id, t.created_at,
                    o.name AS organization_name,
                    u.email AS owner_email
             FROM teams t
             LEFT JOIN organizations o ON o.id = t.organization_id
             LEFT JOIN users u ON u.id = t.owner_id
             ${where}
             ORDER BY t.created_at DESC
             LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
            queryParams
        );

        return { items: rows.rows as AdminTeamListItem[], total, page, page_size: limit };
    }

    async listGames(
        params: PaginationParams & { team_id?: string; date_from?: string; date_to?: string }
    ): Promise<AdminListResponse<AdminGameListItem>> {
        const { offset, limit, page } = normalize(params);
        const queryParams: unknown[] = [];
        const whereClauses: string[] = [];
        if (params.team_id) {
            queryParams.push(params.team_id);
            whereClauses.push(`g.home_team_id = $${queryParams.length}`);
        }
        if (params.date_from) {
            queryParams.push(params.date_from);
            whereClauses.push(`g.game_date >= $${queryParams.length}`);
        }
        if (params.date_to) {
            queryParams.push(params.date_to);
            whereClauses.push(`g.game_date <= $${queryParams.length}`);
        }
        const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countResult = await query(`SELECT COUNT(*)::text AS count FROM games g ${where}`, queryParams);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

        queryParams.push(limit, offset);
        const rows = await query(
            `SELECT g.id, g.game_date, g.home_team_id, g.opponent_name, g.status,
                    g.home_score, g.away_score, g.created_by, g.created_at,
                    t.name AS home_team_name
             FROM games g
             LEFT JOIN teams t ON t.id = g.home_team_id
             ${where}
             ORDER BY g.game_date DESC, g.created_at DESC
             LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
            queryParams
        );

        return { items: rows.rows as AdminGameListItem[], total, page, page_size: limit };
    }

    async listAudit(params: PaginationParams): Promise<AdminListResponse<AdminAuditEntry>> {
        const { offset, limit, page } = normalize(params);
        const countResult = await query(`SELECT COUNT(*)::text AS count FROM admin_audit`);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

        const rows = await query(
            `SELECT a.id, a.actor_user_id, a.actor_role, a.organization_id,
                    a.action, a.target_table, a.target_id, a.payload, a.created_at,
                    u.email AS actor_email
             FROM admin_audit a
             LEFT JOIN users u ON u.id = a.actor_user_id
             ORDER BY a.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        return { items: rows.rows as AdminAuditEntry[], total, page, page_size: limit };
    }

    async forceVerifyEmail(userId: string): Promise<boolean> {
        const result = await query(
            `UPDATE users SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW()
             WHERE id = $1 RETURNING id`,
            [userId]
        );
        return result.rows.length > 0;
    }

    async setRegistrationType(userId: string, registrationType: 'coach' | 'player' | 'org_admin' | null): Promise<boolean> {
        const result = await query(
            `UPDATE users SET registration_type = $2, updated_at = NOW()
             WHERE id = $1 RETURNING id`,
            [userId, registrationType]
        );
        return result.rows.length > 0;
    }

    async resendVerification(userId: string): Promise<{ sent: boolean; reason?: string }> {
        const userRow = await query(`SELECT id, email, first_name, email_verified FROM users WHERE id = $1`, [userId]);
        if (userRow.rows.length === 0) return { sent: false, reason: 'User not found' };
        const u = userRow.rows[0];
        if (u.email_verified) return { sent: false, reason: 'Email already verified' };
        await authService.issueAndSendVerification(u.id, u.email, u.first_name);
        return { sent: true };
    }
}

export default new AdminService();
