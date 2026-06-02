import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';

const gameId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const pitcherA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const pitcherB = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function mockGameContext(opts: { sanction: string | null; age_division: string | null; game_date?: string }) {
    mockQuery.mockResolvedValueOnce({
        rows: [{ id: gameId, game_date: opts.game_date ?? '2026-06-15', sanction: opts.sanction, age_division: opts.age_division }],
    } as any);
}

function mockHistoryEmpty() {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any); // games_today
    mockQuery.mockResolvedValueOnce({ rows: [] } as any); // last_appearance
    mockQuery.mockResolvedValueOnce({ rows: [] } as any); // consecutive_days
}

describe('PitchRules Routes - /bt-api/pitch-rules', () => {
    beforeEach(() => resetMocks());

    describe('GET /eligibility/:gameId/:pitcherId', () => {
        it('returns 401 without auth', async () => {
            const res = await getAgent().get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`);
            expect(res.status).toBe(401);
        });

        it('returns 404 when the game is not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // game lookup
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.status).toBe(404);
        });

        it('PG game with no age division → unknown_division (no block)', async () => {
            mockGameContext({ sanction: 'PG', age_division: null });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.status).toBe(200);
            expect(res.body.eligibility.eligibility).toBe('unknown_division');
            expect(res.body.eligibility.daily_max).toBeNull();
        });

        it('PG 14U game, fresh history → eligible', async () => {
            mockGameContext({ sanction: 'PG', age_division: '14U' });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.status).toBe(200);
            expect(res.body.eligibility.eligibility).toBe('eligible');
            expect(res.body.eligibility.daily_max).toBe(95);
        });

        it('PG 14U with 95-pitch appearance yesterday → ineligible', async () => {
            mockGameContext({ sanction: 'PG', age_division: '14U', game_date: '2026-06-15' });
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // games_today
            mockQuery.mockResolvedValueOnce({ rows: [{ day: '2026-06-14', pitches: 95 }] } as any); // last_appearance
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // consecutive_days
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('ineligible');
            expect(res.body.eligibility.rest_required_days).toBe(3);
        });

        it('HS game → always eligible (cap is enforced at pitch entry)', async () => {
            mockGameContext({ sanction: 'HS', age_division: null });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('eligible');
            expect(res.body.eligibility.daily_max).toBe(110);
        });

        it('PBR game with no age → unknown_division (no block, caveat chip)', async () => {
            mockGameContext({ sanction: 'PBR', age_division: null });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('unknown_division');
        });

        it('PBR 14U game with fresh history → eligible', async () => {
            mockGameContext({ sanction: 'PBR', age_division: '14U' });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('eligible');
            expect(res.body.eligibility.daily_max).toBe(95);
        });

        it('PBR 12U → unknown_rules (PBR table only covers 14U+)', async () => {
            mockGameContext({ sanction: 'PBR', age_division: '12U' });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('unknown_rules');
        });

        it('NONE / null sanction → always eligible', async () => {
            mockGameContext({ sanction: null, age_division: null });
            mockHistoryEmpty();
            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/${pitcherA}`)
                .set('Authorization', authHeader());
            expect(res.body.eligibility.eligibility).toBe('eligible');
            expect(res.body.eligibility.daily_max).toBeNull();
        });
    });

    describe('GET /eligibility/:gameId/bulk', () => {
        it('returns 400 without pitcher_ids', async () => {
            const res = await getAgent().get(`/bt-api/pitch-rules/eligibility/${gameId}/bulk`).set('Authorization', authHeader());
            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/pitcher_ids/);
        });

        it('returns a map keyed by pitcher_id for each pitcher', async () => {
            // Game context (1 query) then 3 history queries per pitcher (×2 pitchers = 6).
            mockGameContext({ sanction: 'PG', age_division: '14U' });
            mockHistoryEmpty(); // pitcher A
            mockHistoryEmpty(); // pitcher B

            const res = await getAgent()
                .get(`/bt-api/pitch-rules/eligibility/${gameId}/bulk?pitcher_ids=${pitcherA},${pitcherB}`)
                .set('Authorization', authHeader());
            expect(res.status).toBe(200);
            expect(Object.keys(res.body.eligibility)).toEqual(expect.arrayContaining([pitcherA, pitcherB]));
            expect(res.body.eligibility[pitcherA].eligibility).toBe('eligible');
            expect(res.body.eligibility[pitcherB].eligibility).toBe('eligible');
        });

        it('returns 401 without auth', async () => {
            const res = await getAgent().get(`/bt-api/pitch-rules/eligibility/${gameId}/bulk?pitcher_ids=${pitcherA}`);
            expect(res.status).toBe(401);
        });
    });
});
