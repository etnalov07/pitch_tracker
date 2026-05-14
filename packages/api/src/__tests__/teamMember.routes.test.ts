import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-member-id') }));

jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromBody: () => (_req: any, _res: any, next: any) => next(),
    requireTeamRoleFromJoinRequest: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

describe('TeamMember Routes - /bt-api/teams/:team_id/members', () => {
    beforeEach(() => resetMocks());

    describe('GET /:team_id/members', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/teams/t1/members');
            expect(res.status).toBe(401);
        });

        it('returns the member list', async () => {
            const mockMembers = [{ id: 'm1', user_first_name: 'Jane', role: 'owner' }];
            mockQuery.mockResolvedValueOnce({ rows: mockMembers } as any);

            const res = await getAgent().get('/bt-api/teams/t1/members').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.members).toEqual(mockMembers);
        });
    });

    describe('PUT /:team_id/members/:member_id', () => {
        it('returns 400 when role is missing', async () => {
            const res = await getAgent().put('/bt-api/teams/t1/members/m1').set('Authorization', authHeader()).send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Role is required');
        });

        it('updates the member role', async () => {
            const updated = { id: 'm1', role: 'coach' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

            const res = await getAgent()
                .put('/bt-api/teams/t1/members/m1')
                .set('Authorization', authHeader())
                .send({ role: 'coach' });

            expect(res.status).toBe(200);
            expect(res.body.role).toBe('coach');
        });

        it('returns 500 when the member is not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .put('/bt-api/teams/t1/members/missing')
                .set('Authorization', authHeader())
                .send({ role: 'coach' });

            expect(res.status).toBe(500);
        });
    });

    describe('DELETE /:team_id/members/:member_id', () => {
        it('removes a non-owner member', async () => {
            const member = { id: 'm1', role: 'player', team_id: 't1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [member] } as any) // lookup
                .mockResolvedValueOnce({ rows: [] } as any); // delete

            const res = await getAgent().delete('/bt-api/teams/t1/members/m1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Member removed');
        });

        it('refuses to remove the last owner', async () => {
            const owner = { id: 'm1', role: 'owner', team_id: 't1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [owner] } as any) // lookup
                .mockResolvedValueOnce({ rows: [{ count: '1' }] } as any); // owner count

            const res = await getAgent().delete('/bt-api/teams/t1/members/m1').set('Authorization', authHeader());

            expect(res.status).toBe(500); // service throws, falls through to errorHandler
        });
    });

    describe('POST /:team_id/members/:member_id/link-player', () => {
        it('returns 400 when player_id is missing', async () => {
            const res = await getAgent()
                .post('/bt-api/teams/t1/members/m1/link-player')
                .set('Authorization', authHeader())
                .send({});
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('player_id is required');
        });

        it('links a player record to the member', async () => {
            const member = { id: 'm1', user_id: 'u1', player_id: 'p1' };
            mockQuery
                .mockResolvedValueOnce({ rows: [member] } as any) // UPDATE team_members
                .mockResolvedValueOnce({ rows: [] } as any); // UPDATE players

            const res = await getAgent()
                .post('/bt-api/teams/t1/members/m1/link-player')
                .set('Authorization', authHeader())
                .send({ player_id: 'p1' });

            expect(res.status).toBe(200);
            expect(res.body.player_id).toBe('p1');
        });
    });
});
