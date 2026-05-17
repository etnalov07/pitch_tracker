import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { config } from '../config/env';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            res.status(401).json({ error: 'Access token required' });
            return;
        }

        const payload = verifyToken(token);
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
