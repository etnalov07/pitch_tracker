// Performance Summary routes test — mocks the service layer to focus on HTTP
// contract: auth guards, input validation, response shapes.

jest.mock('../services/performanceSummary.service', () => ({
    __esModule: true,
    default: {
        getSummary: jest.fn(),
        generateSummary: jest.fn(),
        getAllGamePitcherSummaries: jest.fn(),
        getSummariesByPitcher: jest.fn(),
        getBatterBreakdown: jest.fn(),
        getMyTeamBatterBreakdown: jest.fn(),
        regenerateNarrative: jest.fn(),
    },
}));

import { getAgent, authHeader, resetMocks, mockQuery } from './helpers/setup';
import performanceSummaryService from '../services/performanceSummary.service';

const svc = performanceSummaryService as jest.Mocked<typeof performanceSummaryService>;

const mockSummary = {
    id: 'summary-1',
    source_type: 'game' as const,
    source_id: 'game-1',
    pitcher_id: 'pitcher-1',
    pitcher_name: 'John Doe',
    team_id: 'team-1',
    created_at: '2026-01-01',
    narrative: 'Strong outing.',
    narrative_generated_at: '2026-01-01',
    total_pitches: 60,
    strikes: 42,
    balls: 18,
    strike_percentage: 70,
    target_accuracy_percentage: null,
    batters_faced: 9,
    innings_pitched: 3,
    runs_allowed: 0,
    hits_allowed: 2,
    intensity: null,
    plan_name: null,
    metrics: [],
    pitch_type_breakdown: [],
    highlights: ['Good command'],
    concerns: [],
};

describe('Performance Summary Routes - /bt-api/performance-summaries', () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    // =========================================================================
    // GET /game/:gameId/pitchers
    // =========================================================================

    describe('GET /game/:gameId/pitchers', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1/pitchers');
            expect(res.status).toBe(401);
        });

        it('returns 404 when game does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const res = await getAgent()
                .get('/bt-api/performance-summaries/game/nonexistent/pitchers')
                .set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('returns summaries array for all pitchers in the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ home_team_id: 'team-1' }] } as any);
            svc.getAllGamePitcherSummaries.mockResolvedValueOnce([mockSummary]);

            const res = await getAgent()
                .get('/bt-api/performance-summaries/game/game-1/pitchers')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summaries).toHaveLength(1);
            expect(res.body.summaries[0].pitcher_name).toBe('John Doe');
            expect(svc.getAllGamePitcherSummaries).toHaveBeenCalledWith('game-1', 'team-1');
        });

        it('returns empty array when no summaries exist for the game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ home_team_id: 'team-2' }] } as any);
            svc.getAllGamePitcherSummaries.mockResolvedValueOnce([]);

            const res = await getAgent()
                .get('/bt-api/performance-summaries/game/game-1/pitchers')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summaries).toEqual([]);
        });
    });

    // =========================================================================
    // GET /game/:gameId/batter-breakdown
    // =========================================================================

    describe('GET /game/:gameId/batter-breakdown', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1/batter-breakdown');
            expect(res.status).toBe(401);
        });

        it('returns opponent batter breakdown array', async () => {
            const mockBreakdown = [
                {
                    batter_id: 'b1',
                    batter_name: 'Batter One',
                    team_side: undefined,
                    batting_order: 1,
                    bats: 'R' as const,
                    at_bats: [],
                    stats: { total_at_bats: 2, hits: 1, strikeouts: 0, walks: 0 },
                },
            ];
            svc.getBatterBreakdown.mockResolvedValueOnce(mockBreakdown);

            const res = await getAgent()
                .get('/bt-api/performance-summaries/game/game-1/batter-breakdown')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.breakdown).toHaveLength(1);
            expect(res.body.breakdown[0].batter_name).toBe('Batter One');
        });
    });

    // =========================================================================
    // GET /game/:gameId/my-team-batter-breakdown
    // =========================================================================

    describe('GET /game/:gameId/my-team-batter-breakdown', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1/my-team-batter-breakdown');
            expect(res.status).toBe(401);
        });

        it('returns our team batter breakdown array', async () => {
            svc.getMyTeamBatterBreakdown.mockResolvedValueOnce([]);

            const res = await getAgent()
                .get('/bt-api/performance-summaries/game/game-1/my-team-batter-breakdown')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.breakdown).toEqual([]);
        });
    });

    // =========================================================================
    // GET /:sourceType/:sourceId  (getOrGenerateSummary)
    // =========================================================================

    describe('GET /:sourceType/:sourceId', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1');
            expect(res.status).toBe(401);
        });

        it('returns 400 for invalid sourceType', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/invalid/source-1').set('Authorization', authHeader());

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/sourceType/i);
        });

        it('returns existing summary when one is found', async () => {
            svc.getSummary.mockResolvedValueOnce(mockSummary);

            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summary.pitcher_name).toBe('John Doe');
        });

        it('generates a new summary when none exists (game source type)', async () => {
            svc.getSummary.mockResolvedValueOnce(null);
            mockQuery
                .mockResolvedValueOnce({ rows: [{ home_team_id: 'team-1' }] } as any) // game lookup
                .mockResolvedValueOnce({
                    rows: [{ pitcher_id: 'pitcher-1', team_id: 'team-1' }],
                } as any); // pitcher from pitches
            svc.generateSummary.mockResolvedValueOnce(mockSummary);

            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(svc.generateSummary).toHaveBeenCalled();
        });

        it('returns 404 when generating for a game with no pitches', async () => {
            svc.getSummary.mockResolvedValueOnce(null);
            mockQuery.mockResolvedValueOnce({ rows: [] } as any); // combined pitches+game query returns empty

            const res = await getAgent().get('/bt-api/performance-summaries/game/game-1').set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });

        it('accepts bullpen sourceType', async () => {
            svc.getSummary.mockResolvedValueOnce(null);
            mockQuery.mockResolvedValueOnce({ rows: [{ pitcher_id: 'p1', team_id: 'team-1' }] } as any);
            svc.generateSummary.mockResolvedValueOnce(mockSummary);

            const res = await getAgent().get('/bt-api/performance-summaries/bullpen/session-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
        });
    });

    // =========================================================================
    // POST /:id/regenerate-narrative
    // =========================================================================

    describe('POST /:id/regenerate-narrative', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().post('/bt-api/performance-summaries/summary-1/regenerate-narrative');
            expect(res.status).toBe(401);
        });

        it('returns updated summary after regenerating narrative', async () => {
            const updatedSummary = { ...mockSummary, narrative: 'Updated narrative.' };
            svc.regenerateNarrative.mockResolvedValueOnce(updatedSummary);

            const res = await getAgent()
                .post('/bt-api/performance-summaries/summary-1/regenerate-narrative')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summary.narrative).toBe('Updated narrative.');
            expect(svc.regenerateNarrative).toHaveBeenCalledWith('summary-1');
        });

        it('returns 404 when summary does not exist', async () => {
            svc.regenerateNarrative.mockResolvedValueOnce(null);

            const res = await getAgent()
                .post('/bt-api/performance-summaries/nonexistent/regenerate-narrative')
                .set('Authorization', authHeader());

            expect(res.status).toBe(404);
        });
    });

    // =========================================================================
    // GET /pitcher/:pitcherId
    // =========================================================================

    describe('GET /pitcher/:pitcherId', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/performance-summaries/pitcher/pitcher-1');
            expect(res.status).toBe(401);
        });

        it('returns paginated pitcher summaries', async () => {
            svc.getSummariesByPitcher.mockResolvedValueOnce({ summaries: [mockSummary], total_count: 1 });

            const res = await getAgent().get('/bt-api/performance-summaries/pitcher/pitcher-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.summaries).toHaveLength(1);
            expect(res.body.total_count).toBe(1);
        });

        it('forwards limit and offset params', async () => {
            svc.getSummariesByPitcher.mockResolvedValueOnce({ summaries: [], total_count: 0 });

            await getAgent()
                .get('/bt-api/performance-summaries/pitcher/pitcher-1?limit=5&offset=10')
                .set('Authorization', authHeader());

            expect(svc.getSummariesByPitcher).toHaveBeenCalledWith('pitcher-1', 5, 10);
        });
    });
});
