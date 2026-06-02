import { AnalyticsService } from '../analytics.service';

jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

import { query } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    beforeEach(() => {
        service = new AnalyticsService();
        jest.clearAllMocks();
    });

    // ========================================================================
    // getGameState
    // ========================================================================

    describe('getGameState', () => {
        it('returns game state for a game with an away team', async () => {
            const mockGame = {
                id: 'game-1',
                home_team_id: 'team-1',
                away_team_id: 'team-2',
                home_team_name: 'Home Team',
                away_team_name: 'Away Team',
                current_inning: 1,
                inning_half: 'top',
                status: 'in_progress',
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockGame] } as any) // game query
                .mockResolvedValueOnce({ rows: [] } as any) // inning query
                .mockResolvedValueOnce({ rows: [] } as any) // all innings query
                .mockResolvedValueOnce({ rows: [] } as any); // current at-bat query

            const result = await service.getGameState('game-1');
            expect(result.game.id).toBe('game-1');
        });

        it('uses LEFT JOIN for away team so games without away_team_id still load', async () => {
            // Games without away_team_id (e.g. bullpen sessions, intra-squad) must still load.
            // An INNER JOIN causes the query to return 0 rows → "Game not found".
            // Verify the SQL uses LEFT JOIN so the query is NULL-safe.
            const mockGame = {
                id: 'game-2',
                home_team_id: 'team-1',
                away_team_id: null,
                home_team_name: 'Home Team',
                away_team_name: null,
                current_inning: 1,
                inning_half: 'top',
                status: 'in_progress',
            };
            mockQuery
                .mockResolvedValueOnce({ rows: [mockGame] } as any)
                .mockResolvedValueOnce({ rows: [] } as any)
                .mockResolvedValueOnce({ rows: [] } as any)
                .mockResolvedValueOnce({ rows: [] } as any);

            await service.getGameState('game-2');

            // The first query call must use LEFT JOIN — not INNER JOIN — on away_team_id
            const firstCallSql: string = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(firstCallSql).toMatch(/LEFT JOIN teams at ON g\.away_team_id/i);
        });

        it('throws "Game not found" for a genuinely missing game ID', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            await expect(service.getGameState('nonexistent-id')).rejects.toThrow('Game not found');
        });
    });

    // ========================================================================
    // getCountBreakdown
    // ========================================================================

    describe('getCountBreakdown', () => {
        it('uses JOIN path when opposingPitcherId is provided', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getCountBreakdown('game-1', undefined, undefined, 'opp-pitcher-1');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).toMatch(/JOIN at_bats/i);
            expect(mockQuery.mock.calls[0][1]).toEqual(['game-1', 'opp-pitcher-1']);
        });

        it('does NOT use JOIN path when only pitcherId is provided', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getCountBreakdown('game-1', 'pitcher-1');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).not.toMatch(/JOIN at_bats/i);
            expect(sql).toMatch(/pitcher_id/i);
        });

        it('adds team_side filter when teamSide is provided', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getCountBreakdown('game-1', undefined, 'opponent');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).toMatch(/team_side/i);
            expect(mockQuery.mock.calls[0][1]).toContain('opponent');
        });

        it('returns all-zero buckets when no pitches are returned', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result['1st_pitch'].total).toBe(0);
            expect(result.ahead.total).toBe(0);
            expect(result.even.total).toBe(0);
            expect(result.behind.total).toBe(0);
        });

        it('buckets 0-0 count as 1st_pitch with correct strike calculation', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { balls_before: '0', strikes_before: '0', pitch_type: 'fastball', pitch_result: 'called_strike', count: '5' },
                    { balls_before: '0', strikes_before: '0', pitch_type: 'fastball', pitch_result: 'ball', count: '3' },
                ],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result['1st_pitch'].total).toBe(8);
            expect(result['1st_pitch'].strikes).toBe(5);
            expect(result['1st_pitch'].strike_percentage).toBe(63);
        });

        it('buckets s > b as ahead', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ balls_before: '0', strikes_before: '1', pitch_type: 'slider', pitch_result: 'ball', count: '4' }],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result.ahead.total).toBe(4);
            expect(result.ahead.strikes).toBe(0);
            expect(result['1st_pitch'].total).toBe(0);
        });

        it('buckets b > s as behind', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { balls_before: '2', strikes_before: '0', pitch_type: 'curveball', pitch_result: 'called_strike', count: '2' },
                ],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result.behind.total).toBe(2);
            expect(result.behind.strikes).toBe(2);
        });

        it('buckets b === s (non-zero) as even', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ balls_before: '1', strikes_before: '1', pitch_type: 'changeup', pitch_result: 'ball', count: '6' }],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result.even.total).toBe(6);
        });

        it('treats foul as a strike for bucket counting', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [{ balls_before: '1', strikes_before: '0', pitch_type: 'fastball', pitch_result: 'foul', count: '3' }],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            expect(result.behind.strikes).toBe(3);
        });

        it('builds pitch_type_breakdown inside each bucket', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    { balls_before: '0', strikes_before: '0', pitch_type: 'fastball', pitch_result: 'called_strike', count: '4' },
                    { balls_before: '0', strikes_before: '0', pitch_type: 'slider', pitch_result: 'ball', count: '2' },
                ],
            } as any);

            const result = await service.getCountBreakdown('game-1');

            const types = result['1st_pitch'].pitch_type_breakdown.map((t: any) => t.pitch_type);
            expect(types).toContain('fastball');
            expect(types).toContain('slider');
            const fb = result['1st_pitch'].pitch_type_breakdown.find((t: any) => t.pitch_type === 'fastball');
            expect(fb.count).toBe(4);
            expect(fb.strike_percentage).toBe(100);
        });
    });

    // ========================================================================
    // getPitcherLiveTendencies
    // ========================================================================

    describe('getPitcherLiveTendencies', () => {
        it('returns has_data=false when fewer than 10 pitches exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ first_name: 'John', last_name: 'Doe' }] } as any).mockResolvedValueOnce({
                rows: Array(5).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'called_strike',
                    velocity: '90',
                    zone: '1-1',
                    location_x: null,
                    location_y: null,
                }),
            } as any);

            const result = await service.getPitcherLiveTendencies('pitcher-1', 'R');

            expect(result.has_data).toBe(false);
            expect(result.total_pitches).toBe(5);
            expect(result.pitch_mix).toEqual([]);
            expect(result.zone_grid).toEqual([]);
        });

        it('returns has_data=true with pitch_mix and zone_grid when 10+ pitches exist', async () => {
            const pitches = Array(15).fill({
                pitch_type: 'fastball',
                pitch_result: 'called_strike',
                velocity: '92',
                zone: '1-1',
                location_x: null,
                location_y: null,
            });

            mockQuery
                .mockResolvedValueOnce({ rows: [{ first_name: 'Jane', last_name: 'Smith' }] } as any)
                .mockResolvedValueOnce({ rows: pitches } as any);

            const result = await service.getPitcherLiveTendencies('pitcher-1', 'L');

            expect(result.has_data).toBe(true);
            expect(result.total_pitches).toBe(15);
            expect(result.pitch_mix).toHaveLength(1);
            expect(result.pitch_mix[0].pitch_type).toBe('fastball');
            expect(result.pitch_mix[0].usage_pct).toBe(100);
            expect(result.zone_grid).toHaveLength(9);
        });

        it('uses pitcher name from player lookup', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ first_name: 'Alex', last_name: 'Rivera' }] } as any)
                .mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getPitcherLiveTendencies('pitcher-2', 'R');

            expect(result.pitcher_name).toBe('Alex Rivera');
        });

        it('falls back to "Unknown" when player not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any).mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getPitcherLiveTendencies('ghost-pitcher', 'R');

            expect(result.pitcher_name).toBe('Unknown');
        });
    });

    // ========================================================================
    // getPitcherEffectiveness
    // ========================================================================

    describe('getPitcherEffectiveness', () => {
        const player = { first_name: 'Sandy', last_name: 'Koufax' };

        it('returns has_data=false when fewer than 15 pitches exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [player] } as any).mockResolvedValueOnce({
                rows: Array(10).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'called_strike',
                    location_x: 0.5,
                    location_y: 0.5,
                    zone: 'MM',
                    game_id: 'g1',
                }),
            } as any);

            const result = await service.getPitcherEffectiveness('pitcher-1', { batter_hand: 'R' });

            expect(result.has_data).toBe(false);
            expect(result.total_pitches).toBe(10);
            expect(result.pitch_types).toEqual([]);
            expect(result.window).toBe('career');
        });

        it('aggregates strike% and whiff% per pitch type when ≥15 pitches exist', async () => {
            // 15 fastballs vs RHH: 12 strikes (8 called, 2 swinging, 2 in_play), 3 balls
            const fastballs = [
                ...Array(8).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'called_strike',
                    location_x: 0.5,
                    location_y: 0.5,
                    zone: null,
                    game_id: 'g1',
                }),
                ...Array(2).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'swinging_strike',
                    location_x: 0.5,
                    location_y: 0.5,
                    zone: null,
                    game_id: 'g1',
                }),
                ...Array(2).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'in_play',
                    location_x: 0.5,
                    location_y: 0.5,
                    zone: null,
                    game_id: 'g1',
                }),
                ...Array(3).fill({
                    pitch_type: 'fastball',
                    pitch_result: 'ball',
                    location_x: 0.5,
                    location_y: 0.5,
                    zone: null,
                    game_id: 'g1',
                }),
            ];
            mockQuery.mockResolvedValueOnce({ rows: [player] } as any).mockResolvedValueOnce({ rows: fastballs } as any);

            const result = await service.getPitcherEffectiveness('pitcher-1', { batter_hand: 'R' });

            expect(result.has_data).toBe(true);
            expect(result.total_pitches).toBe(15);
            expect(result.pitch_types).toHaveLength(1);
            const fb = result.pitch_types[0];
            expect(fb.pitch_type).toBe('fastball');
            expect(fb.n).toBe(15);
            expect(fb.strike_pct).toBe(80); // 12/15
            // 4 swings (2 swinging_strike + 2 in_play), 2 whiffs → 50%
            expect(fb.whiff_pct).toBe(50);
            // all pitches at (0.5, 0.5) → MM zone (inside)
            expect(fb.in_zone_pct).toBe(100);
            expect(fb.best_zone_id).toBe('MM');
            expect(fb.by_zone.find((z) => z.zone === 'MM')?.n).toBe(15);
        });

        it('mirrors LHH x so the right column reads as inside', async () => {
            // 15 pitches at x=0.1 (left of plate). For LHH, mirror → x=0.9 → TR/MR/BR column.
            const pitches = Array(15).fill({
                pitch_type: 'slider',
                pitch_result: 'called_strike',
                location_x: 0.1,
                location_y: 0.5, // middle vertical → MR after mirror
                zone: null,
                game_id: 'g1',
            });
            mockQuery.mockResolvedValueOnce({ rows: [player] } as any).mockResolvedValueOnce({ rows: pitches } as any);

            const result = await service.getPitcherEffectiveness('pitcher-1', { batter_hand: 'L' });

            const slider = result.pitch_types[0];
            // After LHH mirror (x = 1 - 0.1 = 0.9), y = 0.5 → MR (Middle Right)
            expect(slider.by_zone.find((z) => z.zone === 'MR')?.n).toBe(15);
            expect(slider.best_zone_id).toBe('MR');
        });

        it('requires game_id when window=current_game', async () => {
            await expect(
                service.getPitcherEffectiveness('pitcher-1', { batter_hand: 'R', window: 'current_game' })
            ).rejects.toThrow(/game_id is required/);
        });

        it('scopes the query to game_id when window=current_game', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [player] } as any).mockResolvedValueOnce({ rows: [] } as any);

            await service.getPitcherEffectiveness('pitcher-1', {
                batter_hand: 'R',
                window: 'current_game',
                game_id: 'game-42',
            });

            const [, paramsArg] = mockQuery.mock.calls[1];
            expect(paramsArg).toEqual(['pitcher-1', 'R', 'game-42']);
        });

        it('best_zone_id is null when no inside zone has n ≥ 5', async () => {
            // 15 pitches scattered: 4 in MM, 4 in TM, 4 in BM, 3 in ML — none reach 5
            const pts = [
                ...Array(4).fill({
                    pitch_type: 'curveball',
                    pitch_result: 'ball',
                    location_x: 0.5,
                    location_y: 0.5,
                    game_id: 'g1',
                }),
                ...Array(4).fill({
                    pitch_type: 'curveball',
                    pitch_result: 'ball',
                    location_x: 0.5,
                    location_y: 0.1,
                    game_id: 'g1',
                }),
                ...Array(4).fill({
                    pitch_type: 'curveball',
                    pitch_result: 'ball',
                    location_x: 0.5,
                    location_y: 0.9,
                    game_id: 'g1',
                }),
                ...Array(3).fill({
                    pitch_type: 'curveball',
                    pitch_result: 'ball',
                    location_x: 0.1,
                    location_y: 0.5,
                    game_id: 'g1',
                }),
            ];
            mockQuery.mockResolvedValueOnce({ rows: [player] } as any).mockResolvedValueOnce({ rows: pts } as any);

            const result = await service.getPitcherEffectiveness('pitcher-1', { batter_hand: 'R' });
            expect(result.pitch_types[0].best_zone_id).toBeNull();
        });
    });

    // ========================================================================
    // getHitterLiveTendencies
    // ========================================================================

    describe('getHitterLiveTendencies', () => {
        it('returns has_data=false for team batter with fewer than 5 pitches', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ first_name: 'Chris', last_name: 'Jones', bats: 'L' }] } as any)
                .mockResolvedValueOnce({
                    rows: [{ pitch_type: 'fastball', pitch_result: 'ball', zone: null, location_x: null, location_y: null }],
                } as any);

            const result = await service.getHitterLiveTendencies('batter-1', 'team');

            expect(result.has_data).toBe(false);
            expect(result.batter_hand).toBe('L');
        });

        it('returns has_data=true with zone_weakness_map when 5+ pitches for team batter', async () => {
            const pitches = Array(10).fill({
                pitch_type: 'fastball',
                pitch_result: 'swinging_strike',
                zone: '1-1',
                location_x: null,
                location_y: null,
            });

            mockQuery
                .mockResolvedValueOnce({ rows: [{ first_name: 'Sam', last_name: 'Lee', bats: 'R' }] } as any)
                .mockResolvedValueOnce({ rows: pitches } as any);

            const result = await service.getHitterLiveTendencies('batter-2', 'team');

            expect(result.has_data).toBe(true);
            expect(result.zone_weakness_map).toHaveLength(9);
            expect(result.pitch_type_vulnerability).toHaveLength(1);
            expect(result.pitch_type_vulnerability[0].pitch_type).toBe('fastball');
        });

        it('queries opponent_lineup for opponent batter type', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ player_name: 'Opp Batter', bats: 'R' }] } as any)
                .mockResolvedValueOnce({ rows: [] } as any) // pitches (< 5 → fallback to scouting)
                .mockResolvedValueOnce({ rows: [] } as any); // scouting profile lookup

            await service.getHitterLiveTendencies('opp-batter-1', 'opponent');

            const firstCallSql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(firstCallSql).toMatch(/opponent_lineup/i);
        });

        it('defaults batter_hand to R when bats column is null', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ first_name: 'Pat', last_name: 'Kim', bats: null }] } as any)
                .mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getHitterLiveTendencies('batter-3', 'team');

            expect(result.batter_hand).toBe('R');
        });
    });

    // ========================================================================
    // getBatterPitchLocations
    // ========================================================================

    describe('getBatterPitchLocations', () => {
        it('resolves the batter through at_bats so opponent batters are matched', async () => {
            // Opponent-batter pitches aren't reliably tagged with
            // pitches.opponent_batter_id; the at_bats join is the reliable path.
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getBatterPitchLocations('opp-batter-1');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).toMatch(/LEFT JOIN at_bats ab ON ab\.id = p\.at_bat_id/i);
            expect(sql).toMatch(/ab\.opponent_batter_id = \$1/i);
            expect(mockQuery.mock.calls[0][1]).toEqual(['opp-batter-1']);
        });

        it('still matches our-team batters via pitches.batter_id', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getBatterPitchLocations('our-batter-1');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).toMatch(/p\.batter_id = \$1/i);
        });

        it('joins games when an opponent team scope is given', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            await service.getBatterPitchLocations('b1', undefined, 'opp-team-9');

            const sql = (mockQuery.mock.calls[0][0] as string).replace(/\s+/g, ' ');
            expect(sql).toMatch(/JOIN games g ON p\.game_id = g\.id/i);
            expect(sql).toMatch(/LEFT JOIN at_bats ab/i);
            expect(mockQuery.mock.calls[0][1]).toContain('opp-team-9');
        });

        it('maps returned rows to PitchLocationData', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        location_x: '0.5',
                        location_y: '-0.2',
                        pitch_type: 'slider',
                        pitch_result: 'ball',
                        velocity: '84',
                        target_location_x: '0.4',
                        target_location_y: '-0.1',
                        balls_before: '1',
                        strikes_before: '2',
                    },
                ],
            } as any);

            const result = await service.getBatterPitchLocations('b1');

            expect(result).toHaveLength(1);
            expect(result[0].location_x).toBe(0.5);
            expect(result[0].pitch_type).toBe('slider');
            expect(result[0].strikes_before).toBe(2);
        });
    });
});
