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

    async login(credentials: LoginCredentials): Promise<{ user: UserResponse; token: string }> {
        const { email, password } = credentials;

        // Find user
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            throw new Error('Invalid email or password');
        }

        const user: UserWithPassword = result.rows[0];

        // Verify password
        const isValidPassword = await comparePassword(password, user.password_hash);

        if (!isValidPassword) {
            throw new Error('Invalid email or password');
        }

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email });

        // Return user without password
        const { password_hash, ...userResponse } = user;

        return {
            user: { ...(userResponse as UserResponse), is_super_admin: isSuperAdminEmail(user.email) } as UserResponse,
            token,
        };
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
