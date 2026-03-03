import { AtBatService } from '../atBat.service';

jest.mock('../../config/database', () => ({
    query: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-ab-id'),
}));

import { query } from '../../config/database';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('AtBatService', () => {
    let service: AtBatService;

    beforeEach(() => {
        service = new AtBatService();
        jest.clearAllMocks();
    });

    // ========================================================================
    // createAtBat
    // ========================================================================

    describe('createAtBat', () => {
        const validData = {
            game_id: 'game-1',
            inning_id: 'inning-1',
            pitcher_id: 'pitcher-1',
            batter_id: 'batter-1',
            outs_before: 0,
        };

        it('creates an at-bat successfully', async () => {
            const mockAtBat = { id: 'test-ab-id', ...validData };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const result = await service.createAtBat(validData);
            expect(result).toEqual(mockAtBat);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO at_bats'), expect.any(Array));
        });

        it('creates at-bat with opponent_batter_id', async () => {
            const oppData = {
                ...validData,
                batter_id: undefined,
                opponent_batter_id: 'opp-1',
            };
            const mockAtBat = { id: 'test-ab-id', ...oppData };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const result = await service.createAtBat(oppData);
            expect(result).toEqual(mockAtBat);
        });

        it('throws when required fields are missing', async () => {
            await expect(service.createAtBat({ game_id: 'game-1' } as any)).rejects.toThrow(
                'game_id, inning_id, pitcher_id, and outs_before are required'
            );
        });

        it('throws when neither batter_id nor opponent_batter_id provided', async () => {
            await expect(
                service.createAtBat({
                    game_id: 'game-1',
                    inning_id: 'inning-1',
                    pitcher_id: 'pitcher-1',
                    outs_before: 0,
                })
            ).rejects.toThrow('Either batter_id or opponent_batter_id is required');
        });
    });

    // ========================================================================
    // getAtBatById
    // ========================================================================

    describe('getAtBatById', () => {
        it('returns at-bat with player names when found', async () => {
            const mockAtBat = {
                id: 'ab-1',
                batter_first_name: 'John',
                batter_last_name: 'Doe',
                pitcher_first_name: 'Mike',
                pitcher_last_name: 'Smith',
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const result = await service.getAtBatById('ab-1');
            expect(result).toEqual(mockAtBat);
        });

        it('returns null when not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getAtBatById('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ========================================================================
    // updateAtBat
    // ========================================================================

    describe('updateAtBat', () => {
        it('updates at-bat with partial fields', async () => {
            const updates = { balls: 2, strikes: 1 };
            const mockAtBat = { id: 'ab-1', ...updates };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const result = await service.updateAtBat('ab-1', updates);
            expect(result).toEqual(mockAtBat);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('COALESCE'), expect.arrayContaining([2, 1, 'ab-1']));
        });
    });

    // ========================================================================
    // endAtBat
    // ========================================================================

    describe('endAtBat', () => {
        it('ends at-bat with result and stats', async () => {
            const mockAtBat = {
                id: 'ab-1',
                result: 'single',
                outs_after: 0,
                rbi: 1,
                runs_scored: 1,
            };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            const result = await service.endAtBat('ab-1', 'single', 0, 1, 1);
            expect(result).toEqual(mockAtBat);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('result'), ['single', 0, 1, 1, 'ab-1']);
        });

        it('defaults rbi and runsScored to 0', async () => {
            const mockAtBat = { id: 'ab-1', result: 'groundout', outs_after: 1, rbi: 0, runs_scored: 0 };
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);

            await service.endAtBat('ab-1', 'groundout', 1);
            expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['groundout', 1, 0, 0, 'ab-1']);
        });
    });

    // ========================================================================
    // getAtBatWithPitches
    // ========================================================================

    describe('getAtBatWithPitches', () => {
        it('returns at-bat combined with pitches', async () => {
            const mockAtBat = { id: 'ab-1', batter_first_name: 'John' };
            const mockPitches = [
                { id: 'p1', pitch_number: 1 },
                { id: 'p2', pitch_number: 2 },
            ];

            // First call: getAtBatById
            mockQuery.mockResolvedValueOnce({ rows: [mockAtBat] } as any);
            // Second call: pitches query
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const result = await service.getAtBatWithPitches('ab-1');
            expect(result).toEqual({ ...mockAtBat, pitches: mockPitches });
        });

        it('returns null when at-bat not found', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] } as any);

            const result = await service.getAtBatWithPitches('nonexistent');
            expect(result).toBeNull();
        });
    });
});
