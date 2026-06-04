import { getAgent, authHeader, resetMocks, setupMockTransaction } from './helpers/setup';

describe('Pitch velocity backfill - PATCH /bt-api/pitches/velocities', () => {
    beforeEach(() => resetMocks());

    const gameId = '11111111-1111-1111-1111-111111111111';
    const pitchA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const pitchB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

    const url = '/bt-api/pitches/velocities';

    it('returns 401 without auth', async () => {
        const res = await getAgent()
            .patch(url)
            .send({ game_id: gameId, updates: [{ pitch_id: pitchA, velocity: 78 }] });
        expect(res.status).toBe(401);
    });

    it('rejects a missing game_id', async () => {
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ updates: [{ pitch_id: pitchA, velocity: 78 }] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/game_id/);
    });

    it('rejects an empty updates array', async () => {
        const res = await getAgent().patch(url).set('Authorization', authHeader()).send({ game_id: gameId, updates: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/updates/);
    });

    it('rejects a velocity outside 20–130', async () => {
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ game_id: gameId, updates: [{ pitch_id: pitchA, velocity: 200 }] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/20 and 130/);
    });

    it('rejects a non-numeric velocity', async () => {
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ game_id: gameId, updates: [{ pitch_id: pitchA, velocity: 'fast' }] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/velocity/i);
    });

    it('rejects an update missing pitch_id', async () => {
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ game_id: gameId, updates: [{ velocity: 78 }] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/pitch_id/);
    });

    it('accepts null to clear a velocity', async () => {
        // 1 UPDATE (rowCount 1) + 1 DELETE (cache invalidation)
        setupMockTransaction([{ rowCount: 1 }, { rowCount: 0 }]);
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ game_id: gameId, updates: [{ pitch_id: pitchA, velocity: null }] });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(1);
    });

    it('bulk-updates multiple pitches and invalidates the game summary cache', async () => {
        const mockClient = setupMockTransaction([{ rowCount: 1 }, { rowCount: 1 }, { rowCount: 0 }]);
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({
                game_id: gameId,
                updates: [
                    { pitch_id: pitchA, velocity: 78.4 },
                    { pitch_id: pitchB, velocity: 81 },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(2);

        // Two scoped UPDATEs (each carries game_id) + one cache-invalidation DELETE.
        const calls = mockClient.query.mock.calls;
        const updateCalls = calls.filter((c: any) => /UPDATE pitches SET velocity/.test(c[0]));
        expect(updateCalls).toHaveLength(2);
        expect(updateCalls[0][1]).toEqual([78.4, pitchA, gameId]);
        const deleteCall = calls.find((c: any) => /DELETE FROM performance_summaries/.test(c[0]));
        expect(deleteCall).toBeDefined();
        expect(deleteCall[1]).toEqual([gameId]);
    });

    it('returns 404 when a pitch does not belong to the game', async () => {
        // First UPDATE affects 0 rows -> service throws PITCH_NOT_IN_GAME.
        setupMockTransaction([{ rowCount: 0 }]);
        const res = await getAgent()
            .patch(url)
            .set('Authorization', authHeader())
            .send({ game_id: gameId, updates: [{ pitch_id: pitchA, velocity: 78 }] });
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('PITCH_NOT_IN_GAME');
    });
});
