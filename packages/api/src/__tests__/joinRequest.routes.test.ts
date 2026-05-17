import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-jr-id') }));

jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromBody: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromJoinRequest: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

describe('JoinRequest Routes - /bt-api/join-requests', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/join-requests').send({ team_id: 't1' });
            expect(res.status).toBe(401);
        });

        it('creates a join request', async () => {
            const created = { id: 'test-jr-id', team_id: 't1', user_id: 'test-user-id', status: 'pending' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Reds' }] } as any) // team exists
                .mockResolvedValueOnce({ rows: [] } as any) // not already a member
                .mockResolvedValueOnce({ rows: [] } as any) // no existing pending request
                .mockResolvedValueOnce({ rows: [created] } as any); // INSERT

            const res = await getAgent()
                .post('/bt-api/join-requests')
                .set('Authorization', authHeader())
                .send({ team_id: 't1', message: 'Coach, please' });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('test-jr-id');
            expect(res.body.team_name).toBe('Reds');
        });

        it('returns 500 when team is missing', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .post('/bt-api/join-requests')
                .set('Authorization', authHeader())
                .send({ team_id: 'ghost' });

            expect(res.status).toBe(500);
        });

        it('returns 500 when user is already a member', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Reds' }] } as any) // team
                .mockResolvedValueOnce({ rows: [{ id: 'm1' }] } as any); // existing member

            const res = await getAgent().post('/bt-api/join-requests').set('Authorization', authHeader()).send({ team_id: 't1' });

            expect(res.status).toBe(500);
        });
    });

    describe('GET /my', () => {
        it("returns the requesting user's join requests", async () => {
            const mockRequests = [{ id: 'jr1', team_name: 'Reds', status: 'pending' }];
            mockQuery.mockResolvedValueOnce({ rows: mockRequests } as any);

            const res = await getAgent().get('/bt-api/join-requests/my').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.requests).toEqual(mockRequests);
        });
    });

    describe('PUT /:id/approve', () => {
        it('approves a pending request and creates membership + player record', async () => {
            const request = { id: 'jr1', team_id: 't1', user_id: 'u1', status: 'pending' };
            setupMockTransaction([
                { rows: [request] }, // SELECT request
                { rows: [{ team_type: 'travel', year: 2026 }] }, // team
                { rows: [] }, // UPDATE request
                { rows: [] }, // INSERT team_member
                { rows: [{ first_name: 'Mike', last_name: 'Smith' }] }, // user lookup
                { rows: [] }, // INSERT player
                { rows: [] }, // UPDATE team_members.player_id
            ]);

            const res = await getAgent().put('/bt-api/join-requests/jr1/approve').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Request approved');
        });

        it('approves with a linked player id (skips auto-create)', async () => {
            const request = { id: 'jr1', team_id: 't1', user_id: 'u1', status: 'pending' };
            setupMockTransaction([
                { rows: [request] },
                { rows: [{ team_type: null, year: null }] },
                { rows: [] }, // UPDATE request
                { rows: [] }, // INSERT team_member
                { rows: [] }, // UPDATE players.user_id
            ]);

            const res = await getAgent()
                .put('/bt-api/join-requests/jr1/approve')
                .set('Authorization', authHeader())
                .send({ linked_player_id: 'p1' });

            expect(res.status).toBe(200);
        });

        it('returns 500 when request is missing', async () => {
            setupMockTransaction([{ rows: [] }]);

            const res = await getAgent().put('/bt-api/join-requests/missing/approve').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(500);
        });
    });

    describe('PUT /:id/deny', () => {
        it('denies a pending request', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'jr1' }] } as any);

            const res = await getAgent().put('/bt-api/join-requests/jr1/deny').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Request denied');
        });

        it('returns 500 when request is missing or already reviewed', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().put('/bt-api/join-requests/jr1/deny').set('Authorization', authHeader());

            expect(res.status).toBe(500);
        });
    });
});
