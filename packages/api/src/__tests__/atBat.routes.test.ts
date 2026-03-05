import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-ab-id') }));

describe('AtBat Routes - /bt-api/at-bats', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/at-bats
    // ========================================================================

    describe('POST /bt-api/at-bats', () => {
        const atBatPayload = {
            game_id: 'game-1',
            inning_id: 'inning-1',
            pitcher_id: 'pitcher-1',
            batter_id: 'batter-1',
            batting_order: 1,
            outs_before: 0,
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/at-bats').send(atBatPayload);
            expect(res.status).toBe(401);
        });

        it('creates an at-bat', async () => {
            const mockAtBat = { id: 'test-ab-id', ...atBatPayload, balls: 0, strikes: 0 };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const res = await getAgent().post('/bt-api/at-bats').set('Authorization', authHeader()).send(atBatPayload);

            expect(res.status).toBe(201);
            expect(res.body.atBat).toBeDefined();
            expect(res.body.message).toBe('At-bat created successfully');
        });

        it('returns 500 when required fields missing (no inning_id)', async () => {
            const res = await getAgent()
                .post('/bt-api/at-bats')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1', pitcher_id: 'p1', batter_id: 'b1' });

            expect(res.status).toBe(500);
        });

        it('returns 500 when neither batter_id nor opponent_batter_id provided', async () => {
            const res = await getAgent()
                .post('/bt-api/at-bats')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1', inning_id: 'inning-1', pitcher_id: 'p1', outs_before: 0 });

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // GET /bt-api/at-bats/:id
    // ========================================================================

    describe('GET /bt-api/at-bats/:id', () => {
        it('returns an at-bat by ID', async () => {
            const mockAtBat = { id: 'ab-1', game_id: 'game-1' };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const res = await getAgent().get('/bt-api/at-bats/ab-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.atBat).toEqual(mockAtBat);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/at-bats/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // GET /bt-api/at-bats/game/:gameId
    // ========================================================================

    describe('GET /bt-api/at-bats/game/:gameId', () => {
        it('returns at-bats for a game', async () => {
            const mockAtBats = [{ id: 'ab-1' }, { id: 'ab-2' }];
            mockQuery.mockResolvedValueOnce({ rows: mockAtBats } as any);

            const res = await getAgent().get('/bt-api/at-bats/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.atBats).toEqual(mockAtBats);
        });
    });

    // ========================================================================
    // PUT /bt-api/at-bats/:id
    // ========================================================================

    describe('PUT /bt-api/at-bats/:id', () => {
        it('updates an at-bat', async () => {
            const mockAtBat = { id: 'ab-1', balls: 2, strikes: 1 };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const res = await getAgent()
                .put('/bt-api/at-bats/ab-1')
                .set('Authorization', authHeader())
                .send({ balls: 2, strikes: 1 });

            expect(res.status).toBe(200);
            expect(res.body.atBat).toEqual(mockAtBat);
        });
    });

    // ========================================================================
    // POST /bt-api/at-bats/:id/end
    // ========================================================================

    describe('POST /bt-api/at-bats/:id/end', () => {
        it('ends an at-bat with result', async () => {
            const mockAtBat = { id: 'ab-1', result: 'single', outs_after: 0 };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const res = await getAgent()
                .post('/bt-api/at-bats/ab-1/end')
                .set('Authorization', authHeader())
                .send({ result: 'single', outs_after: 0, rbi: 1 });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('At-bat ended successfully');
            expect(res.body.atBat.result).toBe('single');
        });
    });

    // ========================================================================
    // GET /bt-api/at-bats/:id/pitches
    // ========================================================================

    describe('GET /bt-api/at-bats/:id/pitches', () => {
        it('returns at-bat with pitches', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'ab-1', game_id: 'g1' }] } as any) // getAtBatById
                .mockResolvedValueOnce({ rows: [{ id: 'p1' }] } as any); // pitches

            const res = await getAgent().get('/bt-api/at-bats/ab-1/pitches').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.atBat).toBeDefined();
            expect(res.body.atBat.pitches).toBeDefined();
        });

        it('returns 404 when at-bat not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/at-bats/nonexistent/pitches').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });
});
