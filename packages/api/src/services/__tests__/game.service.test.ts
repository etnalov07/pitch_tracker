import { GameService } from '../game.service';

jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid'),
}));

import { query, transaction } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('GameService', () => {
    let service: GameService;

    beforeEach(() => {
        service = new GameService();
        jest.clearAllMocks();
    });

    // ========================================================================
    // createGame
    // ========================================================================

    describe('createGame', () => {
        const validGameData = {
            home_team_id: 'team-1',
            opponent_name: 'Rival Team',
            game_date: '2025-06-15',
            is_home_game: true,
        };

        it('creates a game successfully', async () => {
            const mockGame = { id: 'test-uuid', ...validGameData, status: 'scheduled' };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const result = await service.createGame('user-1', validGameData);
            expect(result).toEqual(mockGame);
            expect(mockQuery).toHaveBeenCalledTimes(1);
        });

        it('throws when home_team_id is missing', async () => {
            await expect(service.createGame('user-1', { opponent_name: 'Team' })).rejects.toThrow('home_team_id is required');
        });

        it('throws when neither away_team_id nor opponent_name provided', async () => {
            await expect(service.createGame('user-1', { home_team_id: 'team-1' })).rejects.toThrow(
                'Either away_team_id or opponent_name is required'
            );
        });

        it('throws when home and away teams are the same', async () => {
            await expect(
                service.createGame('user-1', {
                    home_team_id: 'team-1',
                    away_team_id: 'team-1',
                })
            ).rejects.toThrow('Home and away teams must be different');
        });
    });

    // ========================================================================
    // getGameById
    // ========================================================================

    describe('getGameById', () => {
        it('returns game when found', async () => {
            const mockGame = { id: 'game-1', home_team_name: 'Tigers', total_pitches: 45 };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const result = await service.getGameById('game-1');
            expect(result).toEqual(mockGame);
        });

        it('returns null when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getGameById('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ========================================================================
    // startGame
    // ========================================================================

    describe('startGame', () => {
        it('sets status to in_progress and creates first inning', async () => {
            const mockGame = {
                id: 'game-1',
                status: 'in_progress',
                current_inning: 1,
                inning_half: 'top',
                is_home_game: true,
                home_team_id: 'team-1',
                away_team_id: 'team-2',
            };

            mockTransaction.mockImplementation(async (cb) => {
                const mockClient = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [mockGame] }) // UPDATE game
                        .mockResolvedValueOnce({ rows: [] }), // INSERT inning
                };
                return cb(mockClient as any);
            });

            const result = await service.startGame('game-1');
            expect(result).toEqual(mockGame);
            expect(mockTransaction).toHaveBeenCalledTimes(1);
        });
    });

    // ========================================================================
    // advanceInning
    // ========================================================================

    describe('advanceInning', () => {
        it('advances from top to bottom of same inning', async () => {
            // Mock getGameById (uses query)
            const currentGame = {
                id: 'game-1',
                current_inning: 1,
                inning_half: 'top',
                is_home_game: true,
                home_team_id: 'team-1',
                away_team_id: 'team-2',
            };
            mockQuery.mockResolvedValueOnce({ rows: [currentGame] } as any);

            const updatedGame = { ...currentGame, inning_half: 'bottom' };
            mockTransaction.mockImplementation(async (cb) => {
                const mockClient = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [updatedGame] }) // UPDATE game
                        .mockResolvedValueOnce({ rows: [] }), // INSERT inning
                };
                return cb(mockClient as any);
            });

            const result = await service.advanceInning('game-1');
            expect(result.inning_half).toBe('bottom');
        });

        it('advances from bottom to top of next inning', async () => {
            const currentGame = {
                id: 'game-1',
                current_inning: 3,
                inning_half: 'bottom',
                is_home_game: true,
                home_team_id: 'team-1',
                away_team_id: 'team-2',
            };
            mockQuery.mockResolvedValueOnce({ rows: [currentGame] } as any);

            const updatedGame = { ...currentGame, current_inning: 4, inning_half: 'top' };
            mockTransaction.mockImplementation(async (cb) => {
                const mockClient = {
                    query: jest
                        .fn()
                        .mockResolvedValueOnce({ rows: [updatedGame] })
                        .mockResolvedValueOnce({ rows: [] }),
                };
                return cb(mockClient as any);
            });

            const result = await service.advanceInning('game-1');
            expect(result.current_inning).toBe(4);
            expect(result.inning_half).toBe('top');
        });

        it('throws when game not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            await expect(service.advanceInning('nonexistent')).rejects.toThrow('Game not found');
        });
    });

    // ========================================================================
    // endGame
    // ========================================================================

    describe('endGame', () => {
        it('sets status to completed', async () => {
            const mockGame = { id: 'game-1', status: 'completed' };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const result = await service.endGame('game-1');
            expect(result.status).toBe('completed');
        });
    });

    // ========================================================================
    // updateBaseRunners
    // ========================================================================

    describe('updateBaseRunners', () => {
        it('updates base runners JSON', async () => {
            const runners = { first: true, second: false, third: true };
            const mockGame = { id: 'game-1', base_runners: runners };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const result = await service.updateBaseRunners('game-1', runners);
            expect(result.base_runners).toEqual(runners);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('base_runners'), [JSON.stringify(runners), 'game-1']);
        });

        it('throws when game not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            await expect(service.updateBaseRunners('nonexistent', { first: false, second: false, third: false })).rejects.toThrow(
                'Game not found'
            );
        });
    });

    // ========================================================================
    // getBaseRunners
    // ========================================================================

    describe('getBaseRunners', () => {
        it('returns base runners from game', async () => {
            const runners = { first: true, second: true, third: false };
            mockQuery.mockResolvedValueOnce({ rows: [{ base_runners: runners }] } as any);

            const result = await service.getBaseRunners('game-1');
            expect(result).toEqual(runners);
        });

        it('returns defaults when base_runners is null', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [{ base_runners: null }] } as any);

            const result = await service.getBaseRunners('game-1');
            expect(result).toEqual({ first: false, second: false, third: false });
        });

        it('throws when game not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            await expect(service.getBaseRunners('nonexistent')).rejects.toThrow('Game not found');
        });
    });

    // ========================================================================
    // toggleHomeAway
    // ========================================================================

    describe('toggleHomeAway', () => {
        it('toggles is_home_game', async () => {
            const mockGame = { id: 'game-1', is_home_game: false };
            mockQuery.mockResolvedValueOnce({ rows: [mockGame] } as any);

            const result = await service.toggleHomeAway('game-1');
            expect(result.is_home_game).toBe(false);
        });

        it('throws when game not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);
            await expect(service.toggleHomeAway('nonexistent')).rejects.toThrow('Game not found');
        });
    });
});
