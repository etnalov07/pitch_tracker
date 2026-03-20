import { query, transaction } from '../config/database';
import { PitchCall, PitchCallWithDetails, PitchCallGameSummary, PitchCallAbbrev, PitchCallZone } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PitchCallService {
    // ============================================================================
    // Call CRUD
    // ============================================================================

    async createCall(data: {
        game_id: string;
        team_id: string;
        pitch_type: PitchCallAbbrev;
        zone: PitchCallZone;
        called_by: string;
        at_bat_id?: string;
        pitcher_id?: string;
        batter_id?: string;
        opponent_batter_id?: string;
        inning?: number;
        balls_before?: number;
        strikes_before?: number;
    }): Promise<PitchCall> {
        const {
            game_id,
            team_id,
            pitch_type,
            zone,
            called_by,
            at_bat_id,
            pitcher_id,
            batter_id,
            opponent_batter_id,
            inning,
            balls_before = 0,
            strikes_before = 0,
        } = data;

        if (!game_id || !team_id || !pitch_type || !zone) {
            throw new Error('game_id, team_id, pitch_type, and zone are required');
        }

        const call = await transaction(async (client) => {
            // Auto-increment call_number within the game
            const countResult = await client.query(
                'SELECT COALESCE(MAX(call_number), 0) AS max_call FROM pitch_calls WHERE game_id = $1',
                [game_id]
            );
            const callNumber = countResult.rows[0].max_call + 1;

            const id = uuidv4();
            const result = await client.query(
                `INSERT INTO pitch_calls (
                    id, game_id, at_bat_id, team_id, pitcher_id, batter_id,
                    opponent_batter_id, call_number, pitch_type, zone, called_by,
                    inning, balls_before, strikes_before
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *`,
                [
                    id,
                    game_id,
                    at_bat_id || null,
                    team_id,
                    pitcher_id || null,
                    batter_id || null,
                    opponent_batter_id || null,
                    callNumber,
                    pitch_type,
                    zone,
                    called_by,
                    inning || null,
                    balls_before,
                    strikes_before,
                ]
            );

            return result.rows[0];
        });

        return call;
    }

    async changeCall(data: {
        original_call_id: string;
        pitch_type: PitchCallAbbrev;
        zone: PitchCallZone;
        called_by: string;
    }): Promise<PitchCall> {
        const { original_call_id, pitch_type, zone, called_by } = data;

        if (!original_call_id || !pitch_type || !zone) {
            throw new Error('original_call_id, pitch_type, and zone are required');
        }

        const call = await transaction(async (client) => {
            // Fetch original call to inherit context
            const originalResult = await client.query('SELECT * FROM pitch_calls WHERE id = $1', [original_call_id]);
            if (originalResult.rows.length === 0) {
                throw new Error('Original call not found');
            }
            const original = originalResult.rows[0];

            if (original.result) {
                throw new Error('Cannot change a call that already has a result logged');
            }

            // Auto-increment call_number
            const countResult = await client.query(
                'SELECT COALESCE(MAX(call_number), 0) AS max_call FROM pitch_calls WHERE game_id = $1',
                [original.game_id]
            );
            const callNumber = countResult.rows[0].max_call + 1;

            const id = uuidv4();
            const result = await client.query(
                `INSERT INTO pitch_calls (
                    id, game_id, at_bat_id, team_id, pitcher_id, batter_id,
                    opponent_batter_id, call_number, pitch_type, zone, is_change,
                    original_call_id, called_by, inning, balls_before, strikes_before
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, $13, $14, $15)
                RETURNING *`,
                [
                    id,
                    original.game_id,
                    original.at_bat_id,
                    original.team_id,
                    original.pitcher_id,
                    original.batter_id,
                    original.opponent_batter_id,
                    callNumber,
                    pitch_type,
                    zone,
                    original_call_id,
                    called_by,
                    original.inning,
                    original.balls_before,
                    original.strikes_before,
                ]
            );

            return result.rows[0];
        });

        return call;
    }

    async markTransmitted(callId: string): Promise<PitchCall> {
        const result = await query('UPDATE pitch_calls SET bt_transmitted = true WHERE id = $1 RETURNING *', [callId]);

        if (result.rows.length === 0) {
            throw new Error('Call not found');
        }

        return result.rows[0];
    }

    async logResult(
        callId: string,
        data: {
            result: string;
            pitch_id?: string;
        }
    ): Promise<PitchCall> {
        const { result: callResult, pitch_id } = data;

        if (!callResult) {
            throw new Error('result is required');
        }

        const validResults = ['strike', 'ball', 'foul', 'in_play'];
        if (!validResults.includes(callResult)) {
            throw new Error(`result must be one of: ${validResults.join(', ')}`);
        }

        const result = await query(
            `UPDATE pitch_calls
             SET result = $1, pitch_id = $2, result_logged_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [callResult, pitch_id || null, callId]
        );

        if (result.rows.length === 0) {
            throw new Error('Call not found');
        }

        return result.rows[0];
    }

    // ============================================================================
    // Queries
    // ============================================================================

    async getCallById(callId: string): Promise<PitchCallWithDetails | null> {
        const result = await query(
            `SELECT pc.*,
                    p.first_name AS pitcher_first_name,
                    p.last_name AS pitcher_last_name,
                    u.first_name AS caller_first_name,
                    u.last_name AS caller_last_name,
                    COALESCE(ol.player_name, bp.first_name || ' ' || bp.last_name) AS batter_name,
                    oc.pitch_type AS original_pitch_type,
                    oc.zone AS original_zone
             FROM pitch_calls pc
             LEFT JOIN players p ON pc.pitcher_id = p.id
             LEFT JOIN users u ON pc.called_by = u.id
             LEFT JOIN opponent_lineup ol ON pc.opponent_batter_id = ol.id
             LEFT JOIN players bp ON pc.batter_id = bp.id
             LEFT JOIN pitch_calls oc ON pc.original_call_id = oc.id
             WHERE pc.id = $1`,
            [callId]
        );

        return result.rows[0] || null;
    }

    async getCallsByGame(gameId: string): Promise<PitchCallWithDetails[]> {
        const result = await query(
            `SELECT pc.*,
                    p.first_name AS pitcher_first_name,
                    p.last_name AS pitcher_last_name,
                    u.first_name AS caller_first_name,
                    u.last_name AS caller_last_name,
                    COALESCE(ol.player_name, bp.first_name || ' ' || bp.last_name) AS batter_name,
                    oc.pitch_type AS original_pitch_type,
                    oc.zone AS original_zone
             FROM pitch_calls pc
             LEFT JOIN players p ON pc.pitcher_id = p.id
             LEFT JOIN users u ON pc.called_by = u.id
             LEFT JOIN opponent_lineup ol ON pc.opponent_batter_id = ol.id
             LEFT JOIN players bp ON pc.batter_id = bp.id
             LEFT JOIN pitch_calls oc ON pc.original_call_id = oc.id
             WHERE pc.game_id = $1
             ORDER BY pc.call_number ASC`,
            [gameId]
        );

        return result.rows;
    }

    async getCallsByAtBat(atBatId: string): Promise<PitchCallWithDetails[]> {
        const result = await query(
            `SELECT pc.*,
                    p.first_name AS pitcher_first_name,
                    p.last_name AS pitcher_last_name,
                    u.first_name AS caller_first_name,
                    u.last_name AS caller_last_name,
                    COALESCE(ol.player_name, bp.first_name || ' ' || bp.last_name) AS batter_name,
                    oc.pitch_type AS original_pitch_type,
                    oc.zone AS original_zone
             FROM pitch_calls pc
             LEFT JOIN players p ON pc.pitcher_id = p.id
             LEFT JOIN users u ON pc.called_by = u.id
             LEFT JOIN opponent_lineup ol ON pc.opponent_batter_id = ol.id
             LEFT JOIN players bp ON pc.batter_id = bp.id
             LEFT JOIN pitch_calls oc ON pc.original_call_id = oc.id
             WHERE pc.at_bat_id = $1
             ORDER BY pc.call_number ASC`,
            [atBatId]
        );

        return result.rows;
    }

    async getActiveCall(gameId: string): Promise<PitchCallWithDetails | null> {
        // The most recent call in the game that has no result logged
        const result = await query(
            `SELECT pc.*,
                    p.first_name AS pitcher_first_name,
                    p.last_name AS pitcher_last_name,
                    u.first_name AS caller_first_name,
                    u.last_name AS caller_last_name,
                    COALESCE(ol.player_name, bp.first_name || ' ' || bp.last_name) AS batter_name,
                    oc.pitch_type AS original_pitch_type,
                    oc.zone AS original_zone
             FROM pitch_calls pc
             LEFT JOIN players p ON pc.pitcher_id = p.id
             LEFT JOIN users u ON pc.called_by = u.id
             LEFT JOIN opponent_lineup ol ON pc.opponent_batter_id = ol.id
             LEFT JOIN players bp ON pc.batter_id = bp.id
             LEFT JOIN pitch_calls oc ON pc.original_call_id = oc.id
             WHERE pc.game_id = $1 AND pc.result IS NULL
             ORDER BY pc.call_number DESC
             LIMIT 1`,
            [gameId]
        );

        return result.rows[0] || null;
    }

    // ============================================================================
    // Analytics
    // ============================================================================

    async getGameSummary(gameId: string): Promise<PitchCallGameSummary | null> {
        // Only count "final" calls — exclude calls that were changed (i.e., have a newer change pointing to them)
        const callsResult = await query(
            `SELECT pc.*
             FROM pitch_calls pc
             WHERE pc.game_id = $1
               AND pc.result IS NOT NULL
             ORDER BY pc.call_number ASC`,
            [gameId]
        );

        const calls = callsResult.rows;
        if (calls.length === 0) return null;

        const results = { strike: 0, ball: 0, foul: 0, in_play: 0 };
        const changes = calls.filter((c: any) => c.is_change).length;

        const pitchTypeMap = new Map<string, { count: number; strikes: number; balls: number }>();
        const zoneMap = new Map<string, { count: number; strikes: number; balls: number }>();

        for (const call of calls) {
            // Count results
            if (call.result in results) {
                results[call.result as keyof typeof results]++;
            }

            // Pitch type breakdown
            const ptEntry = pitchTypeMap.get(call.pitch_type) || { count: 0, strikes: 0, balls: 0 };
            ptEntry.count++;
            if (call.result === 'strike') ptEntry.strikes++;
            if (call.result === 'ball') ptEntry.balls++;
            pitchTypeMap.set(call.pitch_type, ptEntry);

            // Zone breakdown
            const zEntry = zoneMap.get(call.zone) || { count: 0, strikes: 0, balls: 0 };
            zEntry.count++;
            if (call.result === 'strike') zEntry.strikes++;
            if (call.result === 'ball') zEntry.balls++;
            zoneMap.set(call.zone, zEntry);
        }

        return {
            game_id: gameId,
            total_calls: calls.length,
            changes,
            results,
            pitch_type_breakdown: Array.from(pitchTypeMap.entries()).map(([pitch_type, stats]) => ({
                pitch_type: pitch_type as PitchCallAbbrev,
                ...stats,
            })),
            zone_breakdown: Array.from(zoneMap.entries()).map(([zone, stats]) => ({
                zone: zone as PitchCallZone,
                ...stats,
            })),
        };
    }
}

export default new PitchCallService();
