import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { config } from '../config/env';
import { query } from '../config/database';

// A token issued up to this many ms before a password change is still
// honored — absorbs the one-second granularity of the JWT `iat` claim so a
// fresh post-reset login is never bounced.
const PWD_CHANGE_GRACE_MS = 5000;

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const payload = verifyToken(token);

        // Confirm the user still exists and the token predates no password
        // change — resetting a password invalidates every older session.
        const result = await query('SELECT password_changed_at FROM users WHERE id = $1', [payload.id]);
        if (result.rows.length === 0) {
            res.status(403).json({ error: 'Invalid or expired token' });
            return;
        }
        const changedAt = result.rows[0].password_changed_at;
        if (changedAt && payload.iat && payload.iat * 1000 + PWD_CHANGE_GRACE_MS < new Date(changedAt).getTime()) {
            res.status(403).json({ error: 'Session expired — please sign in again.' });
            return;
        }

        req.user = payload;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Case-insensitive membership check against the env-var allowlist. Exported
// so /auth/profile can derive `is_super_admin` on the user response without
// duplicating the comparison logic.
export const isSuperAdminEmail = (email: string | undefined): boolean => {
    if (!email) return false;
    return config.superAdmin.emails.includes(email.toLowerCase());
};

// Gate for /bt-api/admin/* routes. Must run after authenticateToken.
// 403s anyone not on the allowlist; never throws.
export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !isSuperAdminEmail(req.user.email)) {
        res.status(403).json({ error: 'Super-admin access required' });
        return;
    }
    next();
};
