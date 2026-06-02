import { query } from '../config/database';

// 6-char code drawn from an unambiguous alphabet (no 0/O, no 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;
const DEFAULT_TTL_MINUTES = 240; // 4 hours

function generateCode(): string {
    let out = '';
    for (let i = 0; i < CODE_LEN; i++) {
        out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
}

export interface SenderCode {
    code: string;
    game_id: string;
    expires_at: string;
    created_at: string;
}

export class VelocityCallService {
    /**
     * Mint a short-lived 6-char code that maps to a game. The sender presents
     * this code (no auth header) to publish velocity_call events. The mint
     * itself is gated upstream — only authenticated users on the game can call.
     *
     * Retries on the unlikely PK collision (1 in ~31^6 = 887M).
     */
    async mintCode(gameId: string, createdBy: string | null, ttlMinutes: number = DEFAULT_TTL_MINUTES): Promise<SenderCode> {
        if (!gameId) throw new Error('game_id is required');

        // Garbage-collect this game's expired codes opportunistically so the
        // table doesn't grow unbounded.
        await query(`DELETE FROM velocity_sender_codes WHERE game_id = $1 AND expires_at < NOW()`, [gameId]);

        const expiresAtSql = `NOW() + ($1 || ' minutes')::interval`;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateCode();
            try {
                const result = await query(
                    `INSERT INTO velocity_sender_codes (code, game_id, created_by, expires_at)
                     VALUES ($2, $3, $4, ${expiresAtSql})
                     RETURNING code, game_id, created_at, expires_at`,
                    [String(ttlMinutes), code, gameId, createdBy]
                );
                return result.rows[0];
            } catch (err) {
                lastError = err;
                // PK collision; try a fresh code.
            }
        }
        throw lastError ?? new Error('Failed to mint sender code');
    }

    /**
     * Resolve a code → game_id and broadcast a velocity_call WS event to the
     * game's room via pg_notify. Returns the matched game_id so the controller
     * can echo it back to the sender for its connection-state UI.
     */
    async sendVelocity(code: string, velocity: number, senderLabel?: string): Promise<{ game_id: string }> {
        if (!code || code.length !== CODE_LEN) {
            throw new Error('Invalid code');
        }
        if (!Number.isFinite(velocity) || velocity < 20 || velocity > 130) {
            throw new Error('velocity must be a number between 20 and 130');
        }

        const lookup = await query(`SELECT game_id FROM velocity_sender_codes WHERE code = $1 AND expires_at > NOW()`, [
            code.toUpperCase(),
        ]);
        if (lookup.rows.length === 0) {
            throw new Error('Code not found or expired');
        }
        const gameId = lookup.rows[0].game_id as string;

        await query(`UPDATE velocity_sender_codes SET last_used_at = NOW() WHERE code = $1`, [code.toUpperCase()]);

        // Broadcast via the same Postgres LISTEN/NOTIFY path pitch_call uses.
        // wsServer.ts picks this up and forwards to subscribed sockets.
        await query(`SELECT pg_notify($1, $2)`, [
            `game_${gameId}`,
            JSON.stringify({
                type: 'velocity_call',
                id: code.toUpperCase(),
                game_id: gameId,
                velocity: Math.round(velocity * 10) / 10,
                sent_at: new Date().toISOString(),
                sender_label: senderLabel ?? null,
            }),
        ]);

        return { game_id: gameId };
    }

    /**
     * Look up a code's game_id + remaining TTL. Used by the sender page to
     * show "connected to game X · expires in 3:42" without exposing anything
     * about the game beyond its id.
     */
    async describeCode(code: string): Promise<{ game_id: string; expires_at: string } | null> {
        if (!code || code.length !== CODE_LEN) return null;
        const result = await query(`SELECT game_id, expires_at FROM velocity_sender_codes WHERE code = $1 AND expires_at > NOW()`, [
            code.toUpperCase(),
        ]);
        return result.rows[0] ?? null;
    }
}

export default new VelocityCallService();
