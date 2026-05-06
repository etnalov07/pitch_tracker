import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-invite-id') }));

jest.mock('../middleware/roles', () => ({
    loadUserRoles: (_req: any, _res: any, next: any) => next(),
    requireTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgRole: () => (_req: any, _res: any, next: any) => next(),
    requirePlayerTeamRole: () => (_req: any, _res: any, next: any) => next(),
    requireOrgMember: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../services/email.service', () => ({
    __esModule: true,
    default: { sendInviteEmail: jest.fn().mockResolvedValue(undefined) },
}));

describe('Invite Routes - /bt-api/invites', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/invites').send({ team_id: 't1' });
            expect(res.status).toBe(401);
        });

        it('creates an invite for a team', async () => {
            const inviteRow = {
                id: 'test-invite-id',
                team_id: 't1',
                token: 'abc',
                role: 'player',
                status: 'pending',
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Reds' }] } as any) // verify team
                .mockResolvedValueOnce({ rows: [inviteRow] } as any); // INSERT invite

            const res = await getAgent()
                .post('/bt-api/invites')
                .set('Authorization', authHeader())
                .send({ team_id: 't1', role: 'player' });

            expect(res.status).toBe(201);
            expect(res.body.id).toBe('test-invite-id');
            expect(res.body.team_name).toBe('Reds');
            expect(res.body.invite_url).toContain('/invite/');
        });

        it('returns 500 when team does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().post('/bt-api/invites').set('Authorization', authHeader()).send({ team_id: 'missing' });

            expect(res.status).toBe(500);
        });
    });

    describe('GET /team/:team_id', () => {
        it('returns invites for a team', async () => {
            const mockInvites = [{ id: 'i1', team_name: 'Reds' }];
            mockQuery.mockResolvedValueOnce({ rows: mockInvites } as any);

            const res = await getAgent().get('/bt-api/invites/team/t1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.invites).toEqual(mockInvites);
        });
    });

    describe('GET /token/:token', () => {
        it('returns invite by token (public, no auth required)', async () => {
            const invite = {
                id: 'i1',
                token: 'secret-token',
                team_name: 'Reds',
                status: 'pending',
                expires_at: new Date(Date.now() + 86400000),
            };
            mockQuery.mockResolvedValueOnce({ rows: [invite] } as any);

            const res = await getAgent().get('/bt-api/invites/token/secret-token');

            expect(res.status).toBe(200);
            // Token should be redacted from response
            expect(res.body.token).toBeUndefined();
            expect(res.body.team_name).toBe('Reds');
        });

        it('returns 404 when token does not match', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/invites/token/no-such-token');
            expect(res.status).toBe(404);
        });

        it('flips the status to expired when past expiry', async () => {
            const expired = {
                id: 'i1',
                token: 'tok',
                team_name: 'Reds',
                status: 'pending',
                expires_at: new Date(Date.now() - 86400000),
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [expired] } as any) // SELECT
                .mockResolvedValueOnce({ rows: [] } as any); // UPDATE status

            const res = await getAgent().get('/bt-api/invites/token/tok');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('expired');
        });
    });

    describe('POST /token/:token/accept', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/invites/token/tok/accept');
            expect(res.status).toBe(401);
        });

        it('accepts a pending invite', async () => {
            const invite = {
                id: 'i1',
                team_id: 't1',
                role: 'player',
                status: 'pending',
                expires_at: new Date(Date.now() + 86400000),
                player_id: null,
            };
            setupMockTransaction([
                { rows: [invite] }, // SELECT invite
                { rows: [] }, // existing member check
                { rows: [{ team_type: 'travel', year: 2026 }] }, // team type check
                { rows: [] }, // INSERT team_member
                { rows: [] }, // UPDATE invite status
            ]);

            const res = await getAgent().post('/bt-api/invites/token/tok/accept').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.team_id).toBe('t1');
            expect(res.body.message).toBe('Invite accepted');
        });

        it('rejects an already-accepted invite', async () => {
            const invite = { id: 'i1', team_id: 't1', status: 'accepted', expires_at: new Date(Date.now() + 86400000) };
            setupMockTransaction([{ rows: [invite] }]);

            const res = await getAgent().post('/bt-api/invites/token/tok/accept').set('Authorization', authHeader());

            expect(res.status).toBe(500); // throws → next → errorHandler → 500
        });
    });

    describe('PUT /:id/revoke', () => {
        it('revokes a pending invite', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 'i1' }] } as any);

            const res = await getAgent().put('/bt-api/invites/i1/revoke').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Invite revoked');
        });

        it('returns 500 when invite is missing or already used', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().put('/bt-api/invites/missing/revoke').set('Authorization', authHeader());

            expect(res.status).toBe(500);
        });
    });
});
