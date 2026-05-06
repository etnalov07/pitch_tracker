process.env.JWT_SECRET = 'test-jwt-secret-for-utils';

import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, decodeToken } from '../jwt';

describe('utils/jwt', () => {
    const payload = { id: 'user-1', email: 'user@example.com' };

    describe('generateToken', () => {
        it('returns a signed JWT containing the payload', () => {
            const token = generateToken(payload);
            const decoded = jwt.decode(token) as Record<string, unknown>;

            expect(typeof token).toBe('string');
            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
            expect(decoded.exp).toBeDefined();
        });
    });

    describe('verifyToken', () => {
        it('verifies and returns the payload for a valid token', () => {
            const token = generateToken(payload);
            const verified = verifyToken(token);

            expect(verified.id).toBe(payload.id);
            expect(verified.email).toBe(payload.email);
        });

        it('throws "Invalid or expired token" for malformed input', () => {
            expect(() => verifyToken('not-a-real-jwt')).toThrow('Invalid or expired token');
        });

        it('throws for a token signed with a different secret', () => {
            const stranger = jwt.sign(payload, 'a-different-secret');
            expect(() => verifyToken(stranger)).toThrow('Invalid or expired token');
        });
    });

    describe('decodeToken', () => {
        it('decodes a valid token without verifying signature', () => {
            const token = jwt.sign(payload, 'another-secret');
            const decoded = decodeToken(token);

            expect(decoded?.id).toBe(payload.id);
            expect(decoded?.email).toBe(payload.email);
        });

        it('returns null for an unparseable token', () => {
            // jwt.decode returns null for non-JWT strings; ensure our wrapper preserves that
            expect(decodeToken('garbage')).toBeNull();
        });
    });
});
