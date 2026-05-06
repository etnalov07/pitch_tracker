import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-sr-id') }));

describe('ScoutingReport Routes - /bt-api/scouting-reports', () => {
    beforeEach(() => resetMocks());

    describe('GET /team/:teamId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/scouting-reports/team/t1');
            expect(res.status).toBe(401);
        });

        it('lists scouting reports for a team', async () => {
            const reports = [{ id: 'sr1', opponent_name: 'Tigers' }];
            mockQuery.mockResolvedValueOnce({ rows: reports } as any);

            const res = await getAgent().get('/bt-api/scouting-reports/team/t1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.reports).toEqual(reports);
        });
    });

    describe('GET /:id', () => {
        it('returns the report with batters', async () => {
            const report = { id: 'sr1', opponent_name: 'Tigers' };
            const batters = [{ id: 'b1', player_name: 'Smith' }];
            mockQuery
                .mockResolvedValueOnce({ rows: [report] } as any) // SELECT report
                .mockResolvedValueOnce({ rows: batters } as any); // SELECT batters

            const res = await getAgent().get('/bt-api/scouting-reports/sr1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.report.batters).toEqual(batters);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/scouting-reports/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('GET /game/:gameId', () => {
        it('returns null when no report exists for the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/scouting-reports/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.report).toBeNull();
        });

        it('returns the linked report with batters', async () => {
            const report = { id: 'sr1', opponent_name: 'Tigers' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'sr1' }] } as any) // game lookup
                .mockResolvedValueOnce({ rows: [report] } as any) // getById report
                .mockResolvedValueOnce({ rows: [] } as any); // batters

            const res = await getAgent().get('/bt-api/scouting-reports/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.report.opponent_name).toBe('Tigers');
        });
    });

    describe('POST /team/:teamId', () => {
        it('returns 400 when opponent_name is missing', async () => {
            const res = await getAgent().post('/bt-api/scouting-reports/team/t1').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/opponent_name/);
        });

        it('creates a report', async () => {
            const created = { id: 'test-sr-id', opponent_name: 'Tigers', team_id: 't1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // INSERT
                .mockResolvedValueOnce({ rows: [created] } as any); // SELECT after insert

            const res = await getAgent()
                .post('/bt-api/scouting-reports/team/t1')
                .set('Authorization', authHeader())
                .send({ opponent_name: 'Tigers', notes: 'fast pitcher' });

            expect(res.status).toBe(201);
            expect(res.body.report.id).toBe('test-sr-id');
        });
    });

    describe('PATCH /:id', () => {
        it('updates a report', async () => {
            const updated = { id: 'sr1', opponent_name: 'Tigers Renamed' };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // UPDATE
                .mockResolvedValueOnce({ rows: [updated] } as any); // SELECT

            const res = await getAgent()
                .patch('/bt-api/scouting-reports/sr1')
                .set('Authorization', authHeader())
                .send({ opponent_name: 'Tigers Renamed' });

            expect(res.status).toBe(200);
            expect(res.body.report.opponent_name).toBe('Tigers Renamed');
        });

        it('coalesces nullish fields and returns the updated record on empty body', async () => {
            // Empty body still produces field updates (game_id/notes/etc. coalesce undefined → null),
            // so the service runs UPDATE then SELECT.
            const updated = { id: 'sr1', opponent_name: 'Tigers' };
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // UPDATE
                .mockResolvedValueOnce({ rows: [updated] } as any); // SELECT after update

            const res = await getAgent().patch('/bt-api/scouting-reports/sr1').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(200);
            expect(res.body.report).toEqual(updated);
        });

        it('returns 404 when report id is unknown', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // UPDATE (no rows touched)
                .mockResolvedValueOnce({ rows: [] } as any); // SELECT empty

            const res = await getAgent()
                .patch('/bt-api/scouting-reports/missing')
                .set('Authorization', authHeader())
                .send({ opponent_name: 'X' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /:id', () => {
        it('deletes a report', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().delete('/bt-api/scouting-reports/sr1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Scouting report deleted');
        });
    });

    describe('POST /:id/batters', () => {
        it('returns 400 when player_name is missing', async () => {
            const res = await getAgent().post('/bt-api/scouting-reports/sr1/batters').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/player_name/);
        });

        it('adds a batter', async () => {
            const inserted = { id: 'b1', report_id: 'sr1', player_name: 'Smith' };
            mockQuery.mockResolvedValueOnce({ rows: [inserted] } as any);

            const res = await getAgent()
                .post('/bt-api/scouting-reports/sr1/batters')
                .set('Authorization', authHeader())
                .send({ player_name: 'Smith', batting_order: 3 });

            expect(res.status).toBe(201);
            expect(res.body.batter.player_name).toBe('Smith');
        });
    });

    describe('PATCH /batters/:batterId', () => {
        it('updates a batter', async () => {
            const updated = { id: 'b1', player_name: 'Smith', notes: 'fastball low' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

            const res = await getAgent()
                .patch('/bt-api/scouting-reports/batters/b1')
                .set('Authorization', authHeader())
                .send({ notes: 'fastball low' });

            expect(res.status).toBe(200);
            expect(res.body.batter.notes).toBe('fastball low');
        });

        it('returns 404 when batter is missing', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .patch('/bt-api/scouting-reports/batters/missing')
                .set('Authorization', authHeader())
                .send({ notes: 'x' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /batters/:batterId', () => {
        it('deletes a batter', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().delete('/bt-api/scouting-reports/batters/b1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Scouting batter deleted');
        });
    });

    describe('POST /:id/import-lineup/:sourceGameId', () => {
        it('imports batters from a prior game lineup', async () => {
            const lineup = [
                { player_name: 'Smith', batting_order: 1, bats: 'R' },
                { player_name: 'Jones', batting_order: 2, bats: 'L' },
            ];
            const inserted = [
                { id: 'b1', player_name: 'Smith' },
                { id: 'b2', player_name: 'Jones' },
            ];
            setupMockTransaction([
                { rows: lineup }, // SELECT opponent_lineup
                { rows: [inserted[0]] }, // INSERT 1
                { rows: [inserted[1]] }, // INSERT 2
            ]);

            const res = await getAgent()
                .post('/bt-api/scouting-reports/sr1/import-lineup/sourceGame1')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.batters).toHaveLength(2);
        });
    });

    describe('GET /game/:gameId/live-match', () => {
        it('returns null when no scouting report exists for the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .get('/bt-api/scouting-reports/game/g1/live-match?jersey=42')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.match).toBeNull();
        });

        it('matches a batter by jersey number', async () => {
            const report = { id: 'sr1', game_id: 'g1' };
            const batter = { id: 'b1', jersey_number: 42, player_name: 'Smith' };
            mockQuery
                .mockResolvedValueOnce({ rows: [report] } as any) // report lookup
                .mockResolvedValueOnce({ rows: [batter] } as any); // jersey match

            const res = await getAgent()
                .get('/bt-api/scouting-reports/game/g1/live-match?jersey=42')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.match.batter.id).toBe('b1');
        });

        it('falls back to name match when jersey misses', async () => {
            const report = { id: 'sr1', game_id: 'g1' };
            const batter = { id: 'b2', player_name: 'Jones' };
            mockQuery
                .mockResolvedValueOnce({ rows: [report] } as any)
                .mockResolvedValueOnce({ rows: batter ? [batter] : [] } as any); // name match
            // Build args explicitly: when jersey is null/undefined, only name lookup runs
            const res = await getAgent()
                .get('/bt-api/scouting-reports/game/g1/live-match?name=Jones')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.match.batter.player_name).toBe('Jones');
        });
    });
});
