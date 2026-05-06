import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

describe('MyTeamLineup Routes - /bt-api/my-team-lineup', () => {
    beforeEach(() => resetMocks());

    describe('GET /game/:gameId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get('/bt-api/my-team-lineup/game/g1');
            expect(res.status).toBe(401);
        });

        it('returns lineup for a game', async () => {
            const mockLineup = [{ id: 'l1', batting_order: 1, is_starter: true, player: { id: 'p1', first_name: 'Mike' } }];
            mockQuery.mockResolvedValueOnce({ rows: mockLineup } as any);

            const res = await getAgent().get('/bt-api/my-team-lineup/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.lineup).toEqual(mockLineup);
        });

        it('returns 500 when the database call throws', async () => {
            mockQuery.mockRejectedValueOnce(new Error('boom'));

            const res = await getAgent().get('/bt-api/my-team-lineup/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Failed to fetch my team lineup');
        });
    });

    describe('POST /game/:gameId/bulk', () => {
        it('rejects an empty players array', async () => {
            const res = await getAgent()
                .post('/bt-api/my-team-lineup/game/g1/bulk')
                .set('Authorization', authHeader())
                .send({ players: [] });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('players array required');
        });

        it('rejects a non-array body', async () => {
            const res = await getAgent().post('/bt-api/my-team-lineup/game/g1/bulk').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(400);
        });

        it('bulk-creates a lineup', async () => {
            const players = [
                { player_id: 'p1', batting_order: 1, position: 'P', is_starter: true },
                { player_id: 'p2', batting_order: 2, is_starter: true },
            ];
            const inserted = [
                { id: 'l1', game_id: 'g1', player_id: 'p1', batting_order: 1, is_starter: true },
                { id: 'l2', game_id: 'g1', player_id: 'p2', batting_order: 2, is_starter: true },
            ];
            setupMockTransaction([
                { rows: [] }, // DELETE existing starters
                { rows: [inserted[0]] }, // INSERT 1
                { rows: [inserted[1]] }, // INSERT 2
            ]);

            const res = await getAgent()
                .post('/bt-api/my-team-lineup/game/g1/bulk')
                .set('Authorization', authHeader())
                .send({ players });

            expect(res.status).toBe(200);
            expect(res.body.lineup).toHaveLength(2);
        });
    });

    describe('PUT /:id', () => {
        it('updates lineup player fields', async () => {
            const updated = { id: 'l1', batting_order: 3, position: 'CF' };
            mockQuery.mockResolvedValueOnce({ rows: [updated] } as any);

            const res = await getAgent()
                .put('/bt-api/my-team-lineup/l1')
                .set('Authorization', authHeader())
                .send({ batting_order: 3, position: 'CF' });

            expect(res.status).toBe(200);
            expect(res.body.player).toEqual(updated);
        });

        it('returns 404 when nothing was updatable (empty body)', async () => {
            // Service returns null when there are no fields → controller returns 404
            const res = await getAgent().put('/bt-api/my-team-lineup/l1').set('Authorization', authHeader()).send({});

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Player not found');
        });
    });
});
