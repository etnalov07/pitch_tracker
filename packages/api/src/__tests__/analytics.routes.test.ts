// Analytics routes test — mocks the analytics service so each endpoint's HTTP
// contract (auth, query params, response shape) is verified without needing
// raw DB row sequences for every multi-step service method.

jest.mock('../services/analytics.service', () => ({
    __esModule: true,
    default: {
        getBatterHistory: jest.fn(),
        getBatterPitchHeatMap: jest.fn(),
        getBatterPitchLocations: jest.fn(),
        getBatterSprayChart: jest.fn(),
        getPitcherTendencies: jest.fn(),
        getPitcherLiveTendencies: jest.fn(),
        getPitcherGameLogs: jest.fn(),
        getPitcherProfile: jest.fn(),
        getPitcherHeatZones: jest.fn(),
        getHitterLiveTendencies: jest.fn(),
        getGameState: jest.fn(),
        getCountBreakdown: jest.fn(),
        getPitchChart: jest.fn(),
        getMatchupStats: jest.fn(),
    },
}));

import { getAgent, authHeader, resetMocks } from './helpers/setup';
import analyticsService from '../services/analytics.service';

const svc = analyticsService as jest.Mocked<typeof analyticsService>;

// ── Shared fixture data ───────────────────────────────────────────────────────

const emptyBreakdown = {
    game_id: 'game-1',
    pitcher_id: null,
    team_side: null,
    '1st_pitch': { total: 0, strikes: 0, strike_percentage: 0, pitch_type_breakdown: [] },
    ahead: { total: 0, strikes: 0, strike_percentage: 0, pitch_type_breakdown: [] },
    even: { total: 0, strikes: 0, strike_percentage: 0, pitch_type_breakdown: [] },
    behind: { total: 0, strikes: 0, strike_percentage: 0, pitch_type_breakdown: [] },
};

const emptyTendencies = {
    pitcher_id: 'pitcher-1',
    pitcher_name: 'John Doe',
    batter_hand: 'R' as const,
    total_pitches: 0,
    has_data: false,
    pitch_mix: [],
    zone_grid: [],
    suggested_sequence: [],
};

const emptyHitterTendencies = {
    batter_id: 'batter-1',
    batter_name: 'Jane Smith',
    batter_hand: 'R',
    total_pitches: 0,
    has_data: false,
    zone_weakness_map: [],
    pitch_type_vulnerability: [],
    early_count_swing_rate: null,
    two_strike_chase_rate: null,
    first_pitch_take_rate: null,
    suggested_sequence: [],
};

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics Routes - /bt-api/analytics', () => {
    beforeEach(() => {
        resetMocks();
        jest.clearAllMocks();
    });

    // =========================================================================
    // GET /batter/:batterId/history
    // =========================================================================

    describe('GET /batter/:batterId/history', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/batter/batter-1/history');
            expect(res.status).toBe(401);
        });

        it('returns batter history with stats and at_bats', async () => {
            svc.getBatterHistory.mockResolvedValueOnce({
                at_bats: [{ id: 'ab-1', result: 'single' }],
                stats: { total_at_bats: 1, hits: 1, strikeouts: 0, walks: 0, batting_average: '1.000' },
            });

            const res = await getAgent().get('/bt-api/analytics/batter/batter-1/history').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.at_bats).toBeDefined();
            expect(res.body.stats).toBeDefined();
            expect(svc.getBatterHistory).toHaveBeenCalledWith('batter-1', undefined, undefined);
        });

        it('forwards pitcherId query param to service', async () => {
            svc.getBatterHistory.mockResolvedValueOnce({ at_bats: [], stats: {} });

            await getAgent()
                .get('/bt-api/analytics/batter/batter-1/history?pitcherId=pitcher-99')
                .set('Authorization', authHeader());

            expect(svc.getBatterHistory).toHaveBeenCalledWith('batter-1', 'pitcher-99', undefined);
        });
    });

    // =========================================================================
    // GET /batter/:batterId/pitch-locations
    // =========================================================================

    describe('GET /batter/:batterId/pitch-locations', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/batter/batter-1/pitch-locations');
            expect(res.status).toBe(401);
        });

        it('returns array of pitch locations', async () => {
            const mockLocations = [
                { location_x: 0.5, location_y: 0.5, pitch_type: 'fastball' as const, pitch_result: 'called_strike' as const },
            ];
            svc.getBatterPitchLocations.mockResolvedValueOnce(mockLocations);

            const res = await getAgent()
                .get('/bt-api/analytics/batter/batter-1/pitch-locations')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.pitches).toEqual(mockLocations);
        });
    });

    // =========================================================================
    // GET /batter/:batterId/spray-chart
    // =========================================================================

    describe('GET /batter/:batterId/spray-chart', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/batter/batter-1/spray-chart');
            expect(res.status).toBe(401);
        });

        it('returns spray chart data', async () => {
            const mockChart = [{ field_location: 'center_field', count: 2, hit_result: 'single' }];
            svc.getBatterSprayChart.mockResolvedValueOnce(mockChart);

            const res = await getAgent().get('/bt-api/analytics/batter/batter-1/spray-chart').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.sprayChart).toEqual(mockChart);
        });

        it('forwards game_id query param to service', async () => {
            svc.getBatterSprayChart.mockResolvedValueOnce([]);

            await getAgent()
                .get('/bt-api/analytics/batter/batter-1/spray-chart?game_id=game-42')
                .set('Authorization', authHeader());

            expect(svc.getBatterSprayChart).toHaveBeenCalledWith('batter-1', 'game-42', undefined, undefined);
        });

        it('forwards opponent scope query params to service', async () => {
            svc.getBatterSprayChart.mockResolvedValueOnce([]);

            await getAgent()
                .get('/bt-api/analytics/batter/batter-1/spray-chart?opponentTeamId=team-7&opponentName=Wolves')
                .set('Authorization', authHeader());

            expect(svc.getBatterSprayChart).toHaveBeenCalledWith('batter-1', undefined, 'team-7', 'Wolves');
        });
    });

    // =========================================================================
    // GET /pitcher/:pitcherId/tendencies-live
    // =========================================================================

    describe('GET /pitcher/:pitcherId/tendencies-live', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/pitcher/pitcher-1/tendencies-live?batter_hand=R');
            expect(res.status).toBe(401);
        });

        it('returns 400 when batter_hand is missing', async () => {
            const res = await getAgent()
                .get('/bt-api/analytics/pitcher/pitcher-1/tendencies-live')
                .set('Authorization', authHeader());

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/batter_hand/i);
        });

        it('returns 400 when batter_hand is invalid', async () => {
            const res = await getAgent()
                .get('/bt-api/analytics/pitcher/pitcher-1/tendencies-live?batter_hand=X')
                .set('Authorization', authHeader());

            expect(res.status).toBe(400);
        });

        it('returns tendencies for batter_hand=R', async () => {
            svc.getPitcherLiveTendencies.mockResolvedValueOnce(emptyTendencies);

            const res = await getAgent()
                .get('/bt-api/analytics/pitcher/pitcher-1/tendencies-live?batter_hand=R')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.tendencies).toBeDefined();
            expect(svc.getPitcherLiveTendencies).toHaveBeenCalledWith('pitcher-1', 'R');
        });

        it('returns tendencies for batter_hand=L', async () => {
            svc.getPitcherLiveTendencies.mockResolvedValueOnce({ ...emptyTendencies, batter_hand: 'L' });

            const res = await getAgent()
                .get('/bt-api/analytics/pitcher/pitcher-1/tendencies-live?batter_hand=L')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(svc.getPitcherLiveTendencies).toHaveBeenCalledWith('pitcher-1', 'L');
        });
    });

    // =========================================================================
    // GET /hitter/:batterId/tendencies-live
    // =========================================================================

    describe('GET /hitter/:batterId/tendencies-live', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/hitter/batter-1/tendencies-live');
            expect(res.status).toBe(401);
        });

        it('returns tendencies for opponent batter type', async () => {
            svc.getHitterLiveTendencies.mockResolvedValueOnce(emptyHitterTendencies);

            const res = await getAgent()
                .get('/bt-api/analytics/hitter/batter-1/tendencies-live?batter_type=opponent')
                .set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.tendencies).toBeDefined();
            expect(svc.getHitterLiveTendencies).toHaveBeenCalledWith('batter-1', 'opponent');
        });

        it('defaults to opponent batter type when batter_type is absent', async () => {
            svc.getHitterLiveTendencies.mockResolvedValueOnce(emptyHitterTendencies);

            await getAgent().get('/bt-api/analytics/hitter/batter-1/tendencies-live').set('Authorization', authHeader());

            expect(svc.getHitterLiveTendencies).toHaveBeenCalledWith('batter-1', 'opponent');
        });
    });

    // =========================================================================
    // GET /game/:gameId/state
    // =========================================================================

    describe('GET /game/:gameId/state', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/game/game-1/state');
            expect(res.status).toBe(401);
        });

        it('returns game state', async () => {
            const mockState = {
                game: { id: 'game-1', status: 'in_progress', current_inning: 3 },
                current_inning: null,
                all_innings: [],
                current_at_bat: null,
            };
            svc.getGameState.mockResolvedValueOnce(mockState);

            const res = await getAgent().get('/bt-api/analytics/game/game-1/state').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.game.id).toBe('game-1');
        });
    });

    // =========================================================================
    // GET /game/:gameId/count-breakdown
    // =========================================================================

    describe('GET /game/:gameId/count-breakdown', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/game/game-1/count-breakdown');
            expect(res.status).toBe(401);
        });

        it('returns breakdown with all four buckets', async () => {
            svc.getCountBreakdown.mockResolvedValueOnce(emptyBreakdown);

            const res = await getAgent().get('/bt-api/analytics/game/game-1/count-breakdown').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.breakdown).toBeDefined();
            expect(res.body.breakdown['1st_pitch']).toBeDefined();
            expect(res.body.breakdown.ahead).toBeDefined();
            expect(res.body.breakdown.even).toBeDefined();
            expect(res.body.breakdown.behind).toBeDefined();
        });

        it('forwards pitcherId query param', async () => {
            svc.getCountBreakdown.mockResolvedValueOnce(emptyBreakdown);

            await getAgent()
                .get('/bt-api/analytics/game/game-1/count-breakdown?pitcherId=pitcher-5')
                .set('Authorization', authHeader());

            expect(svc.getCountBreakdown).toHaveBeenCalledWith('game-1', 'pitcher-5', undefined, undefined);
        });

        it('forwards team_side query param', async () => {
            svc.getCountBreakdown.mockResolvedValueOnce(emptyBreakdown);

            await getAgent()
                .get('/bt-api/analytics/game/game-1/count-breakdown?team_side=opponent')
                .set('Authorization', authHeader());

            expect(svc.getCountBreakdown).toHaveBeenCalledWith('game-1', undefined, 'opponent', undefined);
        });

        it('forwards opposingPitcherId query param for per-pitcher opponent breakdown', async () => {
            svc.getCountBreakdown.mockResolvedValueOnce(emptyBreakdown);

            await getAgent()
                .get('/bt-api/analytics/game/game-1/count-breakdown?opposingPitcherId=opp-pitcher-3')
                .set('Authorization', authHeader());

            expect(svc.getCountBreakdown).toHaveBeenCalledWith('game-1', undefined, undefined, 'opp-pitcher-3');
        });

        it('forwards all params together', async () => {
            svc.getCountBreakdown.mockResolvedValueOnce(emptyBreakdown);

            await getAgent()
                .get('/bt-api/analytics/game/game-1/count-breakdown?pitcherId=p1&team_side=home&opposingPitcherId=op1')
                .set('Authorization', authHeader());

            expect(svc.getCountBreakdown).toHaveBeenCalledWith('game-1', 'p1', 'home', 'op1');
        });
    });

    // =========================================================================
    // GET /game/:gameId/pitch-chart
    // =========================================================================

    describe('GET /game/:gameId/pitch-chart', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/game/game-1/pitch-chart');
            expect(res.status).toBe(401);
        });

        it('returns pitch chart data', async () => {
            const mockChart = {
                game_id: 'game-1',
                pitcher_id: null,
                team_side: null,
                pitch_types: ['fastball'],
                counts: { '0-0': { total: 5, strike_pct: 60, by_type: [] } },
                totals_by_type: [],
                grand_total: 5,
            };
            svc.getPitchChart.mockResolvedValueOnce(mockChart);

            const res = await getAgent().get('/bt-api/analytics/game/game-1/pitch-chart').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.chart).toBeDefined();
            expect(res.body.chart.game_id).toBe('game-1');
        });

        it('forwards pitcherId and team_side query params', async () => {
            svc.getPitchChart.mockResolvedValueOnce({ game_id: 'game-1', pitch_types: [], counts: {}, totals_by_type: [] });

            await getAgent()
                .get('/bt-api/analytics/game/game-1/pitch-chart?pitcherId=p1&team_side=home')
                .set('Authorization', authHeader());

            expect(svc.getPitchChart).toHaveBeenCalledWith('game-1', 'p1', 'home');
        });
    });

    // =========================================================================
    // GET /matchup/:batterId/:pitcherId
    // =========================================================================

    describe('GET /matchup/:batterId/:pitcherId', () => {
        it('returns 401 without auth token', async () => {
            const res = await getAgent().get('/bt-api/analytics/matchup/batter-1/pitcher-1');
            expect(res.status).toBe(401);
        });

        it('returns matchup stats', async () => {
            const mockStats = { total_at_bats: 5, hits: 2, strikeouts: 1, walks: 0, batting_avg: '0.400' };
            svc.getMatchupStats.mockResolvedValueOnce(mockStats);

            const res = await getAgent().get('/bt-api/analytics/matchup/batter-1/pitcher-1').set('Authorization', authHeader());

            expect(res.status).toBe(200);
            expect(res.body.stats).toEqual(mockStats);
            expect(svc.getMatchupStats).toHaveBeenCalledWith('batter-1', 'pitcher-1');
        });
    });
});
