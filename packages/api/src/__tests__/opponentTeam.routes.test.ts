import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-opp-id') }));

// /bt-api/teams/:teamId/opponents falls through the parent /bt-api/teams router
// which mounts loadUserRoles. Bypass roles globally so each test only mocks its own queries.
jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromBody: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromJoinRequest: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

describe('OpponentTeam Routes - /bt-api/teams/:teamId/opponents', () => {
    beforeEach(() => resetMocks());

    describe('GET /', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/teams/t1/opponents');
            expect(res.status).toBe(401);
        });

        it('lists opponent teams', async () => {
            const opponents = [{ id: 'o1', name: 'Tigers' }];
            mockQuery.mockResolvedValueOnce({ rows: opponents } as any);

            const res = await getAgent().get('/bt-api/teams/t1/opponents').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.opponents).toEqual(opponents);
        });
    });

    describe('POST /', () => {
        it('rejects missing name', async () => {
            const res = await getAgent().post('/bt-api/teams/t1/opponents').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('name is required');
        });

        it('creates an opponent team', async () => {
            const created = { id: 'test-opp-id', team_id: 't1', name: 'Tigers' };
            setupMockTransaction([{ rows: [created] }]);

            const res = await getAgent()
                .post('/bt-api/teams/t1/opponents')
                .set('Authorization', authHeader())
                .send({ name: 'Tigers', city: 'Detroit' });

            expect(res.status).toBe(201);
            expect(res.body.opponent.name).toBe('Tigers');
        });
    });

    describe('GET /:id', () => {
        it('returns the opponent with roster', async () => {
            const team = { id: 'o1', team_id: 't1', name: 'Tigers' };
            mockQuery
                .mockResolvedValueOnce({ rows: [team] } as any) // getById
                .mockResolvedValueOnce({ rows: [{ id: 'p1', pitcher_name: 'Smith' }] } as any) // pitchers
                .mockResolvedValueOnce({ rows: [{ id: 'b1', player_name: 'Jones' }] } as any); // batters

            const res = await getAgent().get('/bt-api/teams/t1/opponents/o1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.opponent.name).toBe('Tigers');
            expect(res.body.opponent.pitchers).toHaveLength(1);
            expect(res.body.opponent.batters).toHaveLength(1);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/teams/t1/opponents/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /:id', () => {
        it('updates an opponent team', async () => {
            const updated = { id: 'o1', team_id: 't1', name: 'Tigers Renamed' };
            setupMockTransaction([{ rows: [updated] }]);

            const res = await getAgent()
                .put('/bt-api/teams/t1/opponents/o1')
                .set('Authorization', authHeader())
                .send({ name: 'Tigers Renamed' });

            expect(res.status).toBe(200);
            expect(res.body.opponent.name).toBe('Tigers Renamed');
        });

        it('falls back to getById when no fields are provided', async () => {
            const team = { id: 'o1', team_id: 't1', name: 'Tigers' };
            mockQuery.mockResolvedValueOnce({ rows: [team] } as any);

            const res = await getAgent().put('/bt-api/teams/t1/opponents/o1').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(200);
            expect(res.body.opponent.name).toBe('Tigers');
        });
    });

    describe('POST /:id/link-game', () => {
        it('rejects missing game_id', async () => {
            const res = await getAgent()
                .post('/bt-api/teams/t1/opponents/o1/link-game')
                .set('Authorization', authHeader())
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('game_id is required');
        });

        it('returns 404 when opponent does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .post('/bt-api/teams/t1/opponents/missing/link-game')
                .set('Authorization', authHeader())
                .send({ game_id: 'g1' });

            expect(res.status).toBe(404);
        });

        it('links the game to an existing opponent', async () => {
            const opponent = { id: 'o1', team_id: 't1', name: 'Tigers' };
            mockQuery
                .mockResolvedValueOnce({ rows: [opponent] } as any) // getById
                .mockResolvedValueOnce({ rows: [] } as any); // UPDATE games

            const res = await getAgent()
                .post('/bt-api/teams/t1/opponents/o1/link-game')
                .set('Authorization', authHeader())
                .send({ game_id: 'g1' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Game linked');
        });
    });

    describe('DELETE /:id', () => {
        it('returns 204', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().delete('/bt-api/teams/t1/opponents/o1').set('Authorization', authHeader());

            expect(res.status).toBe(204);
        });
    });
});
