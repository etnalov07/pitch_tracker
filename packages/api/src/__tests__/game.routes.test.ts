import { getAgent, authHeader, resetMocks, mockQuery, mockTransaction } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-game-id') }));

describe('Game Routes - /bt-api/games', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/games
    // ========================================================================

    describe('POST /bt-api/games', () => {
        const gamePayload = {
            home_team_id: 'team-1',
            opponent_name: 'Rival Team',
            game_date: '2026-03-01',
            location: 'Home Field',
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/games').send(gamePayload);
            expect(res.status).toBe(401);
        });

        it('creates a game successfully', async () => {
            const mockGame = { id: 'test-game-id', ...gamePayload, status: 'scheduled' };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent().post('/bt-api/games').set('Authorization', authHeader()).send(gamePayload);

            expect(res.status).toBe(201);
            expect(res.body.game).toBeDefined();
            expect(res.body.message).toBe('Game created successfully');
        });

        it('returns 500 when home_team_id missing', async () => {
            const res = await getAgent().post('/bt-api/games').set('Authorization', authHeader()).send({ opponent_name: 'Team B' });

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // GET /bt-api/games/my-games
    // ========================================================================

    describe('GET /bt-api/games/my-games', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/games/my-games');
            expect(res.status).toBe(401);
        });

        it('returns user games', async () => {
            const mockGames = [{ id: 'g1', opponent_name: 'Team A' }];
            mockQuery.mockResolvedValueOnce({ rows: mockGames } as any);

            const res = await getAgent().get('/bt-api/games/my-games').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.games).toEqual(mockGames);
        });
    });

    // ========================================================================
    // GET /bt-api/games/:id
    // ========================================================================

    describe('GET /bt-api/games/:id', () => {
        it('returns a game by ID', async () => {
            const mockGame = { id: 'g1', opponent_name: 'Team A' };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent().get('/bt-api/games/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.game).toEqual(mockGame);
        });

        it('returns 404 when game not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/games/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // POST /bt-api/games/:id/start
    // ========================================================================

    describe('POST /bt-api/games/:id/start', () => {
        it('starts a game', async () => {
            const mockGame = { id: 'g1', status: 'in_progress', is_home_game: true, home_team_id: 'team-1' };
            mockTransaction.mockImplementation(async (cb) => {
                const client = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [mockGame] }) // update game status
                        .mockResolvedValueOnce({ rows: [] }), // create first inning
                };
                return cb(client as any);
            });

            const res = await getAgent().post('/bt-api/games/g1/start').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Game started');
        });
    });

    // ========================================================================
    // PUT /bt-api/games/:id/score
    // ========================================================================

    describe('PUT /bt-api/games/:id/score', () => {
        it('updates game score', async () => {
            const mockGame = { id: 'g1', home_score: 3, away_score: 1 };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent()
                .put('/bt-api/games/g1/score')
                .set('Authorization', authHeader())
                .send({ home_score: 3, away_score: 1 });

            expect(res.status).toBe(200);
            expect(res.body.game.home_score).toBe(3);
        });
    });

    // ========================================================================
    // POST /bt-api/games/:id/advance-inning
    // ========================================================================

    describe('POST /bt-api/games/:id/advance-inning', () => {
        it('advances the inning', async () => {
            // advanceInning first calls getGameById (mockQuery), then does a transaction
            const mockGame = {
                id: 'g1',
                current_inning: 1,
                inning_half: 'top',
                is_home_game: true,
                home_team_id: 'team-1',
            };
            const updatedGame = { ...mockGame, inning_half: 'bottom' };

            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any); // getGameById

            mockTransaction.mockImplementation(async (cb) => {
                const client = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [updatedGame] }) // update game
                        .mockResolvedValueOnce({ rows: [] }), // insert inning
                };
                return cb(client as any);
            });

            const res = await getAgent().post('/bt-api/games/g1/advance-inning').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Inning advanced');
        });
    });

    // ========================================================================
    // POST /bt-api/games/:id/end
    // ========================================================================

    describe('POST /bt-api/games/:id/end', () => {
        it('ends a game', async () => {
            const mockGame = { id: 'g1', status: 'completed' };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent().post('/bt-api/games/g1/end').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Game ended');
        });
    });

    // ========================================================================
    // PUT/GET /bt-api/games/:id/base-runners
    // ========================================================================

    describe('PUT /bt-api/games/:id/base-runners', () => {
        it('returns 400 without base_runners', async () => {
            const res = await getAgent().put('/bt-api/games/g1/base-runners').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('base_runners is required');
        });

        it('updates base runners', async () => {
            const baseRunners = { first: 'player-1', second: null, third: null };
            const mockGame = { id: 'g1', base_runners: baseRunners };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent()
                .put('/bt-api/games/g1/base-runners')
                .set('Authorization', authHeader())
                .send({ base_runners: baseRunners });

            expect(res.status).toBe(200);
            expect(res.body.game.base_runners).toEqual(baseRunners);
        });
    });

    describe('GET /bt-api/games/:id/base-runners', () => {
        it('gets base runners', async () => {
            const baseRunners = { first: false, second: false, third: false };
            mockQuery.mockResolvedValueOnce({ rows: [{ base_runners: baseRunners }] } as any);

            const res = await getAgent().get('/bt-api/games/g1/base-runners').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.base_runners).toBeDefined();
        });
    });

    // ========================================================================
    // POST /bt-api/games/:id/toggle-home-away
    // ========================================================================

    describe('POST /bt-api/games/:id/toggle-home-away', () => {
        it('toggles home/away', async () => {
            const mockGame = { id: 'g1', is_home: false };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const res = await getAgent().post('/bt-api/games/g1/toggle-home-away').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Home/away swapped');
        });
    });
});
