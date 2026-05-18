import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

describe('GameRole Routes - /bt-api/game/:gameId/role', () => {
    beforeEach(() => resetMocks());

    describe('GET /game/:gameId/role', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/game/g1/role');
            expect(res.status).toBe(401);
        });

        it('returns the user role for the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ role: 'charter' }] } as any);

            const res = await getAgent().get('/bt-api/game/g1/role').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.role).toBe('charter');
        });

        it('returns null role when no record exists', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/game/g1/role').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.role).toBeNull();
        });

        it('returns 500 when the database call throws', async () => {
            mockQuery.mockRejectedValueOnce(new Error('boom'));

            const res = await getAgent().get('/bt-api/game/g1/role').set('Authorization', authHeader());

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to get game role');
        });
    });

    describe('POST /game/:gameId/role', () => {
        it('rejects an invalid role string', async () => {
            const res = await getAgent().post('/bt-api/game/g1/role').set('Authorization', authHeader()).send({ role: 'umpire' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('role must be charter or viewer');
        });

        it('claims the charter role when no charter exists yet', async () => {
            const record = { user_id: 'test-user-id', game_id: 'g1', role: 'charter' };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // existing-charter check: none
                .mockResolvedValueOnce({ rows: [record] } as any); // upsert

            const res = await getAgent().post('/bt-api/game/g1/role').set('Authorization', authHeader()).send({ role: 'charter' });

            expect(res.status).toBe(200);
            expect(res.body.role).toEqual(record);
        });

        it('falls back to viewer when another user already holds charter', async () => {
            const viewerRecord = { user_id: 'test-user-id', game_id: 'g1', role: 'viewer' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ user_id: 'another-user' }] } as any) // charter held by someone else
                .mockResolvedValueOnce({ rows: [viewerRecord] } as any); // writeRole(viewer)

            const res = await getAgent().post('/bt-api/game/g1/role').set('Authorization', authHeader()).send({ role: 'charter' });

            expect(res.status).toBe(200);
            expect(res.body.role.role).toBe('viewer');
        });

        it('upserts a viewer role', async () => {
            const record = { user_id: 'test-user-id', game_id: 'g1', role: 'viewer' };
            mockQuery.mockResolvedValueOnce({ rows: [record] } as any);

            const res = await getAgent().post('/bt-api/game/g1/role').set('Authorization', authHeader()).send({ role: 'viewer' });

            expect(res.status).toBe(200);
            expect(res.body.role.role).toBe('viewer');
        });

        it('returns 500 when the database call throws', async () => {
            mockQuery.mockRejectedValueOnce(new Error('boom'));

            const res = await getAgent().post('/bt-api/game/g1/role').set('Authorization', authHeader()).send({ role: 'charter' });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to assign game role');
        });
    });
});
