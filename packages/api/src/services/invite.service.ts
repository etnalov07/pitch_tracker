import crypto from 'crypto';
import { query, transaction } from '../config/database';
import { Invite, TeamRole } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';

export class InviteService {
    async createInvite(
        invitedBy: string,
        data: {
            team_id: string;
            player_id?: string;
            role?: TeamRole;
            invited_email?: string;
            expires_in_days?: number;
        }
    ): Promise<Invite> {
        const { team_id, player_id, role = 'player', invited_email } = data;
        const expiresInDays = data.expires_in_days || config.invite.defaultExpiryDays;

        // Verify team exists
        const teamResult = await query('SELECT id, name FROM teams WHERE id = $1', [team_id]);
        if (teamResult.rows.length === 0) {
            throw new Error('Team not found');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + expiresInDays * 86400000);

        const id = uuidv4();
        const result = await query(
            `INSERT INTO invites (id, token, team_id, player_id, invited_by, invited_email, role, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
             RETURNING *`,
            [id, token, team_id, player_id || null, invitedBy, invited_email || null, role, expiresAt]
        );

        const invite = result.rows[0];
        invite.team_name = teamResult.rows[0].name;
        invite.invite_url = `${config.invite.baseUrl}/invite/${token}`;

        return invite;
    }

    async getInvitesByTeam(teamId: string): Promise<Invite[]> {
        const result = await query(
            `SELECT i.*,
                    t.name as team_name,
                    u.first_name || ' ' || u.last_name as inviter_name,
                    p.first_name || ' ' || p.last_name as player_name
             FROM invites i
             JOIN teams t ON t.id = i.team_id
             JOIN users u ON u.id = i.invited_by
             LEFT JOIN players p ON p.id = i.player_id
             WHERE i.team_id = $1
             ORDER BY i.created_at DESC`,
            [teamId]
        );
        return result.rows;
    }

    async getInviteByToken(token: string): Promise<Invite | null> {
        const result = await query(
            `SELECT i.*,
                    t.name as team_name,
                    u.first_name || ' ' || u.last_name as inviter_name,
                    p.first_name || ' ' || p.last_name as player_name
             FROM invites i
             JOIN teams t ON t.id = i.team_id
             JOIN users u ON u.id = i.invited_by
             LEFT JOIN players p ON p.id = i.player_id
             WHERE i.token = $1`,
            [token]
        );

        if (result.rows.length === 0) return null;

        const invite = result.rows[0];

        // Auto-expire if past expiry
        if (invite.status === 'pending' && new Date(invite.expires_at) < new Date()) {
            await query(`UPDATE invites SET status = 'expired' WHERE id = $1`, [invite.id]);
            invite.status = 'expired';
        }

        return invite;
    }

    async acceptInvite(token: string, userId: string): Promise<{ team_id: string }> {
        return await transaction(async (client) => {
            // Get invite
            const inviteResult = await client.query(
                `SELECT * FROM invites WHERE token = $1 FOR UPDATE`,
                [token]
            );

            if (inviteResult.rows.length === 0) {
                throw new Error('Invite not found');
            }

            const invite = inviteResult.rows[0];

            if (invite.status !== 'pending') {
                throw new Error(`Invite has already been ${invite.status}`);
            }

            if (new Date(invite.expires_at) < new Date()) {
                await client.query(`UPDATE invites SET status = 'expired' WHERE id = $1`, [invite.id]);
                throw new Error('Invite has expired');
            }

            // Check if already a member
            const existingMember = await client.query(
                'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
                [invite.team_id, userId]
            );

            if (existingMember.rows.length > 0) {
                throw new Error('You are already a member of this team');
            }

            // Create team membership
            const memberId = uuidv4();
            await client.query(
                `INSERT INTO team_members (id, team_id, user_id, role, player_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [memberId, invite.team_id, userId, invite.role, invite.player_id || null]
            );

            // Link player record to user if specified
            if (invite.player_id) {
                await client.query(
                    'UPDATE players SET user_id = $1 WHERE id = $2',
                    [userId, invite.player_id]
                );
            }

            // Mark invite as accepted
            await client.query(
                `UPDATE invites SET status = 'accepted', accepted_by = $1, accepted_at = NOW()
                 WHERE id = $2`,
                [userId, invite.id]
            );

            return { team_id: invite.team_id };
        });
    }

    async revokeInvite(inviteId: string): Promise<void> {
        const result = await query(
            `UPDATE invites SET status = 'revoked' WHERE id = $1 AND status = 'pending' RETURNING id`,
            [inviteId]
        );
        if (result.rows.length === 0) {
            throw new Error('Invite not found or already used');
        }
    }
}

export default new InviteService();
