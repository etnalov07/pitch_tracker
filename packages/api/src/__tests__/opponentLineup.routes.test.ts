import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-ol-id') }));

describe('OpponentLineup Routes - /bt-api/opponent-lineup', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/opponent-lineup/game/:gameId
    // ========================================================================

    describe('POST /bt-api/opponent-lineup/game/:gameId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent()
                .post('/bt-api/opponent-lineup/game/g1')
                .send({ player_name: 'John Doe', batting_order: 1 });
            expect(res.status).toBe(401);
        });

        it('adds a player to opponent lineup', async () => {
            const mockPlayer = { id: 'test-ol-id', player_name: 'John Doe', batting_order: 1, game_id: 'g1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ lineup_size: 9 }] } as any) // getGameLineupSize
                .mockResolvedValueOnce({ rows: [] } as any) // existence check
                .mockResolvedValueOnce({ rows: [mockPlayer] } as any); // INSERT

            const res = await getAgent()
                .post('/bt-api/opponent-lineup/game/g1')
                .set('Authorization', authHeader())
                .send({ player_name: 'John Doe', batting_order: 1, position: 'SS', bats: 'R' });

            expect(res.status).toBe(201);
            expect(res.body.player).toBeDefined();
        });

        it('returns 500 when player_name missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opponent-lineup/game/g1')
                .set('Authorization', authHeader())
                .send({ batting_order: 1 });

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // POST /bt-api/opponent-lineup/game/:gameId/bulk
    // ========================================================================

    describe('POST /bt-api/opponent-lineup/game/:gameId/bulk', () => {
        it('returns 400 when players is not an array', async () => {
            const res = await getAgent()
                .post('/bt-api/opponent-lineup/game/g1/bulk')
                .set('Authorization', authHeader())
                .send({ players: 'not-an-array' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('players must be an array');
        });

        it('creates a full lineup', async () => {
            const players = [
                { player_name: 'Player 1', batting_order: 1, position: 'CF' },
                { player_name: 'Player 2', batting_order: 2, position: 'SS' },
            ];

            // Per player: getGameLineupSize → existence check → INSERT → _maybeAutoLinkBatter SELECT game
            // The autoLink fire-and-forget races with p2; give it a null-opponent result so it exits early
            mockQuery
                .mockResolvedValueOnce({ rows: [{ lineup_size: 9 }] } as any) // p1 getGameLineupSize
                .mockResolvedValueOnce({ rows: [] } as any) // p1 existence check
                .mockResolvedValueOnce({ rows: [{ id: 'ol-0', ...players[0], game_id: 'g1' }] } as any) // p1 INSERT
                .mockResolvedValueOnce({ rows: [{ opponent_team_id: null }] } as any) // p1 autoLink (exits early)
                .mockResolvedValueOnce({ rows: [{ lineup_size: 9 }] } as any) // p2 getGameLineupSize
                .mockResolvedValueOnce({ rows: [] } as any) // p2 existence check
                .mockResolvedValueOnce({ rows: [{ id: 'ol-1', ...players[1], game_id: 'g1' }] } as any); // p2 INSERT

            const res = await getAgent()
                .post('/bt-api/opponent-lineup/game/g1/bulk')
                .set('Authorization', authHeader())
                .send({ players });

            expect(res.status).toBe(201);
            expect(res.body.lineup).toBeDefined();
            expect(res.body.lineup).toHaveLength(2);
        });
    });

    // ========================================================================
    // GET /bt-api/opponent-lineup/game/:gameId
    // ========================================================================

    describe('GET /bt-api/opponent-lineup/game/:gameId', () => {
        it('returns lineup for a game', async () => {
            const mockLineup = [
                { id: 'ol-1', player_name: 'Player 1', batting_order: 1 },
                { id: 'ol-2', player_name: 'Player 2', batting_order: 2 },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockLineup } as any);

            const res = await getAgent().get('/bt-api/opponent-lineup/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual(mockLineup);
        });
    });

    // ========================================================================
    // GET /bt-api/opponent-lineup/game/:gameId/active
    // ========================================================================

    describe('GET /bt-api/opponent-lineup/game/:gameId/active', () => {
        it('returns active lineup', async () => {
            const mockLineup = [{ id: 'ol-1', player_name: 'Player 1', is_active: true }];
            mockQuery.mockResolvedValueOnce({ rows: mockLineup } as any);

            const res = await getAgent().get('/bt-api/opponent-lineup/game/g1/active').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual(mockLineup);
        });
    });

    // ========================================================================
    // GET /bt-api/opponent-lineup/player/:playerId
    // ========================================================================

    describe('GET /bt-api/opponent-lineup/player/:playerId', () => {
        it('returns a player', async () => {
            const mockPlayer = { id: 'ol-1', player_name: 'John Doe' };
            mockQuery.mockResolvedValueOnce({ rows: [mockPlayer] } as any);

            const res = await getAgent().get('/bt-api/opponent-lineup/player/ol-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.player).toEqual(mockPlayer);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/opponent-lineup/player/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // GET /bt-api/opponent-lineup/game/:gameId/last-vs-opponent
    // ========================================================================

    describe('GET /bt-api/opponent-lineup/game/:gameId/last-vs-opponent', () => {
        it('returns the most recent prior lineup vs the same opponent team', async () => {
            const priorStarters = [
                { id: 'ol-9', game_id: 'g0', player_name: 'Leadoff', batting_order: 1, position: 'CF', bats: 'R' },
                { id: 'ol-10', game_id: 'g0', player_name: 'Two Hole', batting_order: 2, position: 'SS', bats: 'L' },
            ];
            mockQuery
                .mockResolvedValueOnce({
                    rows: [{ opponent_team_id: 'opp-1', game_date: '2026-05-04', home_team_id: 't1' }],
                } as any) // current game lookup
                .mockResolvedValueOnce({ rows: [{ id: 'g0' }] } as any) // prior game lookup
                .mockResolvedValueOnce({ rows: priorStarters } as any); // prior starters

            const res = await getAgent().get('/bt-api/opponent-lineup/game/g1/last-vs-opponent').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual(priorStarters);
        });

        it('returns empty when current game has no opponent_team_id', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ opponent_team_id: null, game_date: '2026-05-04', home_team_id: 't1' }],
            } as any);

            const res = await getAgent().get('/bt-api/opponent-lineup/game/g1/last-vs-opponent').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual([]);
        });

        it('returns empty when no prior game exists', async () => {
            mockQuery
                .mockResolvedValueOnce({
                    rows: [{ opponent_team_id: 'opp-1', game_date: '2026-05-04', home_team_id: 't1' }],
                } as any)
                .mockResolvedValueOnce({ rows: [] } as any); // no prior game

            const res = await getAgent().get('/bt-api/opponent-lineup/game/g1/last-vs-opponent').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual([]);
        });
    });

    // ========================================================================
    // POST /bt-api/opponent-lineup/player/:playerId/substitute
    // ========================================================================

    describe('POST /bt-api/opponent-lineup/player/:playerId/substitute', () => {
        it('returns 400 when required fields missing', async () => {
            const res = await getAgent()
                .post('/bt-api/opponent-lineup/player/ol-1/substitute')
                .set('Authorization', authHeader())
                .send({ player_name: 'New Player' }); // missing inning_entered

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('player_name and inning_entered are required');
        });

        it('substitutes a player', async () => {
            const original = { id: 'ol-1', game_id: 'g1', batting_order: 3, position: 'SS' };
            const newPlayer = { id: 'test-ol-id', player_name: 'Sub Player', game_id: 'g1', batting_order: 3 };

            mockQuery
                .mockResolvedValueOnce({ rows: [original] } as any) // getPlayerById (original)
                .mockResolvedValueOnce({ rows: [newPlayer] } as any) // insert new player
                .mockResolvedValueOnce({ rows: [] } as any); // update original replaced_by_id

            const res = await getAgent()
                .post('/bt-api/opponent-lineup/player/ol-1/substitute')
                .set('Authorization', authHeader())
                .send({ player_name: 'Sub Player', inning_entered: 5, position: 'RF', bats: 'L' });

            expect(res.status).toBe(201);
            expect(res.body.player).toBeDefined();
        });
    });
});
