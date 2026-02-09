import { query, transaction } from '../config/database';
import { BullpenSession, BullpenSessionWithDetails, BullpenPitch, BullpenSessionSummary } from '../types';
import { v4 as uuidv4 } from 'uuid';

const TARGET_ACCURACY_THRESHOLD = 0.15;

export class BullpenService {
    // ============================================================================
    // Session CRUD
    // ============================================================================

    async createSession(data: {
        team_id: string;
        pitcher_id: string;
        intensity?: string;
        plan_id?: string;
        created_by?: string;
    }): Promise<BullpenSession> {
        const { team_id, pitcher_id, intensity = 'medium', plan_id, created_by } = data;

        if (!team_id || !pitcher_id) {
            throw new Error('team_id and pitcher_id are required');
        }

        const id = uuidv4();
        const result = await query(
            `INSERT INTO bullpen_sessions (id, team_id, pitcher_id, intensity, plan_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [id, team_id, pitcher_id, intensity, plan_id || null, created_by || null]
        );

        return result.rows[0];
    }

    async getSessionById(sessionId: string): Promise<BullpenSessionWithDetails | null> {
        const result = await query(
            `SELECT bs.*,
              p.first_name AS pitcher_first_name,
              p.last_name AS pitcher_last_name,
              p.jersey_number AS pitcher_jersey_number,
              bp.name AS plan_name,
              COALESCE(pitch_stats.total_pitches, 0) AS total_pitches,
              COALESCE(pitch_stats.strikes, 0) AS strikes,
              COALESCE(pitch_stats.balls, 0) AS balls
       FROM bullpen_sessions bs
       JOIN players p ON bs.pitcher_id = p.id
       LEFT JOIN bullpen_plans bp ON bs.plan_id = bp.id
       LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS total_pitches,
                  COUNT(*) FILTER (WHERE result IN ('called_strike', 'swinging_strike', 'foul'))::int AS strikes,
                  COUNT(*) FILTER (WHERE result = 'ball')::int AS balls
           FROM bullpen_pitches WHERE session_id = bs.id
       ) pitch_stats ON true
       WHERE bs.id = $1`,
            [sessionId]
        );

        return result.rows[0] || null;
    }

    async getSessionsByTeam(teamId: string, pitcherId?: string): Promise<BullpenSessionWithDetails[]> {
        let queryText = `
      SELECT bs.*,
             p.first_name AS pitcher_first_name,
             p.last_name AS pitcher_last_name,
             p.jersey_number AS pitcher_jersey_number,
             bp.name AS plan_name,
             COALESCE(pitch_stats.total_pitches, 0) AS total_pitches,
             COALESCE(pitch_stats.strikes, 0) AS strikes,
             COALESCE(pitch_stats.balls, 0) AS balls
      FROM bullpen_sessions bs
      JOIN players p ON bs.pitcher_id = p.id
      LEFT JOIN bullpen_plans bp ON bs.plan_id = bp.id
      LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS total_pitches,
                 COUNT(*) FILTER (WHERE result IN ('called_strike', 'swinging_strike', 'foul'))::int AS strikes,
                 COUNT(*) FILTER (WHERE result = 'ball')::int AS balls
          FROM bullpen_pitches WHERE session_id = bs.id
      ) pitch_stats ON true
      WHERE bs.team_id = $1`;

        const params: any[] = [teamId];

        if (pitcherId) {
            queryText += ' AND bs.pitcher_id = $2';
            params.push(pitcherId);
        }

        queryText += ' ORDER BY bs.date DESC, bs.created_at DESC';

        const result = await query(queryText, params);
        return result.rows;
    }

    async getSessionsByPitcher(pitcherId: string): Promise<BullpenSessionWithDetails[]> {
        const result = await query(
            `SELECT bs.*,
              p.first_name AS pitcher_first_name,
              p.last_name AS pitcher_last_name,
              p.jersey_number AS pitcher_jersey_number,
              bp.name AS plan_name,
              COALESCE(pitch_stats.total_pitches, 0) AS total_pitches,
              COALESCE(pitch_stats.strikes, 0) AS strikes,
              COALESCE(pitch_stats.balls, 0) AS balls
       FROM bullpen_sessions bs
       JOIN players p ON bs.pitcher_id = p.id
       LEFT JOIN bullpen_plans bp ON bs.plan_id = bp.id
       LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS total_pitches,
                  COUNT(*) FILTER (WHERE result IN ('called_strike', 'swinging_strike', 'foul'))::int AS strikes,
                  COUNT(*) FILTER (WHERE result = 'ball')::int AS balls
           FROM bullpen_pitches WHERE session_id = bs.id
       ) pitch_stats ON true
       WHERE bs.pitcher_id = $1
       ORDER BY bs.date DESC, bs.created_at DESC`,
            [pitcherId]
        );

        return result.rows;
    }

    async updateSession(
        sessionId: string,
        data: {
            intensity?: string;
            notes?: string;
        }
    ): Promise<BullpenSession> {
        const { intensity, notes } = data;

        const result = await query(
            `UPDATE bullpen_sessions
       SET intensity = COALESCE($1, intensity),
           notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
            [intensity, notes, sessionId]
        );

        if (result.rows.length === 0) {
            throw new Error('Session not found');
        }

        return result.rows[0];
    }

    async endSession(sessionId: string, notes?: string): Promise<BullpenSession> {
        const updates: string[] = ["status = 'completed'"];
        const params: any[] = [];
        let paramIndex = 1;

        if (notes !== undefined) {
            updates.push(`notes = $${paramIndex}`);
            params.push(notes);
            paramIndex++;
        }

        params.push(sessionId);

        const result = await query(
            `UPDATE bullpen_sessions
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            throw new Error('Session not found');
        }

        return result.rows[0];
    }

    // ============================================================================
    // Pitch Logging
    // ============================================================================

    async logPitch(data: {
        session_id: string;
        pitch_type: string;
        target_x?: number;
        target_y?: number;
        actual_x?: number;
        actual_y?: number;
        velocity?: number;
        result?: string;
    }): Promise<BullpenPitch> {
        const { session_id, pitch_type, target_x, target_y, actual_x, actual_y, velocity, result: explicitResult } = data;

        if (!session_id || !pitch_type) {
            throw new Error('session_id and pitch_type are required');
        }

        // Auto-determine ball/strike from pitch location if no explicit result provided.
        // Strike zone is normalized 0-1 on both axes. A baseball is ~2.9" diameter vs ~17" zone width,
        // so the ball radius in normalized coords is ~0.085. A strike means any part of the ball
        // touches the zone: ball center must be within (-radius, 1+radius) on both axes.
        const BALL_RADIUS = 0.085;
        let pitchResult = explicitResult || null;
        if (!pitchResult && actual_x != null && actual_y != null) {
            const touchesZone =
                actual_x > -BALL_RADIUS && actual_x < 1 + BALL_RADIUS && actual_y > -BALL_RADIUS && actual_y < 1 + BALL_RADIUS;
            pitchResult = touchesZone ? 'called_strike' : 'ball';
        }

        const pitch = await transaction(async (client) => {
            const countResult = await client.query(
                'SELECT COALESCE(MAX(pitch_number), 0) as max_pitch FROM bullpen_pitches WHERE session_id = $1',
                [session_id]
            );
            const pitchNumber = countResult.rows[0].max_pitch + 1;

            const id = uuidv4();
            const insertResult = await client.query(
                `INSERT INTO bullpen_pitches (id, session_id, pitch_number, pitch_type, target_x, target_y, actual_x, actual_y, velocity, result)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
                [id, session_id, pitchNumber, pitch_type, target_x, target_y, actual_x, actual_y, velocity, pitchResult]
            );

            // Auto-add pitch type to pitcher's profile if not already present
            const sessionResult = await client.query('SELECT pitcher_id FROM bullpen_sessions WHERE id = $1', [session_id]);
            if (sessionResult.rows.length > 0) {
                const pitcherId = sessionResult.rows[0].pitcher_id;
                const existing = await client.query('SELECT 1 FROM pitcher_pitch_types WHERE player_id = $1 AND pitch_type = $2', [
                    pitcherId,
                    pitch_type,
                ]);
                if (existing.rows.length === 0) {
                    await client.query('INSERT INTO pitcher_pitch_types (id, player_id, pitch_type) VALUES ($1, $2, $3)', [
                        uuidv4(),
                        pitcherId,
                        pitch_type,
                    ]);
                }
            }

            return insertResult.rows[0];
        });

        return pitch;
    }

    async getPitchesBySession(sessionId: string): Promise<BullpenPitch[]> {
        const result = await query('SELECT * FROM bullpen_pitches WHERE session_id = $1 ORDER BY pitch_number ASC', [sessionId]);
        return result.rows;
    }

    // ============================================================================
    // Analytics
    // ============================================================================

    async getSessionSummary(sessionId: string): Promise<BullpenSessionSummary | null> {
        const sessionResult = await query(
            `SELECT bs.*, bp.name AS plan_name
       FROM bullpen_sessions bs
       LEFT JOIN bullpen_plans bp ON bs.plan_id = bp.id
       WHERE bs.id = $1`,
            [sessionId]
        );

        if (sessionResult.rows.length === 0) return null;
        const session = sessionResult.rows[0];

        const pitchesResult = await query('SELECT * FROM bullpen_pitches WHERE session_id = $1 ORDER BY pitch_number ASC', [
            sessionId,
        ]);
        const pitches = pitchesResult.rows;

        const totalPitches = pitches.length;
        const strikes = pitches.filter((p: any) => ['called_strike', 'swinging_strike', 'foul'].includes(p.result)).length;
        const balls = pitches.filter((p: any) => p.result === 'ball').length;
        const strikePercentage = totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0;

        // Target accuracy: pitches where actual location is within threshold of target
        const pitchesWithTarget = pitches.filter(
            (p: any) => p.target_x != null && p.target_y != null && p.actual_x != null && p.actual_y != null
        );
        const accuratePitches = pitchesWithTarget.filter((p: any) => {
            const distance = Math.sqrt(Math.pow(p.actual_x - p.target_x, 2) + Math.pow(p.actual_y - p.target_y, 2));
            return distance <= TARGET_ACCURACY_THRESHOLD;
        });
        const targetAccuracy =
            pitchesWithTarget.length > 0 ? Math.round((accuratePitches.length / pitchesWithTarget.length) * 100) : null;

        // Pitch type breakdown
        const typeMap = new Map<string, { count: number; strikes: number; balls: number; velocities: number[] }>();
        for (const p of pitches) {
            const entry = typeMap.get(p.pitch_type) || { count: 0, strikes: 0, balls: 0, velocities: [] };
            entry.count++;
            if (['called_strike', 'swinging_strike', 'foul'].includes(p.result)) entry.strikes++;
            if (p.result === 'ball') entry.balls++;
            if (p.velocity != null) entry.velocities.push(Number(p.velocity));
            typeMap.set(p.pitch_type, entry);
        }

        const pitchTypeBreakdown = Array.from(typeMap.entries()).map(([pitch_type, stats]) => ({
            pitch_type,
            count: stats.count,
            strikes: stats.strikes,
            balls: stats.balls,
            avg_velocity:
                stats.velocities.length > 0
                    ? Math.round((stats.velocities.reduce((a, b) => a + b, 0) / stats.velocities.length) * 10) / 10
                    : null,
            top_velocity: stats.velocities.length > 0 ? Math.max(...stats.velocities) : null,
        }));

        return {
            session_id: session.id,
            date: session.date,
            intensity: session.intensity,
            total_pitches: totalPitches,
            strikes,
            balls,
            strike_percentage: strikePercentage,
            target_accuracy_percentage: targetAccuracy,
            pitch_type_breakdown: pitchTypeBreakdown,
            plan_name: session.plan_name || undefined,
            notes: session.notes || undefined,
        };
    }

    async getPitcherBullpenLogs(
        pitcherId: string,
        limit = 20,
        offset = 0
    ): Promise<{
        sessions: BullpenSessionSummary[];
        total_count: number;
    }> {
        const countResult = await query(
            "SELECT COUNT(*)::int AS total FROM bullpen_sessions WHERE pitcher_id = $1 AND status = 'completed'",
            [pitcherId]
        );
        const totalCount = countResult.rows[0].total;

        const sessionsResult = await query(
            `SELECT bs.id
       FROM bullpen_sessions bs
       WHERE bs.pitcher_id = $1 AND bs.status = 'completed'
       ORDER BY bs.date DESC, bs.created_at DESC
       LIMIT $2 OFFSET $3`,
            [pitcherId, limit, offset]
        );

        const sessions: BullpenSessionSummary[] = [];
        for (const row of sessionsResult.rows) {
            const summary = await this.getSessionSummary(row.id);
            if (summary) sessions.push(summary);
        }

        return { sessions, total_count: totalCount };
    }
}

export default new BullpenService();
