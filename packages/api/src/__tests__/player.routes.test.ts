import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-player-id') }));

describe('Player Routes - /bt-api/players', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/players
    // ========================================================================

    describe('POST /bt-api/players', () => {
        const playerPayload = {
            team_id: 'team-1',
            first_name: 'Mike',
            last_name: 'Smith',
            jersey_number: '42',
            primary_position: 'pitcher',
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/players').send(playerPayload);
            expect(res.status).toBe(401);
        });

        it('creates a player', async () => {
            const mockPlayer = { id: 'test-player-id', ...playerPayload };
            mockQuery.mockResolvedValueOnce({ rows: [mockPlayer] } as any);

            const res = await getAgent().post('/bt-api/players').set('Authorization', authHeader()).send(playerPayload);

            expect(res.status).toBe(201);
            expect(res.body.player).toBeDefined();
            expect(res.body.message).toBe('Player created successfully');
        });

        it('returns 500 when required fields missing', async () => {
            const res = await getAgent()
                .post('/bt-api/players')
                .set('Authorization', authHeader())
                .send({ team_id: 'team-1', first_name: 'Mike' });

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // GET /bt-api/players/team/:team_id
    // ========================================================================

    describe('GET /bt-api/players/team/:team_id', () => {
        it('returns players for a team', async () => {
            const mockPlayers = [
                { id: 'p1', first_name: 'Mike' },
                { id: 'p2', first_name: 'John' },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockPlayers } as any);

            const res = await getAgent().get('/bt-api/players/team/team-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.players).toEqual(mockPlayers);
        });
    });

    // ========================================================================
    // GET /bt-api/players/pitchers/team/:team_id
    // ========================================================================

    describe('GET /bt-api/players/pitchers/team/:team_id', () => {
        it('returns pitchers for a team', async () => {
            const mockPitchers = [{ id: 'p1', primary_position: 'pitcher' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPitchers } as any);

            const res = await getAgent().get('/bt-api/players/pitchers/team/team-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitchers).toEqual(mockPitchers);
        });
    });

    // ========================================================================
    // GET /bt-api/players/:id
    // ========================================================================

    describe('GET /bt-api/players/:id', () => {
        it('returns a player by ID', async () => {
            const mockPlayer = { id: 'p1', first_name: 'Mike' };
            mockQuery.mockResolvedValueOnce({ rows: [mockPlayer] } as any);

            const res = await getAgent().get('/bt-api/players/p1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.player).toEqual(mockPlayer);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/players/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // PUT /bt-api/players/:id
    // ========================================================================

    describe('PUT /bt-api/players/:id', () => {
        it('updates a player', async () => {
            const existingPlayer = { id: 'p1', first_name: 'Mike', last_name: 'Smith' };
            const updatedPlayer = { id: 'p1', first_name: 'Michael', last_name: 'Smith' };
            mockQuery
                .mockResolvedValueOnce({ rows: [existingPlayer] } as any) // getPlayerById
                .mockResolvedValueOnce({ rows: [updatedPlayer] } as any); // update

            const res = await getAgent()
                .put('/bt-api/players/p1')
                .set('Authorization', authHeader())
                .send({ first_name: 'Michael' });

            expect(res.status).toBe(200);
            expect(res.body.player.first_name).toBe('Michael');
        });
    });

    // ========================================================================
    // DELETE /bt-api/players/:id
    // ========================================================================

    describe('DELETE /bt-api/players/:id', () => {
        it('deletes a player', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().delete('/bt-api/players/p1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Player deleted successfully');
        });
    });

    // ========================================================================
    // GET/PUT /bt-api/players/:id/pitch-types
    // ========================================================================

    describe('GET /bt-api/players/:id/pitch-types', () => {
        it('returns pitch types for a pitcher', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ pitch_type: 'fastball' }, { pitch_type: 'curveball' }],
            } as any);

            const res = await getAgent().get('/bt-api/players/p1/pitch-types').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitch_types).toEqual(['fastball', 'curveball']);
        });
    });

    describe('PUT /bt-api/players/:id/pitch-types', () => {
        it('sets pitch types', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // delete existing
                .mockResolvedValueOnce({ rows: [] } as any) // insert fastball
                .mockResolvedValueOnce({ rows: [] } as any); // insert curveball

            const res = await getAgent()
                .put('/bt-api/players/p1/pitch-types')
                .set('Authorization', authHeader())
                .send({ pitch_types: ['fastball', 'curveball'] });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Pitch types updated');
            expect(res.body.pitch_types).toEqual(['fastball', 'curveball']);
        });

        it('returns 400 when pitch_types is not an array', async () => {
            const res = await getAgent()
                .put('/bt-api/players/p1/pitch-types')
                .set('Authorization', authHeader())
                .send({ pitch_types: 'fastball' });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('pitch_types must be an array');
        });
    });
});
