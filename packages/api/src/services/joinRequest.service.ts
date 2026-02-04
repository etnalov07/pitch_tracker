import { query, transaction } from '../config/database';
import { JoinRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class JoinRequestService {
    async createRequest(
        userId: string,
        data: { team_id: string; message?: string }
    ): Promise<JoinRequest> {
        const { team_id, message } = data;

        // Verify team exists
        const teamResult = await query('SELECT id, name FROM teams WHERE id = $1', [team_id]);
        if (teamResult.rows.length === 0) {
            throw new Error('Team not found');
        }

        // Check not already a member
        const existingMember = await query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [team_id, userId]
        );
        if (existingMember.rows.length > 0) {
            throw new Error('You are already a member of this team');
        }

        // Check no existing pending request
        const existingRequest = await query(
            `SELECT id FROM join_requests WHERE team_id = $1 AND user_id = $2 AND status = 'pending'`,
            [team_id, userId]
        );
        if (existingRequest.rows.length > 0) {
            throw new Error('You already have a pending request for this team');
        }

        const id = uuidv4();
        const result = await query(
            `INSERT INTO join_requests (id, team_id, user_id, message)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, team_id, userId, message?.trim() || null]
        );

        const request = result.rows[0];
        request.team_name = teamResult.rows[0].name;
        return request;
    }

    async getRequestsByUser(userId: string): Promise<JoinRequest[]> {
        const result = await query(
            `SELECT jr.*, t.name as team_name
             FROM join_requests jr
             JOIN teams t ON t.id = jr.team_id
             WHERE jr.user_id = $1
             ORDER BY jr.created_at DESC`,
            [userId]
        );
        return result.rows;
    }

    async getRequestsByTeam(teamId: string): Promise<JoinRequest[]> {
        const result = await query(
            `SELECT jr.*, u.first_name as user_first_name, u.last_name as user_last_name
             FROM join_requests jr
             JOIN users u ON u.id = jr.user_id
             WHERE jr.team_id = $1
             ORDER BY jr.status, jr.created_at DESC`,
            [teamId]
        );
        return result.rows;
    }

    async approveRequest(
        requestId: string,
        reviewerId: string,
        linkedPlayerId?: string
    ): Promise<void> {
        await transaction(async (client) => {
            // Get request
            const reqResult = await client.query(
                `SELECT * FROM join_requests WHERE id = $1 FOR UPDATE`,
                [requestId]
            );
            if (reqResult.rows.length === 0) {
                throw new Error('Join request not found');
            }

            const request = reqResult.rows[0];
            if (request.status !== 'pending') {
                throw new Error(`Request has already been ${request.status}`);
            }

            // Update request
            await client.query(
                `UPDATE join_requests
                 SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), linked_player_id = $2
                 WHERE id = $3`,
                [reviewerId, linkedPlayerId || null, requestId]
            );

            // Create team membership
            const memberId = uuidv4();
            await client.query(
                `INSERT INTO team_members (id, team_id, user_id, role, player_id)
                 VALUES ($1, $2, $3, 'player', $4)
                 ON CONFLICT (team_id, user_id) DO NOTHING`,
                [memberId, request.team_id, request.user_id, linkedPlayerId || null]
            );

            // Link player record if specified
            if (linkedPlayerId) {
                await client.query(
                    'UPDATE players SET user_id = $1 WHERE id = $2',
                    [request.user_id, linkedPlayerId]
                );
            } else {
                // Create a new player record from user's name
                const userResult = await client.query(
                    'SELECT first_name, last_name FROM users WHERE id = $1',
                    [request.user_id]
                );
                if (userResult.rows.length > 0) {
                    const user = userResult.rows[0];
                    const playerId = uuidv4();
                    await client.query(
                        `INSERT INTO players (id, team_id, user_id, first_name, last_name, primary_position, bats, throws)
                         VALUES ($1, $2, $3, $4, $5, 'UTIL', 'R', 'R')`,
                        [playerId, request.team_id, request.user_id, user.first_name, user.last_name]
                    );

                    // Update team_members with the new player_id
                    await client.query(
                        'UPDATE team_members SET player_id = $1 WHERE team_id = $2 AND user_id = $3',
                        [playerId, request.team_id, request.user_id]
                    );
                }
            }
        });
    }

    async denyRequest(requestId: string, reviewerId: string): Promise<void> {
        const result = await query(
            `UPDATE join_requests
             SET status = 'denied', reviewed_by = $1, reviewed_at = NOW()
             WHERE id = $2 AND status = 'pending'
             RETURNING id`,
            [reviewerId, requestId]
        );
        if (result.rows.length === 0) {
            throw new Error('Request not found or already reviewed');
        }
    }
}

export default new JoinRequestService();
