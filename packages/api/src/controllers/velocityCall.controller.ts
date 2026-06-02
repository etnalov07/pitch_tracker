import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import velocityCallService from '../services/velocityCall.service';

export class VelocityCallController {
    /**
     * Authenticated: a charter on the game mints a 6-char code that the radar
     * holder uses to broadcast velocities. Default TTL 4 hours.
     */
    async mintCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const { gameId } = req.params;
            if (!gameId) {
                res.status(400).json({ error: 'gameId is required' });
                return;
            }
            const ttlMinutes =
                typeof req.body?.ttl_minutes === 'number' && req.body.ttl_minutes > 0 && req.body.ttl_minutes <= 720
                    ? req.body.ttl_minutes
                    : undefined;
            const code = await velocityCallService.mintCode(gameId as string, req.user?.id ?? null, ttlMinutes);
            res.status(201).json({ code });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Public (no auth): the sender page POSTs { code, velocity } here. The
     * code is the only credential. We trade some security (anyone with the
     * code can post) for radical zero-friction onboarding (no app install,
     * no account). The code is short-lived (4h default) and game-scoped.
     */
    async sendVelocity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { code, velocity, sender_label } = req.body ?? {};
            if (typeof code !== 'string' || code.length !== 6) {
                res.status(400).json({ error: 'code must be a 6-character string' });
                return;
            }
            if (typeof velocity !== 'number' || !Number.isFinite(velocity)) {
                res.status(400).json({ error: 'velocity must be a finite number' });
                return;
            }
            const result = await velocityCallService.sendVelocity(
                code,
                velocity,
                typeof sender_label === 'string' ? sender_label.slice(0, 40) : undefined
            );
            res.status(200).json({ ok: true, game_id: result.game_id });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (/Code not found|Invalid code/.test(message)) {
                res.status(404).json({ error: message });
                return;
            }
            if (/velocity must/.test(message)) {
                res.status(400).json({ error: message });
                return;
            }
            next(error);
        }
    }

    /**
     * Public lookup: the sender page calls this to learn whether the code is
     * still valid and when it expires. Returns 404 if not found / expired.
     */
    async describeCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { code } = req.params;
            const info = await velocityCallService.describeCode(code as string);
            if (!info) {
                res.status(404).json({ error: 'Code not found or expired' });
                return;
            }
            res.status(200).json({ code: code, game_id: info.game_id, expires_at: info.expires_at });
        } catch (error) {
            next(error);
        }
    }
}

export default new VelocityCallController();
