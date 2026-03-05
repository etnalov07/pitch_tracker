import { getAgent, authHeader, resetMocks, mockQuery, mockTransaction } from './helpers/setup';

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-bp-id') }));

describe('Bullpen Routes - /bt-api/bullpen', () => {
    beforeEach(() => resetMocks());

    // ========================================================================
    // POST /bt-api/bullpen/sessions
    // ========================================================================

    describe('POST /bt-api/bullpen/sessions', () => {
        const sessionPayload = {
            team_id: 'team-1',
            pitcher_id: 'pitcher-1',
            intensity: 'medium',
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/bullpen/sessions').send(sessionPayload);
            expect(res.status).toBe(401);
        });

        it('creates a bullpen session', async () => {
            const mockSession = { id: 'test-bp-id', ...sessionPayload, status: 'active', created_by: 'test-user-id' };
            mockQuery.mockResolvedValueOnce({ rows: [mockSession] } as any);

            const res = await getAgent().post('/bt-api/bullpen/sessions').set('Authorization', authHeader()).send(sessionPayload);

            expect(res.status).toBe(201);
            expect(res.body.session).toBeDefined();
            expect(res.body.message).toBe('Bullpen session created');
        });

        it('returns 500 when required fields missing', async () => {
            const res = await getAgent()
                .post('/bt-api/bullpen/sessions')
                .set('Authorization', authHeader())
                .send({ team_id: 'team-1' }); // missing pitcher_id

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // GET /bt-api/bullpen/sessions/:id
    // ========================================================================

    describe('GET /bt-api/bullpen/sessions/:id', () => {
        it('returns a session by ID', async () => {
            const mockSession = { id: 'bp-1', team_id: 'team-1', status: 'active' };
            mockQuery.mockResolvedValueOnce({ rows: [mockSession] } as any);

            const res = await getAgent().get('/bt-api/bullpen/sessions/bp-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.session).toEqual(mockSession);
        });

        it('returns 404 when session not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/bullpen/sessions/nonexistent').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // GET /bt-api/bullpen/sessions/team/:teamId
    // ========================================================================

    describe('GET /bt-api/bullpen/sessions/team/:teamId', () => {
        it('returns sessions for a team', async () => {
            const mockSessions = [{ id: 'bp-1' }, { id: 'bp-2' }];
            mockQuery.mockResolvedValueOnce({ rows: mockSessions } as any);

            const res = await getAgent().get('/bt-api/bullpen/sessions/team/team-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.sessions).toEqual(mockSessions);
        });
    });

    // ========================================================================
    // POST /bt-api/bullpen/pitches
    // ========================================================================

    describe('POST /bt-api/bullpen/pitches', () => {
        const pitchPayload = {
            session_id: 'bp-1',
            pitch_type: 'fastball',
            velocity: 91,
            target_x: 0.5,
            target_y: 0.5,
            actual_x: 0.4,
            actual_y: 0.6,
            result: 'called_strike',
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/bullpen/pitches').send(pitchPayload);
            expect(res.status).toBe(401);
        });

        it('logs a bullpen pitch', async () => {
            const mockPitch = { id: 'test-bp-id', ...pitchPayload, pitch_number: 1 };
            mockTransaction.mockImplementation(async (cb) => {
                const client = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [{ max_pitch: 0 }] }) // get max pitch number
                        .mockResolvedValueOnce({ rows: [mockPitch] }) // insert pitch
                        .mockResolvedValueOnce({ rows: [{ pitcher_id: 'pitcher-1' }] }) // get session pitcher_id
                        .mockResolvedValueOnce({ rows: [] }) // check existing pitch type
                        .mockResolvedValueOnce({ rows: [] }), // insert pitch type
                };
                return cb(client as any);
            });

            const res = await getAgent().post('/bt-api/bullpen/pitches').set('Authorization', authHeader()).send(pitchPayload);

            expect(res.status).toBe(201);
            expect(res.body.pitch).toBeDefined();
            expect(res.body.message).toBe('Bullpen pitch logged');
        });

        it('returns 500 when session_id missing', async () => {
            const res = await getAgent()
                .post('/bt-api/bullpen/pitches')
                .set('Authorization', authHeader())
                .send({ pitch_type: 'fastball' }); // missing session_id

            expect(res.status).toBe(500);
        });
    });

    // ========================================================================
    // GET /bt-api/bullpen/pitches/session/:sessionId
    // ========================================================================

    describe('GET /bt-api/bullpen/pitches/session/:sessionId', () => {
        it('returns pitches for a session', async () => {
            const mockPitches = [{ id: 'p1', pitch_type: 'fastball' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const res = await getAgent().get('/bt-api/bullpen/pitches/session/bp-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toEqual(mockPitches);
        });
    });

    // ========================================================================
    // POST /bt-api/bullpen/sessions/:id/end
    // ========================================================================

    describe('POST /bt-api/bullpen/sessions/:id/end', () => {
        it('ends a bullpen session', async () => {
            const mockSession = { id: 'bp-1', status: 'completed' };
            mockQuery.mockResolvedValueOnce({ rows: [mockSession] } as any);

            const res = await getAgent()
                .post('/bt-api/bullpen/sessions/bp-1/end')
                .set('Authorization', authHeader())
                .send({ notes: 'Good session' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Session ended');
            expect(res.body.session.status).toBe('completed');
        });
    });

    // ========================================================================
    // GET /bt-api/bullpen/sessions/:id/summary
    // ========================================================================

    describe('GET /bt-api/bullpen/sessions/:id/summary', () => {
        it('returns session summary', async () => {
            // getSessionSummary calls query twice: session + pitches
            const mockSession = { id: 'bp-1', team_id: 'team-1' };
            const mockPitches = [{ pitch_type: 'fastball', result: 'called_strike' }];
            mockQuery
                .mockResolvedValueOnce({ rows: [mockSession] } as any) // session
                .mockResolvedValueOnce({ rows: mockPitches } as any); // pitches

            const res = await getAgent().get('/bt-api/bullpen/sessions/bp-1/summary').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summary).toBeDefined();
        });

        it('returns 404 when session not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/bullpen/sessions/nonexistent/summary').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // ========================================================================
    // Plan endpoints
    // ========================================================================

    describe('POST /bt-api/bullpen/plans', () => {
        it('creates a training plan', async () => {
            const planPayload = { team_id: 'team-1', name: 'Pre-game Routine', max_pitches: 30 };
            const mockPlan = { id: 'test-bp-id', ...planPayload, created_by: 'test-user-id', pitches: [], assignments: [] };

            mockTransaction.mockImplementation(async (cb) => {
                const client = {
                    query: jest.fn().mockResolvedValueOnce({ rows: [mockPlan] }),
                };
                return cb(client as any);
            });

            const res = await getAgent().post('/bt-api/bullpen/plans').set('Authorization', authHeader()).send(planPayload);

            expect(res.status).toBe(201);
            expect(res.body.plan).toBeDefined();
        });
    });

    describe('GET /bt-api/bullpen/plans/team/:teamId', () => {
        it('returns plans for a team', async () => {
            const mockPlans = [{ id: 'plan-1', name: 'Routine' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPlans } as any);

            const res = await getAgent().get('/bt-api/bullpen/plans/team/team-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.plans).toEqual(mockPlans);
        });
    });
});
