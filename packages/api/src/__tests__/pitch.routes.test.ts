import { getAgent, authHeader, resetMocks, mockQuery, mockTransaction, setupMockTransaction } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-pitch-id') }));

// Mock scouting service
jest.mock('../services/scouting.service', () => ({
    __esModule: true,
    default: { markTendenciesStale: jest.fn() },
}));

describe('Pitch Routes - /bt-api/pitches', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/pitches
    // ========================================================================

    describe('POST /bt-api/pitches', () => {
        const fullPayload = {
            at_bat_id: 'ab-1',
            game_id: 'game-1',
            pitcher_id: 'pitcher-1',
            batter_id: 'batter-1',
            pitch_type: 'fastball',
            pitch_result: 'called_strike',
            balls_before: 1,
            strikes_before: 0,
            location_x: 0.5,
            location_y: 0.5,
            velocity: 92,
        };

        const mockReturnedPitch = { id: 'test-pitch-id', ...fullPayload, pitch_number: 1 };

        function setupPitchTransaction() {
            return setupMockTransaction([
                { rows: [{ max_pitch: 0 }] }, // get max pitch number
                { rows: [mockReturnedPitch] }, // insert pitch
                { rows: [] }, // update at_bats
                { rows: [] }, // check existing pitch type
                { rows: [] }, // insert pitch type
            ]);
        }

        it('returns 401 without auth token', async () => {
            const res = await getAgent().post('/bt-api/pitches').send(fullPayload);
            expect(res.status).toBe(401);
        });

        it('returns 403 with invalid token', async () => {
            const res = await getAgent().post('/bt-api/pitches').set('Authorization', 'Bearer invalid-token').send(fullPayload);
            expect(res.status).toBe(403);
        });

        it('logs a pitch with full payload (web-style)', async () => {
            setupPitchTransaction();
            const res = await getAgent().post('/bt-api/pitches').set('Authorization', authHeader()).send(fullPayload);

            expect(res.status).toBe(201);
            expect(res.body.pitch).toBeDefined();
            expect(res.body.message).toBe('Pitch logged successfully');
        });

        it('logs a pitch without balls_before/strikes_before (mobile-style, defaults to 0)', async () => {
            const mobilePayload = {
                at_bat_id: 'ab-1',
                game_id: 'game-1',
                pitcher_id: 'pitcher-1',
                opponent_batter_id: 'opp-1',
                pitch_type: 'curveball',
                pitch_result: 'ball',
                location_x: 0.3,
                location_y: 0.7,
            };
            const mockPitch = { id: 'test-pitch-id', ...mobilePayload, balls_before: 0, strikes_before: 0, pitch_number: 1 };

            const client = setupMockTransaction([
                { rows: [{ max_pitch: 0 }] },
                { rows: [mockPitch] },
                { rows: [] },
                { rows: [] },
                { rows: [] },
            ]);

            const res = await getAgent().post('/bt-api/pitches').set('Authorization', authHeader()).send(mobilePayload);

            expect(res.status).toBe(201);
            // Verify balls_before and strikes_before defaulted to 0 in the INSERT
            const insertCall = client.query.mock.calls[1];
            const insertParams = insertCall[1];
            // balls_before is param index 14, strikes_before is param index 15
            expect(insertParams[14]).toBe(0);
            expect(insertParams[15]).toBe(0);
        });

        it('returns 500 when required fields are missing', async () => {
            const res = await getAgent().post('/bt-api/pitches').set('Authorization', authHeader()).send({ at_bat_id: 'ab-1' });

            expect(res.status).toBe(500);
        });

        it('returns 500 when neither batter_id nor opponent_batter_id provided', async () => {
            const res = await getAgent().post('/bt-api/pitches').set('Authorization', authHeader()).send({
                at_bat_id: 'ab-1',
                game_id: 'game-1',
                pitcher_id: 'pitcher-1',
                pitch_type: 'fastball',
                pitch_result: 'ball',
            });

            expect(res.status).toBe(500);
        });

        it('accepts opponent_batter_id instead of batter_id', async () => {
            const payload = {
                ...fullPayload,
                batter_id: undefined,
                opponent_batter_id: 'opp-batter-1',
            };

            setupPitchTransaction();

            const res = await getAgent().post('/bt-api/pitches').set('Authorization', authHeader()).send(payload);

            expect(res.status).toBe(201);
        });
    });

    // ========================================================================
    // GET /bt-api/pitches/:id
    // ========================================================================

    describe('GET /bt-api/pitches/:id', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/pitches/pitch-1');
            expect(res.status).toBe(401);
        });

        it('returns a pitch by ID', async () => {
            const mockPitch = { id: 'pitch-1', pitch_type: 'fastball' };
            mockQuery.mockResolvedValueOnce({ rows: [mockPitch] } as any);

            const res = await getAgent().get('/bt-api/pitches/pitch-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitch).toEqual(mockPitch);
        });

        it('returns 404 when pitch not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitches/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // GET /bt-api/pitches/at-bat/:atBatId
    // ========================================================================

    describe('GET /bt-api/pitches/at-bat/:atBatId', () => {
        it('returns pitches for an at-bat', async () => {
            const mockPitches = [{ id: 'p1' }, { id: 'p2' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const res = await getAgent().get('/bt-api/pitches/at-bat/ab-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toEqual(mockPitches);
        });
    });

    // ========================================================================
    // GET /bt-api/pitches/game/:gameId
    // ========================================================================

    describe('GET /bt-api/pitches/game/:gameId', () => {
        it('returns pitches for a game', async () => {
            const mockPitches = [{ id: 'p1', batter_first_name: 'John' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const res = await getAgent().get('/bt-api/pitches/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toEqual(mockPitches);
        });
    });

    // ========================================================================
    // GET /bt-api/pitches/pitcher/:pitcherId
    // ========================================================================

    describe('GET /bt-api/pitches/pitcher/:pitcherId', () => {
        it('returns pitches for a pitcher', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1' }] } as any);

            const res = await getAgent().get('/bt-api/pitches/pitcher/pitcher-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toHaveLength(1);
        });

        it('filters by gameId query param', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitches/pitcher/pitcher-1?gameId=game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('game_id'), ['pitcher-1', 'game-1']);
        });
    });

    // ========================================================================
    // GET /bt-api/pitches/batter/:batterId
    // ========================================================================

    describe('GET /bt-api/pitches/batter/:batterId', () => {
        it('returns pitches for a batter', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1' }] } as any);

            const res = await getAgent().get('/bt-api/pitches/batter/batter-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toHaveLength(1);
        });
    });
});
