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
});
