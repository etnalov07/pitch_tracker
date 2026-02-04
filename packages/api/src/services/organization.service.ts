import { query, transaction } from '../config/database';
import { Organization, OrganizationMember, OrganizationWithTeams, OrgRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
}

export class OrganizationService {
    async createOrganization(
        userId: string,
        data: { name: string; slug?: string; description?: string }
    ): Promise<Organization> {
        const { name, description } = data;
        if (!name?.trim()) {
            throw new Error('Organization name is required');
        }

        let slug = data.slug || slugify(name);

        // Ensure slug is unique
        const existing = await query('SELECT id FROM organizations WHERE slug = $1', [slug]);
        if (existing.rows.length > 0) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }

        return await transaction(async (client) => {
            const orgId = uuidv4();
            const orgResult = await client.query(
                `INSERT INTO organizations (id, name, slug, description, created_by)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [orgId, name.trim(), slug, description?.trim() || null, userId]
            );

            // Creator becomes owner
            await client.query(
                `INSERT INTO organization_members (id, organization_id, user_id, role)
                 VALUES ($1, $2, $3, 'owner')`,
                [uuidv4(), orgId, userId]
            );

            return orgResult.rows[0];
        });
    }

    async getOrganizationsByUser(userId: string): Promise<Organization[]> {
        const result = await query(
            `SELECT o.*, om.role as user_role
             FROM organizations o
             JOIN organization_members om ON om.organization_id = o.id
             WHERE om.user_id = $1
             ORDER BY o.name`,
            [userId]
        );
        return result.rows;
    }

    async getOrganizationById(orgId: string): Promise<Organization | null> {
        const result = await query('SELECT * FROM organizations WHERE id = $1', [orgId]);
        return result.rows[0] || null;
    }

    async getOrganizationWithTeams(orgId: string): Promise<OrganizationWithTeams | null> {
        const orgResult = await query('SELECT * FROM organizations WHERE id = $1', [orgId]);
        if (orgResult.rows.length === 0) return null;

        const [teamsResult, memberCountResult] = await Promise.all([
            query('SELECT * FROM teams WHERE organization_id = $1 ORDER BY name', [orgId]),
            query('SELECT COUNT(*) FROM organization_members WHERE organization_id = $1', [orgId]),
        ]);

        return {
            ...orgResult.rows[0],
            teams: teamsResult.rows,
            member_count: parseInt(memberCountResult.rows[0].count, 10),
        };
    }

    async updateOrganization(
        orgId: string,
        updates: { name?: string; description?: string; slug?: string }
    ): Promise<Organization> {
        const { name, description, slug } = updates;

        const result = await query(
            `UPDATE organizations
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 slug = COALESCE($3, slug)
             WHERE id = $4
             RETURNING *`,
            [name?.trim(), description?.trim(), slug, orgId]
        );

        if (result.rows.length === 0) {
            throw new Error('Organization not found');
        }

        return result.rows[0];
    }

    async deleteOrganization(orgId: string): Promise<void> {
        // Unlink teams from org (don't delete them)
        await query('UPDATE teams SET organization_id = NULL WHERE organization_id = $1', [orgId]);
        await query('DELETE FROM organizations WHERE id = $1', [orgId]);
    }

    async getTeamsByOrganization(orgId: string): Promise<any[]> {
        const result = await query(
            `SELECT t.*,
                    (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.is_active = true) as player_count
             FROM teams t
             WHERE t.organization_id = $1
             ORDER BY t.name`,
            [orgId]
        );
        return result.rows;
    }

    async getMembers(orgId: string): Promise<OrganizationMember[]> {
        const result = await query(
            `SELECT om.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
             FROM organization_members om
             JOIN users u ON u.id = om.user_id
             WHERE om.organization_id = $1
             ORDER BY om.role, u.last_name`,
            [orgId]
        );
        return result.rows;
    }

    async addMember(orgId: string, userId: string, role: OrgRole = 'coach'): Promise<OrganizationMember> {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO organization_members (id, organization_id, user_id, role)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, orgId, userId, role]
        );
        return result.rows[0];
    }

    async addMemberByEmail(orgId: string, email: string, role: OrgRole = 'coach'): Promise<OrganizationMember> {
        const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            throw new Error('No user found with that email');
        }
        return this.addMember(orgId, userResult.rows[0].id, role);
    }

    async removeMember(memberId: string): Promise<void> {
        // Prevent removing the last owner
        const memberResult = await query('SELECT * FROM organization_members WHERE id = $1', [memberId]);
        if (memberResult.rows.length === 0) {
            throw new Error('Member not found');
        }

        const member = memberResult.rows[0];
        if (member.role === 'owner') {
            const ownerCount = await query(
                `SELECT COUNT(*) FROM organization_members
                 WHERE organization_id = $1 AND role = 'owner'`,
                [member.organization_id]
            );
            if (parseInt(ownerCount.rows[0].count, 10) <= 1) {
                throw new Error('Cannot remove the last owner');
            }
        }

        await query('DELETE FROM organization_members WHERE id = $1', [memberId]);
    }

    async addTeamToOrganization(orgId: string, teamId: string): Promise<void> {
        await query('UPDATE teams SET organization_id = $1 WHERE id = $2', [orgId, teamId]);
    }

    async removeTeamFromOrganization(teamId: string): Promise<void> {
        await query('UPDATE teams SET organization_id = NULL WHERE id = $1', [teamId]);
    }
}

export default new OrganizationService();
