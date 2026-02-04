import { query } from '../config/database';
import { TeamMember, TeamRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TeamMemberService {
    async getMembers(teamId: string): Promise<TeamMember[]> {
        const result = await query(
            `SELECT tm.*, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             WHERE tm.team_id = $1
             ORDER BY tm.role, u.last_name`,
            [teamId]
        );
        return result.rows;
    }

    async addMember(
        teamId: string,
        userId: string,
        role: TeamRole = 'player',
        playerId?: string
    ): Promise<TeamMember> {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO team_members (id, team_id, user_id, role, player_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, teamId, userId, role, playerId || null]
        );
        return result.rows[0];
    }

    async updateMemberRole(memberId: string, role: TeamRole): Promise<TeamMember> {
        const result = await query(
            `UPDATE team_members SET role = $1 WHERE id = $2 RETURNING *`,
            [role, memberId]
        );
        if (result.rows.length === 0) {
            throw new Error('Member not found');
        }
        return result.rows[0];
    }

    async removeMember(memberId: string): Promise<void> {
        const memberResult = await query('SELECT * FROM team_members WHERE id = $1', [memberId]);
        if (memberResult.rows.length === 0) {
            throw new Error('Member not found');
        }

        const member = memberResult.rows[0];
        if (member.role === 'owner') {
            const ownerCount = await query(
                `SELECT COUNT(*) FROM team_members WHERE team_id = $1 AND role = 'owner'`,
                [member.team_id]
            );
            if (parseInt(ownerCount.rows[0].count, 10) <= 1) {
                throw new Error('Cannot remove the last owner');
            }
        }

        await query('DELETE FROM team_members WHERE id = $1', [memberId]);
    }

    async linkPlayerToMember(memberId: string, playerId: string): Promise<TeamMember> {
        const result = await query(
            `UPDATE team_members SET player_id = $1 WHERE id = $2 RETURNING *`,
            [playerId, memberId]
        );
        if (result.rows.length === 0) {
            throw new Error('Member not found');
        }

        // Also link the player record to the user
        const member = result.rows[0];
        await query('UPDATE players SET user_id = $1 WHERE id = $2', [member.user_id, playerId]);

        return member;
    }

    async getMemberByUserAndTeam(userId: string, teamId: string): Promise<TeamMember | null> {
        const result = await query(
            'SELECT * FROM team_members WHERE user_id = $1 AND team_id = $2',
            [userId, teamId]
        );
        return result.rows[0] || null;
    }

    async getTeamsByUser(userId: string): Promise<any[]> {
        const result = await query(
            `SELECT t.*, tm.role as user_role
             FROM teams t
             JOIN team_members tm ON tm.team_id = t.id
             WHERE tm.user_id = $1
             ORDER BY t.name`,
            [userId]
        );
        return result.rows;
    }
}

export default new TeamMemberService();
