import crypto from 'crypto';
import { query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { UserWithPassword, UserResponse, RegisterData, LoginCredentials } from '../types';
import { v4 as uuidv4 } from 'uuid';
import emailService from './email.service';
import { config } from '../config/env';
import { isSuperAdminEmail } from '../middleware/auth';

const VERIFY_TOKEN_TTL_DAYS = 7;
const RESET_TOKEN_TTL_HOURS = 1;
const MAX_FAILED_LOGINS = 7;
const LOCKOUT_MINUTES = 15;

export class AuthService {
    async register(data: RegisterData): Promise<{ user: UserResponse; token: string }> {
        const { email, password, first_name, last_name, registration_type } = data;

        // Check if user already exists
        const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

        if (existingUser.rows.length > 0) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const password_hash = await hashPassword(password);

        // Create user
        const userId = uuidv4();
        const result = await query(
            `INSERT INTO users (id, email, password_hash, first_name, last_name, registration_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, first_name, last_name, registration_type, created_at`,
            [userId, email, password_hash, first_name, last_name, registration_type ?? null]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email });

        // Fire-and-forget welcome email with optional verify CTA. Best effort —
        // a delivery failure must not block registration.
        this.issueAndSendWelcome(user.id, user.email, user.first_name).catch((err) =>
            console.error('Welcome email pipeline failed:', err)
        );

        return { user: { ...user, is_super_admin: isSuperAdminEmail(user.email) }, token };
    }

    /**
     * Issue a fresh verification token for the given user and send the welcome
     * email containing the verify CTA. Used at registration and from
     * resend-verification.
     */
    async issueAndSendWelcome(userId: string, email: string, firstName: string): Promise<void> {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        await query('INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
        const verifyUrl = `${config.api.baseUrl}/auth/verify-email?token=${token}`;
        await emailService.sendWelcomeEmail({ to: email, firstName, verifyUrl });
    }

    /**
     * Issue a fresh verification token and send a standalone verification email
     * (no welcome copy). Used when the user requests a re-send.
     */
    async issueAndSendVerification(userId: string, email: string, firstName: string): Promise<void> {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
        await query('INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
        const verifyUrl = `${config.api.baseUrl}/auth/verify-email?token=${token}`;
        await emailService.sendVerificationEmail({ to: email, firstName, verifyUrl });
    }

    /**
     * Consume a verification token: marks the user as verified and the token
     * as used. Returns false for unknown/expired/already-used tokens.
     */
    async verifyEmail(token: string): Promise<boolean> {
        const row = await query('SELECT id, user_id, expires_at, used_at FROM email_verifications WHERE token = $1', [token]);
        if (row.rows.length === 0) return false;
        const v = row.rows[0];
        if (v.used_at) return false;
        if (new Date(v.expires_at).getTime() < Date.now()) return false;

        await query(`UPDATE users SET email_verified = TRUE, email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [
            v.user_id,
        ]);
        await query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [v.id]);
        return true;
    }

    /** Best-effort append to auth_events; never fails the calling request. */
    private async logAuthEvent(
        eventType: string,
        opts: { userId?: string | null; email?: string | null; ip?: string | null }
    ): Promise<void> {
        try {
            await query('INSERT INTO auth_events (user_id, email, event_type, ip_address) VALUES ($1, $2, $3, $4)', [
                opts.userId ?? null,
                opts.email ?? null,
                eventType,
                opts.ip ?? null,
            ]);
        } catch (err) {
            console.error('auth_events write failed:', err);
        }
    }

    async login(credentials: LoginCredentials, ip?: string): Promise<{ user: UserResponse; token: string }> {
        const { email, password } = credentials;

        const result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            await this.logAuthEvent('login_failed', { email, ip });
            throw new Error('Invalid email or password');
        }

        const user = result.rows[0] as UserWithPassword & {
            failed_login_count: number;
            locked_until: string | null;
        };

        // Account currently locked — reject before even checking the password.
        if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
            await this.logAuthEvent('login_blocked_locked', { userId: user.id, email, ip });
            throw new Error('Account temporarily locked after too many failed login attempts. Try again later.');
        }

        // A lock whose cooldown has elapsed gives the user a fresh batch of attempts.
        const priorCount =
            user.locked_until && new Date(user.locked_until).getTime() <= Date.now() ? 0 : (user.failed_login_count ?? 0);

        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            const newCount = priorCount + 1;
            if (newCount >= MAX_FAILED_LOGINS) {
                const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
                await query('UPDATE users SET failed_login_count = $2, locked_until = $3, updated_at = NOW() WHERE id = $1', [
                    user.id,
                    newCount,
                    lockedUntil,
                ]);
                await this.logAuthEvent('account_locked', { userId: user.id, email, ip });
            } else {
                await query('UPDATE users SET failed_login_count = $2, locked_until = NULL, updated_at = NOW() WHERE id = $1', [
                    user.id,
                    newCount,
                ]);
            }
            await this.logAuthEvent('login_failed', { userId: user.id, email, ip });
            throw new Error('Invalid email or password');
        }

        // Success — clear any failed-attempt state.
        if ((user.failed_login_count ?? 0) > 0 || user.locked_until) {
            await query('UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1', [
                user.id,
            ]);
        }

        const token = generateToken({ id: user.id, email: user.email });
        const { password_hash, ...userResponse } = user;

        return {
            user: { ...(userResponse as UserResponse), is_super_admin: isSuperAdminEmail(user.email) } as UserResponse,
            token,
        };
    }

    /**
     * Issue a password-reset token and email the reset link. The link points
     * at the web app's /reset-password page (a form), unlike the verify-email
     * link which hits the API directly.
     */
    async issueAndSendPasswordReset(userId: string, email: string, firstName: string): Promise<void> {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
        await query('INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
        const resetUrl = `${config.invite.baseUrl}/reset-password?token=${token}`;
        await emailService.sendPasswordResetEmail({ to: email, firstName, resetUrl });
    }

    /**
     * Public "forgot password" entry point. Anti-enumeration: always resolves
     * without revealing whether the address has an account.
     */
    async requestPasswordReset(email: string, ip?: string): Promise<void> {
        const result = await query('SELECT id, email, first_name FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return;
        const u = result.rows[0];
        await this.issueAndSendPasswordReset(u.id, u.email, u.first_name);
        await this.logAuthEvent('password_reset_requested', { userId: u.id, email: u.email, ip });
    }

    /**
     * Consume a reset token and set a new password. Stamps password_changed_at
     * (invalidates older JWTs), clears any lockout, and burns every outstanding
     * reset token for the user. Returns a reason string on failure.
     */
    async resetPassword(token: string, newPassword: string): Promise<{ ok: boolean; reason?: string }> {
        const row = await query('SELECT id, user_id, expires_at, used_at FROM password_resets WHERE token = $1', [token]);
        if (row.rows.length === 0) return { ok: false, reason: 'Invalid reset link.' };
        const r = row.rows[0];
        if (r.used_at) return { ok: false, reason: 'This reset link has already been used.' };
        if (new Date(r.expires_at).getTime() < Date.now()) return { ok: false, reason: 'This reset link has expired.' };

        const password_hash = await hashPassword(newPassword);
        await query(
            `UPDATE users
             SET password_hash = $2, password_changed_at = NOW(),
                 failed_login_count = 0, locked_until = NULL, updated_at = NOW()
             WHERE id = $1`,
            [r.user_id, password_hash]
        );
        await query('UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [r.user_id]);
        await this.logAuthEvent('password_reset_completed', { userId: r.user_id });
        return { ok: true };
    }

    async getUserById(userId: string): Promise<UserResponse | null> {
        const result = await query(
            'SELECT id, email, first_name, last_name, registration_type, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) return null;

        const user = result.rows[0];

        // Load role memberships
        const [teamMemberships, orgMemberships] = await Promise.all([
            query(
                `SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.player_id, tm.created_at,
                t.name as team_name
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         WHERE tm.user_id = $1`,
                [userId]
            ),
            query(
                `SELECT om.id, om.organization_id, om.user_id, om.role, om.created_at,
                o.name as org_name
         FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1`,
                [userId]
            ),
        ]);

        return {
            ...user,
            team_memberships: teamMemberships.rows,
            org_memberships: orgMemberships.rows,
            is_super_admin: isSuperAdminEmail(user.email),
        };
    }
}

export default new AuthService();
