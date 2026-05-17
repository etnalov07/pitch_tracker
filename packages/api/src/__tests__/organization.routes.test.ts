import { getAgent, authHeader, resetMocks, mockQuery, mockTransaction, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-org-id') }));

// Bypass role loading + enforcement so each test only mocks its handler's queries.
jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromBody: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromJoinRequest: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

describe('Organization Routes - /bt-api/organizations', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/organizations').send({ name: 'Acme' });
            expect(res.status).toBe(401);
        });

        it('creates an organization', async () => {
            const mockOrg = { id: 'test-org-id', name: 'Acme', slug: 'acme' };
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // slug uniqueness check
            setupMockTransaction([{ rows: [mockOrg] }, { rows: [] }]);

            const res = await getAgent().post('/bt-api/organizations').set('Authorization', authHeader()).send({ name: 'Acme' });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('test-org-id');
        });

        it('returns 500 when name is missing', async () => {
            const res = await getAgent().post('/bt-api/organizations').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(500);
        });
    });

    describe('GET /', () => {
        it('lists organizations for the authenticated user', async () => {
            const mockOrgs = [
                { id: 'o1', name: 'Acme', user_role: 'owner' },
                { id: 'o2', name: 'Globex', user_role: 'admin' },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockOrgs } as any);

            const res = await getAgent().get('/bt-api/organizations').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.organizations).toEqual(mockOrgs);
        });
    });

    describe('GET /:org_id', () => {
        it('returns the organization with teams + member count', async () => {
            const mockOrg = { id: 'o1', name: 'Acme' };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockOrg] } as any) // org lookup
                .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Reds' }] } as any) // teams
                .mockResolvedValueOnce({ rows: [{ count: '3' }] } as any); // member count

            const res = await getAgent().get('/bt-api/organizations/o1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('o1');
            expect(res.body.teams).toHaveLength(1);
            expect(res.body.member_count).toBe(3);
        });

        it('returns 404 when org does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/organizations/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /:org_id', () => {
        it('updates the organization', async () => {
            const updated = { id: 'o1', name: 'Acme Renamed' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

            const res = await getAgent()
                .put('/bt-api/organizations/o1')
                .set('Authorization', authHeader())
                .send({ name: 'Acme Renamed' });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Acme Renamed');
        });
    });

    describe('DELETE /:org_id', () => {
        it('unlinks teams + deletes the org', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [] } as any) // unlink teams
                .mockResolvedValueOnce({ rows: [] } as any); // delete org

            const res = await getAgent().delete('/bt-api/organizations/o1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Organization deleted');
        });
    });

    describe('GET /:org_id/teams', () => {
        it('returns teams for the organization', async () => {
            const mockTeams = [{ id: 't1', name: 'Reds', player_count: '12' }];
            mockQuery.mockResolvedValueOnce({ rows: mockTeams } as any);

            const res = await getAgent().get('/bt-api/organizations/o1/teams').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.teams).toEqual(mockTeams);
        });
    });

    describe('POST /:org_id/teams', () => {
        it('returns 400 when team_id is missing', async () => {
            const res = await getAgent().post('/bt-api/organizations/o1/teams').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('team_id is required');
        });

        it('attaches a team to the organization', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .post('/bt-api/organizations/o1/teams')
                .set('Authorization', authHeader())
                .send({ team_id: 't1' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Team added to organization');
        });
    });

    describe('GET /:org_id/members', () => {
        it('returns the org members list', async () => {
            const mockMembers = [{ id: 'm1', user_first_name: 'Jane', role: 'owner' }];
            mockQuery.mockResolvedValueOnce({ rows: mockMembers } as any);

            const res = await getAgent().get('/bt-api/organizations/o1/members').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.members).toEqual(mockMembers);
        });
    });

    describe('POST /:org_id/members', () => {
        it('returns 400 when email is missing', async () => {
            const res = await getAgent().post('/bt-api/organizations/o1/members').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Email is required');
        });

        it('returns 500 when no user matches the email', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // user lookup empty

            const res = await getAgent()
                .post('/bt-api/organizations/o1/members')
                .set('Authorization', authHeader())
                .send({ email: 'ghost@example.com' });

            expect(res.status).toBe(500);
        });

        it('adds an existing user as a member', async () => {
            const mockMember = { id: 'm-new', user_id: 'u-1', role: 'admin' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 'u-1' }] } as any) // user lookup
                .mockResolvedValueOnce({ rows: [mockMember] } as any); // insert

            const res = await getAgent()
                .post('/bt-api/organizations/o1/members')
                .set('Authorization', authHeader())
                .send({ email: 'jane@example.com', role: 'admin' });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('m-new');
        });
    });

    describe('DELETE /:org_id/members/:member_id', () => {
        it('removes a non-owner member', async () => {
            const member = { id: 'm1', role: 'admin', organization_id: 'o1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [member] } as any) // lookup
                .mockResolvedValueOnce({ rows: [] } as any); // delete

            const res = await getAgent().delete('/bt-api/organizations/o1/members/m1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Member removed');
        });

        it('refuses to remove the last remaining owner', async () => {
            const owner = { id: 'm1', role: 'owner', organization_id: 'o1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [owner] } as any) // lookup
                .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any); // owner count = 1

            const res = await getAgent().delete('/bt-api/organizations/o1/members/m1').set('Authorization', authHeader());

            expect(res.status).toBe(500); // service throws → next(err) → 500
        });
    });

    // Avoid unused-import warnings while keeping helper available for future tests
    void mockTransaction;
});
