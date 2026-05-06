import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-call-id') }));

describe('PitchCall Routes - /bt-api/pitch-calls', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        const validPayload = {
            game_id: 'g1',
            team_id: 't1',
            pitch_type: 'FB',
            zone: 'in',
            category: 'pitch',
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/pitch-calls').send(validPayload);
            expect(res.status).toBe(401);
        });

        it('creates a pitch call', async () => {
            const inserted = { id: 'test-call-id', ...validPayload, call_number: 1, called_by: 'test-user-id' };
            setupMockTransaction([
                { rows: [{ max_call: 0 }] }, // call_number lookup
                { rows: [inserted] }, // INSERT
            ]);
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // pg_notify

            const res = await getAgent().post('/bt-api/pitch-calls').set('Authorization', authHeader()).send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.call.id).toBe('test-call-id');
            expect(res.body.message).toBe('Pitch call created');
        });

        it('rejects pitch call missing pitch_type or zone', async () => {
            const res = await getAgent()
                .post('/bt-api/pitch-calls')
                .set('Authorization', authHeader())
                .send({ game_id: 'g1', team_id: 't1', category: 'pitch' });

            expect(res.status).toBe(500); // service throws → next → 500
        });

        it('rejects situational call missing situational_type', async () => {
            const res = await getAgent()
                .post('/bt-api/pitch-calls')
                .set('Authorization', authHeader())
                .send({ game_id: 'g1', team_id: 't1', category: 'situational' });

            expect(res.status).toBe(500);
        });
    });

    describe('GET /:id', () => {
        it('returns a call by id', async () => {
            const call = { id: 'pc1', pitch_type: 'FB' };
            mockQuery.mockResolvedValueOnce({ rows: [call] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/pc1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.call).toEqual(call);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('POST /:id/change', () => {
        it('creates a change call inheriting context', async () => {
            const original = {
                id: 'pc1',
                game_id: 'g1',
                team_id: 't1',
                pitcher_id: 'pitcher-1',
                inning: 3,
                balls_before: 1,
                strikes_before: 1,
                result: null,
            };
            const changed = { id: 'test-call-id', is_change: true, original_call_id: 'pc1' };
            setupMockTransaction([
                { rows: [original] }, // SELECT original
                { rows: [{ max_call: 5 }] }, // call_number
                { rows: [changed] }, // INSERT
            ]);

            const res = await getAgent()
                .post('/bt-api/pitch-calls/pc1/change')
                .set('Authorization', authHeader())
                .send({ pitch_type: 'CB', zone: 'low' });

            expect(res.status).toBe(201);
            expect(res.body.call.is_change).toBe(true);
        });

        it('rejects change when result already logged', async () => {
            const original = {
                id: 'pc1',
                game_id: 'g1',
                team_id: 't1',
                pitcher_id: 'p',
                result: 'strike',
            };
            setupMockTransaction([{ rows: [original] }]);

            const res = await getAgent()
                .post('/bt-api/pitch-calls/pc1/change')
                .set('Authorization', authHeader())
                .send({ pitch_type: 'CB', zone: 'low' });

            expect(res.status).toBe(500); // service throws
        });
    });

    describe('POST /:id/transmitted', () => {
        it('marks the call as transmitted', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pc1', bt_transmitted: true }] } as any);

            const res = await getAgent().post('/bt-api/pitch-calls/pc1/transmitted').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.call.bt_transmitted).toBe(true);
        });
    });

    describe('PUT /:id/result', () => {
        it('logs a strike result', async () => {
            const updated = { id: 'pc1', result: 'strike', pitch_id: 'pi1' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

            const res = await getAgent()
                .put('/bt-api/pitch-calls/pc1/result')
                .set('Authorization', authHeader())
                .send({ result: 'strike', pitch_id: 'pi1' });

            expect(res.status).toBe(200);
            expect(res.body.call.result).toBe('strike');
        });

        it('rejects an invalid result value', async () => {
            const res = await getAgent()
                .put('/bt-api/pitch-calls/pc1/result')
                .set('Authorization', authHeader())
                .send({ result: 'bunt' });

            expect(res.status).toBe(500); // service throws on invalid result
        });
    });

    describe('GET /game/:gameId', () => {
        it('returns calls for a game', async () => {
            const calls = [{ id: 'pc1' }, { id: 'pc2' }];
            mockQuery.mockResolvedValueOnce({ rows: calls } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.calls).toHaveLength(2);
        });
    });

    describe('GET /at-bat/:atBatId', () => {
        it('returns calls for an at-bat', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'pc1' }] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/at-bat/ab1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.calls).toHaveLength(1);
        });
    });

    describe('GET /game/:gameId/active', () => {
        it('returns the most recent unresolved call', async () => {
            const active = { id: 'pc-active', result: null };
            mockQuery.mockResolvedValueOnce({ rows: [active] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/game/g1/active').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.call).toEqual(active);
        });

        it('returns null when no active call exists', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/game/g1/active').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.call).toBeNull();
        });
    });

    describe('GET /game/:gameId/summary', () => {
        it('returns 404 when there are no resolved calls', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/game/g1/summary').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('returns aggregated summary stats', async () => {
            const calls = [
                { result: 'strike', pitch_type: 'FB', zone: 'in', is_change: false },
                { result: 'ball', pitch_type: 'FB', zone: 'low', is_change: false },
                { result: 'strike', pitch_type: 'CB', zone: 'in', is_change: true },
            ];
            mockQuery.mockResolvedValueOnce({ rows: calls } as any);

            const res = await getAgent().get('/bt-api/pitch-calls/game/g1/summary').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summary.total_calls).toBe(3);
            expect(res.body.summary.changes).toBe(1);
            expect(res.body.summary.results.strike).toBe(2);
        });
    });
});
