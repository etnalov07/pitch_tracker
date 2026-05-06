import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-team-id') }));

// Bypass role middleware so each test only mocks its own queries.
jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

// Avoid touching the filesystem when handlers reach into image utils.
jest.mock('../utils/imageProcessor', () => ({
    processLogoUpload: jest.fn().mockResolvedValue('/uploads/logos/test.png'),
    deleteLogoFiles: jest.fn(),
}));

// Multer can stay but no upload tests run a real file through it; default is fine.

describe('Team Routes - /bt-api/teams', () => {
    const TEST_USER_ID = 'test-user-id';

    beforeEach(() => resetMocks());

    describe('POST /', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/teams').send({ name: 'Reds' });
            expect(res.status).toBe(401);
        });

        it('creates a team', async () => {
            const mockTeam = { id: 'test-team-id', name: 'Reds', owner_id: TEST_USER_ID };
            setupMockTransaction([{ rows: [mockTeam] }, { rows: [] }]);

            const res = await getAgent().post('/bt-api/teams').set('Authorization', authHeader()).send({ name: 'Reds' });

            expect(res.status).toBe(201);
            expect(res.body.team.name).toBe('Reds');
        });

        it('returns 500 when name is missing', async () => {
            const res = await getAgent().post('/bt-api/teams').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(500);
        });
    });

    describe('GET /', () => {
        it('returns teams owned/joined by the user', async () => {
            const mockTeams = [{ id: 't1', name: 'Reds', user_role: 'owner' }];
            mockQuery.mockResolvedValueOnce({ rows: mockTeams } as any);

            const res = await getAgent().get('/bt-api/teams').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.teams).toEqual(mockTeams);
        });
    });

    describe('GET /all', () => {
        it('returns the global team list', async () => {
            const mockTeams = [
                { id: 't1', name: 'Reds' },
                { id: 't2', name: 'Blues' },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockTeams } as any);

            const res = await getAgent().get('/bt-api/teams/all').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.teams).toHaveLength(2);
        });
    });

    describe('GET /search', () => {
        it('returns 400 for queries shorter than 2 chars', async () => {
            const res = await getAgent().get('/bt-api/teams/search?q=a').set('Authorization', authHeader());
            expect(res.status).toBe(400);
        });

        it('returns matches for a valid query', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Red Sox' }] } as any);

            const res = await getAgent().get('/bt-api/teams/search?q=red').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.teams).toHaveLength(1);
        });
    });

    describe('GET /:id', () => {
        it('returns a team by id', async () => {
            const mockTeam = { id: 't1', name: 'Reds' };
            mockQuery.mockResolvedValueOnce({ rows: [mockTeam] } as any);

            const res = await getAgent().get('/bt-api/teams/t1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.team).toEqual(mockTeam);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/teams/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('GET /:id/players', () => {
        it('returns the team plus its active players', async () => {
            const mockTeam = { id: 't1', name: 'Reds' };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockTeam] } as any) // team
                .mockResolvedValueOnce({ rows: [{ id: 'p1', first_name: 'Mike' }] } as any); // players

            const res = await getAgent().get('/bt-api/teams/t1/players').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.team.players).toHaveLength(1);
        });
    });

    describe('PUT /:id', () => {
        it('updates the team when the user is the legacy owner', async () => {
            const mockTeam = { id: 't1', name: 'Reds', owner_id: TEST_USER_ID };
            const updated = { ...mockTeam, name: 'Reds Renamed' };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockTeam] } as any) // verifyTeamAccess: getTeamById
                .mockResolvedValueOnce({ rows: [updated] } as any); // UPDATE

            const res = await getAgent().put('/bt-api/teams/t1').set('Authorization', authHeader()).send({ name: 'Reds Renamed' });

            expect(res.status).toBe(200);
            expect(res.body.team.name).toBe('Reds Renamed');
        });

        it('returns 500 when the user has no access', async () => {
            // verifyTeamAccess: team has different owner_id, no team_members row
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', owner_id: 'someone-else' }] } as any)
                .mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().put('/bt-api/teams/t1').set('Authorization', authHeader()).send({ name: 'Reds' });

            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /:id', () => {
        it('deletes a team owned by the user', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', owner_id: TEST_USER_ID }] } as any) // verify
                .mockResolvedValueOnce({ rows: [] } as any); // DELETE

            const res = await getAgent().delete('/bt-api/teams/t1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Team deleted successfully');
        });
    });

    describe('PUT /:id/colors', () => {
        it('rejects an invalid hex color', async () => {
            const res = await getAgent()
                .put('/bt-api/teams/t1/colors')
                .set('Authorization', authHeader())
                .send({ primary_color: 'red' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/primary color/);
        });

        it('updates colors when valid', async () => {
            const updated = { id: 't1', primary_color: '#FF0000' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', owner_id: TEST_USER_ID }] } as any) // verify
                .mockResolvedValueOnce({ rows: [updated] } as any); // UPDATE

            const res = await getAgent()
                .put('/bt-api/teams/t1/colors')
                .set('Authorization', authHeader())
                .send({ primary_color: '#FF0000' });

            expect(res.status).toBe(200);
            expect(res.body.team.primary_color).toBe('#FF0000');
        });
    });

    describe('DELETE /:id/logo', () => {
        it('clears logo_path on the team', async () => {
            const cleared = { id: 't1', logo_path: null };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', owner_id: TEST_USER_ID, logo_path: '/x.png' }] } as any) // verify
                .mockResolvedValueOnce({ rows: [cleared] } as any); // UPDATE

            const res = await getAgent().delete('/bt-api/teams/t1/logo').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.team.logo_path).toBeNull();
        });
    });

    describe('GET /:id/join-requests', () => {
        it('returns join requests for the team', async () => {
            const mockRequests = [{ id: 'jr1', team_id: 't1', user_id: 'u1' }];
            mockQuery.mockResolvedValueOnce({ rows: mockRequests } as any);

            const res = await getAgent().get('/bt-api/teams/t1/join-requests').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.requests).toEqual(mockRequests);
        });
    });
});
