import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-play-id') }));

describe('Play Routes - /bt-api/plays', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        const validPayload = {
            pitch_id: 'pi1',
            at_bat_id: 'ab1',
            contact_type: 'ground_ball',
            is_out: true,
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/plays').send(validPayload);
            expect(res.status).toBe(401);
        });

        it('records a play', async () => {
            const inserted = { id: 'test-play-id', ...validPayload };
            mockQuery.mockResolvedValueOnce({ rows: [inserted] } as any);

            const res = await getAgent().post('/bt-api/plays').set('Authorization', authHeader()).send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.play.id).toBe('test-play-id');
            expect(res.body.message).toBe('Play recorded successfully');
        });

        it('returns 500 when required fields are missing', async () => {
            const res = await getAgent().post('/bt-api/plays').set('Authorization', authHeader()).send({ pitch_id: 'pi1' }); // missing at_bat_id, contact_type, is_out

            expect(res.status).toBe(500);
        });
    });

    describe('GET /:id', () => {
        it('returns a play by id', async () => {
            const play = { id: 'pl1', contact_type: 'fly_ball' };
            mockQuery.mockResolvedValueOnce({ rows: [play] } as any);

            const res = await getAgent().get('/bt-api/plays/pl1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.play).toEqual(play);
        });

        it('returns 404 when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().get('/bt-api/plays/missing').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    describe('GET /at-bat/:atBatId', () => {
        it('returns plays for an at-bat', async () => {
            const plays = [{ id: 'pl1' }, { id: 'pl2' }];
            mockQuery.mockResolvedValueOnce({ rows: plays } as any);

            const res = await getAgent().get('/bt-api/plays/at-bat/ab1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.plays).toHaveLength(2);
        });
    });

    describe('GET /game/:gameId', () => {
        it('returns plays for a game with batter context', async () => {
            const plays = [{ id: 'pl1', batter_first_name: 'Mike', pitch_type: 'fastball' }];
            mockQuery.mockResolvedValueOnce({ rows: plays } as any);

            const res = await getAgent().get('/bt-api/plays/game/g1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.plays).toHaveLength(1);
        });
    });

    describe('GET /batter/:batterId', () => {
        it('returns plays for a batter', async () => {
            const plays = [{ id: 'pl1', game_id: 'g1' }];
            mockQuery.mockResolvedValueOnce({ rows: plays } as any);

            const res = await getAgent().get('/bt-api/plays/batter/b1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.plays).toEqual(plays);
        });
    });

    describe('PUT /:id', () => {
        it('updates an existing play', async () => {
            const existing = { id: 'pl1', contact_type: 'ground_ball' };
            const updated = { ...existing, hit_result: 'single' };
            mockQuery
                .mockResolvedValueOnce({ rows: [existing] } as any) // getPlayById
                .mockResolvedValueOnce({ rows: [updated] } as any); // UPDATE

            const res = await getAgent().put('/bt-api/plays/pl1').set('Authorization', authHeader()).send({ hit_result: 'single' });

            expect(res.status).toBe(200);
            expect(res.body.play.hit_result).toBe('single');
        });

        it('returns 500 when play does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .put('/bt-api/plays/missing')
                .set('Authorization', authHeader())
                .send({ hit_result: 'single' });

            expect(res.status).toBe(500);
        });
    });
});
