import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../types';
import authService from '../services/auth.service';
import { query } from '../config/database';
import { config } from '../config/env';

export class AuthController {
    async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: errors.array()[0].msg });
                return;
            }

            const { email, password, first_name, last_name } = req.body;

            const result = await authService.register({ email, password, first_name, last_name });

            res.status(201).json({
                message: 'User registered successfully',
                user: result.user,
                token: result.token,
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ error: errors.array()[0].msg });
                return;
            }

            const { email, password } = req.body;

            const result = await authService.login({ email, password });

            res.status(200).json({
                message: 'Login successful',
                user: result.user,
                token: result.token,
            });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const user = await authService.getUserById(req.user.id);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.status(200).json({ user });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/verify-email?token=...
     * Public endpoint hit by the link in the welcome / verification email.
     * Redirects to the web app with a status query param so the SPA can show
     * a success or failure toast without needing to call another API.
     */
    async verifyEmail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const token = (req.query.token as string | undefined) || '';
            if (!token) {
                res.redirect(`${config.invite.baseUrl}/verify-email?status=invalid`);
                return;
            }
            const ok = await authService.verifyEmail(token);
            res.redirect(`${config.invite.baseUrl}/verify-email?status=${ok ? 'ok' : 'invalid'}`);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /auth/resend-verification
     * Authenticated. Issues a new verification token and emails it to the
     * caller. Idempotent — repeated calls invalidate older unused tokens by
     * recency (we just trust the most recent unused, unexpired one).
     */
    async resendVerification(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const userRow = await query('SELECT id, email, first_name, email_verified FROM users WHERE id = $1', [req.user.id]);
            if (userRow.rows.length === 0) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            const u = userRow.rows[0];
            if (u.email_verified) {
                res.status(200).json({ message: 'Email already verified' });
                return;
            }
            await authService.issueAndSendVerification(u.id, u.email, u.first_name);
            res.status(200).json({ message: 'Verification email sent' });
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
