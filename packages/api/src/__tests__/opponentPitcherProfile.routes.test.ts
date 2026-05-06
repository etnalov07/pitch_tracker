import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-tendency-id') }));

describe('OpponentPitcherProfile Routes - /bt-api/opponent-pitcher-profiles', () => {
    beforeEach(() => resetMocks());

    describe('GET /opponent-team/:opponentTeamId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/opponent-pitcher-profiles/opponent-team/ot1');
            expect(res.status).toBe(401);
        });

        it('lists pitcher profiles for the opponent team', async () => {
            const mockProfiles = [{ id: 'pp1', pitcher_name: 'Smith' }];
            mockQuery.mockResolvedValueOnce({ rows: mockProfiles } as any);

            const res = await getAgent()
                .get('/bt-api/opponent-pitcher-profiles/opponent-team/ot1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitchers).toEqual(mockProfiles);
        });
    });

    describe('GET /:id', () => {
        it('returns the profile + tendencies', async () => {
            const profile = { id: 'pp1', pitcher_name: 'Smith' };
            const tendencies = { profile_id: 'pp1', total_pitches: 100, strike_percentage: 60 };
            mockQuery.mockResolvedValueOnce({ rows: [profile] } as any).mockResolvedValueOnce({ rows: [tendencies] } as any);

            const res = await getAgent().get('/bt-api/opponent-pitcher-profiles/pp1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitcher).toEqual(profile);
            expect(res.body.tendencies).toEqual(tendencies);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/opponent-pitcher-profiles/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('POST /:id/recalculate', () => {
        it('returns zeroed tendencies when there are no pitches', async () => {
            const tendencyRow = {
                profile_id: 'pp1',
                total_pitches: 0,
                total_at_bats: 0,
                strike_percentage: null,
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // pitches
                .mockResolvedValueOnce({ rows: [] } as any); // at-bats
            setupMockTransaction([{ rows: [tendencyRow] }]); // upsert

            const res = await getAgent()
                .post('/bt-api/opponent-pitcher-profiles/pp1/recalculate')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.tendencies.total_pitches).toBe(0);
        });

        it('aggregates a populated pitch sample', async () => {
            const pitches = [
                { pitch_type: 'fastball', pitch_result: 'called_strike', balls_before: 0, strikes_before: 0 },
                { pitch_type: 'fastball', pitch_result: 'ball', balls_before: 1, strikes_before: 0 },
                { pitch_type: 'curveball', pitch_result: 'swinging_strike', balls_before: 1, strikes_before: 2 },
            ];
            const atBats = [{ id: 'ab1' }, { id: 'ab2' }];
            const tendencyRow = {
                profile_id: 'pp1',
                total_pitches: 3,
                total_at_bats: 2,
                strike_percentage: 66.7,
                fastball_pct: 66.7,
            };
            mockQuery.mockResolvedValueOnce({ rows: pitches } as any).mockResolvedValueOnce({ rows: atBats } as any);
            setupMockTransaction([{ rows: [tendencyRow] }]);

            const res = await getAgent()
                .post('/bt-api/opponent-pitcher-profiles/pp1/recalculate')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.tendencies.total_pitches).toBe(3);
        });
    });

    describe('POST /:id/link-opposing-pitcher', () => {
        it('rejects missing opposing_pitcher_id', async () => {
            const res = await getAgent()
                .post('/bt-api/opponent-pitcher-profiles/pp1/link-opposing-pitcher')
                .set('Authorization', authHeader())
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('opposing_pitcher_id is required');
        });

        it('links the opposing pitcher to the profile', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .post('/bt-api/opponent-pitcher-profiles/pp1/link-opposing-pitcher')
                .set('Authorization', authHeader())
                .send({ opposing_pitcher_id: 'op1' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Linked');
        });
    });
});
