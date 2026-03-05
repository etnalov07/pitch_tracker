import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-gp-id') }));

describe('GamePitcher Routes - /bt-api/game-pitchers', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/game-pitchers/game/:gameId
    // ========================================================================

    describe('POST /bt-api/game-pitchers/game/:gameId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/game-pitchers/game/g1').send({ player_id: 'p1' });
            expect(res.status).toBe(401);
        });

        it('returns 400 without player_id', async () => {
            const res = await getAgent().post('/bt-api/game-pitchers/game/g1').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('player_id is required');
        });

        it('adds a pitcher to a game', async () => {
            const mockPitcher = { id: 'test-gp-id', player_id: 'p1', game_id: 'g1', pitching_order: 1 };
            mockQuery.mockResolvedValueOnce({ rows: [mockPitcher] } as any);

            const res = await getAgent()
                .post('/bt-api/game-pitchers/game/g1')
                .set('Authorization', authHeader())
                .send({ player_id: 'p1', pitching_order: 1, inning_entered: 1 });

            expect(res.status).toBe(201);
            expect(res.body.pitcher).toBeDefined();
            expect(res.body.message).toBe('Pitcher added to game');
        });
    });

    // ========================================================================
    // GET /bt-api/game-pitchers/game/:gameId
    // ========================================================================

    describe('GET /bt-api/game-pitchers/game/:gameId', () => {
        it('returns pitchers for a game', async () => {
            // Service does a JOIN and transforms rows, so mock the raw SQL row
            const mockRow = {
                id: 'gp1',
                game_id: 'g1',
                player_id: 'p1',
                pitching_order: 1,
                inning_entered: 1,
                inning_exited: null,
                created_at: '2026-03-01',
                first_name: 'Mike',
                last_name: 'Smith',
                jersey_number: '42',
                throws: 'R',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] } as any);

            const res = await getAgent().get('/bt-api/game-pitchers/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitchers).toHaveLength(1);
            expect(res.body.pitchers[0].player_id).toBe('p1');
            expect(res.body.pitchers[0].player.first_name).toBe('Mike');
        });
    });

    // ========================================================================
    // GET /bt-api/game-pitchers/game/:gameId/current
    // ========================================================================

    describe('GET /bt-api/game-pitchers/game/:gameId/current', () => {
        it('returns current pitcher', async () => {
            const mockRow = {
                id: 'gp1',
                game_id: 'g1',
                player_id: 'p1',
                pitching_order: 1,
                inning_entered: 1,
                inning_exited: null,
                created_at: '2026-03-01',
                first_name: 'Mike',
                last_name: 'Smith',
                jersey_number: '42',
                throws: 'R',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockRow] } as any);

            const res = await getAgent().get('/bt-api/game-pitchers/game/g1/current').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitcher.player_id).toBe('p1');
            expect(res.body.pitcher.player.first_name).toBe('Mike');
        });

        it('returns 404 when no active pitcher', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/game-pitchers/game/g1/current').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // POST /bt-api/game-pitchers/game/:gameId/change
    // ========================================================================

    describe('POST /bt-api/game-pitchers/game/:gameId/change', () => {
        it('returns 400 without required fields', async () => {
            const res = await getAgent()
                .post('/bt-api/game-pitchers/game/g1/change')
                .set('Authorization', authHeader())
                .send({ player_id: 'p1' }); // missing inning_entered

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('player_id and inning_entered are required');
        });

        it('changes the current pitcher', async () => {
            const currentPitcher = { id: 'gp1', player_id: 'p1', pitching_order: 1 };
            const newPitcher = { id: 'test-gp-id', player_id: 'p2', pitching_order: 2 };

            mockQuery
                .mockResolvedValueOnce({ rows: [currentPitcher] } as any) // getCurrentPitcher
                .mockResolvedValueOnce({ rows: [] } as any) // update old pitcher inning_exited
                .mockResolvedValueOnce({ rows: [newPitcher] } as any); // insert new pitcher (addPitcher)

            const res = await getAgent()
                .post('/bt-api/game-pitchers/game/g1/change')
                .set('Authorization', authHeader())
                .send({ player_id: 'p2', inning_entered: 3 });

            expect(res.status).toBe(201);
            expect(res.body.message).toBe('Pitcher changed');
            expect(res.body.pitcher).toBeDefined();
        });
    });
});
