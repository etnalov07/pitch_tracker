import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

describe('VelocityCall Routes - /bt-api/velocity-calls', () => {
    beforeEach(() => resetMocks());

    describe('POST /games/:gameId/codes (mint)', () => {
        const gameId = '11111111-1111-1111-1111-111111111111';

        it('returns 401 without auth', async () => {
            const res = await getAgent().post(`/bt-api/velocity-calls/games/${gameId}/codes`).send({});
            expect(res.status).toBe(401);
        });

        it('mints a code and returns it with expires_at', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // DELETE expired
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        code: 'AB23CD',
                        game_id: gameId,
                        created_at: '2026-06-01T12:00:00.000Z',
                        expires_at: '2026-06-01T16:00:00.000Z',
                    },
                ],
            } as any);

            const res = await getAgent()
                .post(`/bt-api/velocity-calls/games/${gameId}/codes`)
                .set('Authorization', authHeader())
                .send({});

            expect(res.status).toBe(201);
            expect(res.body.code.code).toBe('AB23CD');
            expect(res.body.code.game_id).toBe(gameId);
            expect(res.body.code.expires_at).toBeDefined();
        });

        it('clamps ttl_minutes to the allowed range', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            mockQuery.mockResolvedValueOnce({
                rows: [{ code: 'XYZ234', game_id: gameId, created_at: 'x', expires_at: 'y' }],
            } as any);

            const res = await getAgent()
                .post(`/bt-api/velocity-calls/games/${gameId}/codes`)
                .set('Authorization', authHeader())
                .send({ ttl_minutes: 99999 });

            expect(res.status).toBe(201);
            // The service used the default (240) rather than the wild value.
            const calls = mockQuery.mock.calls.map((c) => c[1]);
            const insertCall = calls.find((p: any) => Array.isArray(p) && p[0] === '240');
            expect(insertCall).toBeTruthy();
        });
    });

    describe('POST /send (sender → broadcast)', () => {
        const gameId = '22222222-2222-2222-2222-222222222222';

        it('does NOT require auth (public sender)', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ game_id: gameId }] } as any); // code lookup
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // UPDATE last_used_at
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // pg_notify

            const res = await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'ABC234', velocity: 92 });

            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.game_id).toBe(gameId);
        });

        it('rejects code of wrong length', async () => {
            const res = await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'AB', velocity: 92 });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/6-character/);
        });

        it('rejects non-numeric velocity', async () => {
            const res = await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'ABC234', velocity: 'fast' });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/velocity/i);
        });

        it('rejects velocity outside 20–130', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ game_id: gameId }] } as any);
            const res = await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'ABC234', velocity: 200 });
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/20 and 130/);
        });

        it('returns 404 for unknown / expired code', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // code lookup miss
            const res = await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'ZZZZZZ', velocity: 88 });
            expect(res.status).toBe(404);
        });

        it('pg_notify payload includes type=velocity_call + velocity + game_id', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ game_id: gameId }] } as any);
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await getAgent().post('/bt-api/velocity-calls/send').send({ code: 'ABC234', velocity: 92.34 });

            const notifyCall = mockQuery.mock.calls.find(
                (c) => typeof c[0] === 'string' && c[0].includes('pg_notify') && Array.isArray(c[1])
            );
            expect(notifyCall).toBeDefined();
            const channel = (notifyCall as any)[1][0];
            const payload = JSON.parse((notifyCall as any)[1][1]);
            expect(channel).toBe(`game_${gameId}`);
            expect(payload.type).toBe('velocity_call');
            expect(payload.game_id).toBe(gameId);
            // Velocity rounded to one decimal place.
            expect(payload.velocity).toBe(92.3);
        });
    });

    describe('GET /codes/:code (describe)', () => {
        const gameId = '33333333-3333-3333-3333-333333333333';

        it('returns 404 for an unknown code (public)', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            const res = await getAgent().get('/bt-api/velocity-calls/codes/UNKNOW');
            expect(res.status).toBe(404);
        });

        it('returns game_id + expires_at for a valid code', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ game_id: gameId, expires_at: '2026-06-01T16:00:00.000Z' }],
            } as any);

            const res = await getAgent().get('/bt-api/velocity-calls/codes/ABC234');
            expect(res.status).toBe(200);
            expect(res.body.game_id).toBe(gameId);
            expect(res.body.expires_at).toBe('2026-06-01T16:00:00.000Z');
        });
    });
});
