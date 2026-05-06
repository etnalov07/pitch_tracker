import { getAgent, authHeader, resetMocks, mockQuery, setupMockTransaction } from './helpers/setup';

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-event-id') }));

describe('BaserunnerEvent Routes - /bt-api/baserunner-events', () => {
    beforeEach(() => resetMocks());

    describe('POST /', () => {
        const validPayload = {
            game_id: 'game-1',
            inning_id: 'inning-1',
            event_type: 'caught_stealing',
            runner_base: 'first',
            outs_before: 0,
        };

        it('returns 401 without auth', async () => {
            const res = await getAgent().post('/bt-api/baserunner-events').send(validPayload);
            expect(res.status).toBe(401);
        });

        it('records a non-advancement event (records an out)', async () => {
            const mockEvent = { id: 'test-event-id', ...validPayload, out_recorded: true, outs_after: 1 };
            setupMockTransaction([
                { rows: [mockEvent] }, // INSERT baserunner_events
                { rows: [{ base_runners: { first: true, second: false, third: false } }] }, // SELECT games
                { rows: [] }, // UPDATE games
            ]);

            const res = await getAgent().post('/bt-api/baserunner-events').set('Authorization', authHeader()).send(validPayload);

            expect(res.status).toBe(201);
            expect(res.body.event.id).toBe('test-event-id');
            expect(res.body.event.out_recorded).toBe(true);
        });

        it('records an advancement event with new_base_runners (no out recorded)', async () => {
            const advancementPayload = {
                ...validPayload,
                event_type: 'stolen_base',
                runner_to_base: 'second',
                new_base_runners: { first: false, second: true, third: false },
            };
            const mockEvent = { id: 'test-event-id', ...advancementPayload, out_recorded: false };

            setupMockTransaction([
                { rows: [mockEvent] },
                { rows: [{ base_runners: { first: true, second: false, third: false } }] },
                { rows: [] },
            ]);

            const res = await getAgent()
                .post('/bt-api/baserunner-events')
                .set('Authorization', authHeader())
                .send(advancementPayload);

            expect(res.status).toBe(201);
        });

        it('returns 500 when required fields are missing', async () => {
            const res = await getAgent()
                .post('/bt-api/baserunner-events')
                .set('Authorization', authHeader())
                .send({ game_id: 'game-1' });

            expect(res.status).toBe(500);
        });
    });

    describe('GET /game/:gameId', () => {
        it('returns events for a game', async () => {
            const mockEvents = [{ id: 'e1' }, { id: 'e2' }];
            mockQuery.mockResolvedValueOnce({ rows: mockEvents } as any);

            const res = await getAgent().get('/bt-api/baserunner-events/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.events).toEqual(mockEvents);
        });
    });

    describe('GET /inning/:inningId', () => {
        it('returns events for an inning', async () => {
            const mockEvents = [{ id: 'e1' }];
            mockQuery.mockResolvedValueOnce({ rows: mockEvents } as any);

            const res = await getAgent().get('/bt-api/baserunner-events/inning/inning-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.events).toHaveLength(1);
        });
    });

    describe('DELETE /:id', () => {
        it('deletes an event', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent().delete('/bt-api/baserunner-events/e1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Event deleted');
        });
    });
});
