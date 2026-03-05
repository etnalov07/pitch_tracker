import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

// Mock password utils
jest.mock('../utils/password', () => ({
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    comparePassword: jest.fn().mockResolvedValue(true),
}));

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-user-id') }));

describe('Auth Routes - /bt-api/auth', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/auth/register
    // ========================================================================

    describe('POST /bt-api/auth/register', () => {
        const registerPayload = {
            email: 'newuser@example.com',
            password: 'password123',
            first_name: 'John',
            last_name: 'Doe',
        };

        it('registers a new user', async () => {
            const mockUser = { id: 'test-user-id', email: registerPayload.email, first_name: 'John', last_name: 'Doe' };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // check existing user
                .mockResolvedValueOnce({ rows: [mockUser] } as any); // insert user

            const res = await getAgent().post('/bt-api/auth/register').send(registerPayload);

            expect(res.status).toBe(201);
            expect(res.body.user).toBeDefined();
            expect(res.body.token).toBeDefined();
            expect(res.body.message).toBe('User registered successfully');
        });

        it('returns 400 when fields are missing', async () => {
            const res = await getAgent().post('/bt-api/auth/register').send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('All fields are required');
        });

        it('returns 400 with empty body', async () => {
            const res = await getAgent().post('/bt-api/auth/register').send({});

            expect(res.status).toBe(400);
        });
    });

    // ========================================================================
    // POST /bt-api/auth/login
    // ========================================================================

    describe('POST /bt-api/auth/login', () => {
        it('logs in a user', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'user@example.com',
                password_hash: 'hashed-password',
                first_name: 'John',
                last_name: 'Doe',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);

            const res = await getAgent().post('/bt-api/auth/login').send({ email: 'user@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            expect(res.body.user).toBeDefined();
            expect(res.body.message).toBe('Login successful');
            // Ensure password_hash is not returned
            expect(res.body.user.password_hash).toBeUndefined();
        });

        it('returns 400 when email/password missing', async () => {
            const res = await getAgent().post('/bt-api/auth/login').send({ email: 'test@test.com' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Email and password are required');
        });
    });

    // ========================================================================
    // GET /bt-api/auth/profile
    // ========================================================================

    describe('GET /bt-api/auth/profile', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/auth/profile');
            expect(res.status).toBe(401);
        });

        it('returns user profile with memberships', async () => {
            const mockUser = { id: 'test-user-id', email: 'test@example.com', first_name: 'Test', last_name: 'User' };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockUser] } as any) // get user
                .mockResolvedValueOnce({ rows: [] } as any) // team memberships
                .mockResolvedValueOnce({ rows: [] } as any); // org memberships

            const res = await getAgent().get('/bt-api/auth/profile').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('returns 404 when user not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/auth/profile').set('Authorization', authHeader());

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('User not found');
        });
    });
});
