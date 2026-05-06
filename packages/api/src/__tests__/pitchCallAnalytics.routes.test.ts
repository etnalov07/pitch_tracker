import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

describe('PitchCallAnalytics Routes - /bt-api/pitch-call-analytics', () => {
    beforeEach(() => resetMocks());

    describe('GET /pitcher/:pitcherId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/pitch-call-analytics/pitcher/p1');
            expect(res.status).toBe(401);
        });

        it('returns 404 when there are no linked calls', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/pitcher/p1').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('computes per-pitcher accuracy', async () => {
            const rows = [
                {
                    called_type: 'FB',
                    called_zone: 'in',
                    actual_type: 'fastball',
                    actual_zone: 'in',
                    actual_target_zone: null,
                    balls_before: 0,
                    strikes_before: 0,
                    pitcher_name: 'Smith',
                },
                {
                    called_type: 'CB',
                    called_zone: 'low',
                    actual_type: 'curveball',
                    actual_zone: 'high',
                    actual_target_zone: null,
                    balls_before: 1,
                    strikes_before: 1,
                    pitcher_name: 'Smith',
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/pitcher/p1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.accuracy.total_linked).toBe(2);
            expect(res.body.accuracy.type_accuracy).toBe(100); // both pitch types match
            expect(res.body.accuracy.zone_accuracy).toBe(50); // only one zone matches
            expect(res.body.accuracy.pitcher_name).toBe('Smith');
        });

        it('passes the gameId query filter through', async () => {
            const rows = [
                {
                    called_type: 'FB',
                    called_zone: 'in',
                    actual_type: 'fastball',
                    actual_zone: 'in',
                    actual_target_zone: null,
                    balls_before: 0,
                    strikes_before: 0,
                    pitcher_name: 'Smith',
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows } as any);

            const res = await getAgent()
                .get('/bt-api/pitch-call-analytics/pitcher/p1?gameId=g1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            // Verify gameId was passed in the query params
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pc.game_id = $2'), ['p1', 'g1']);
        });
    });

    describe('GET /game/:gameId', () => {
        it('returns 404 when there are no calls for the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('aggregates results across calls', async () => {
            const rows = [
                {
                    result: 'strike',
                    pitch_type: 'FB',
                    actual_type: 'fastball',
                    zone: 'in',
                    actual_zone: 'in',
                    actual_target_zone: null,
                    pitcher_id: 'p1',
                    pitcher_name: 'Smith',
                },
                {
                    result: 'ball',
                    pitch_type: 'CB',
                    actual_type: 'curveball',
                    zone: 'low',
                    actual_zone: 'low',
                    actual_target_zone: null,
                    pitcher_id: 'p1',
                    pitcher_name: 'Smith',
                },
            ];
            mockQuery.mockResolvedValueOnce({ rows } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.analytics.total_calls).toBe(2);
            expect(res.body.analytics.total_linked).toBe(2);
            expect(res.body.analytics.results.strike).toBe(1);
            expect(res.body.analytics.results.ball).toBe(1);
            expect(res.body.analytics.by_pitcher).toHaveLength(1);
        });
    });

    describe('GET /team/:teamId/season', () => {
        it('returns 404 when there are no team calls', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        games_with_calls: '0',
                        total_calls: '0',
                        total_linked: '0',
                        strikes: '0',
                        balls: '0',
                        fouls: '0',
                        in_plays: '0',
                    },
                ],
            } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/team/t1/season').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('returns season analytics with type/zone accuracy', async () => {
            const aggregate = [
                {
                    games_with_calls: '5',
                    total_calls: '120',
                    total_linked: '90',
                    strikes: '60',
                    balls: '40',
                    fouls: '15',
                    in_plays: '5',
                },
            ];
            const linked = [
                { called_type: 'FB', called_zone: 'in', actual_type: 'fastball', actual_zone: 'in', actual_target_zone: null },
                { called_type: 'CB', called_zone: 'low', actual_type: 'slider', actual_zone: 'low', actual_target_zone: null },
            ];
            mockQuery.mockResolvedValueOnce({ rows: aggregate } as any).mockResolvedValueOnce({ rows: linked } as any);

            const res = await getAgent().get('/bt-api/pitch-call-analytics/team/t1/season').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.analytics.team_id).toBe('t1');
            expect(res.body.analytics.games_with_calls).toBe(5);
            expect(res.body.analytics.results.strike).toBe(60);
            expect(res.body.analytics.type_accuracy).toBe(50); // 1 of 2 matches
        });
    });
});
