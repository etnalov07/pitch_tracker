import { PitchService } from '../pitch.service';

// Mock database
jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-pitch-id'),
}));

// Mock scouting service
jest.mock('../scouting.service', () => ({
    __esModule: true,
    default: { markTendenciesStale: jest.fn() },
}));

import { query, transaction } from '../../config/database';
import scoutingService from '../scouting.service';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

describe('PitchService', () => {
    let service: PitchService;

    beforeEach(() => {
        service = new PitchService();
        jest.clearAllMocks();
    });

    // ========================================================================
    // logPitch
    // ========================================================================

    describe('logPitch', () => {
        const basePitchData = {
            at_bat_id: 'ab-1',
            game_id: 'game-1',
            pitcher_id: 'pitcher-1',
            batter_id: 'batter-1',
            pitch_type: 'fastball' as const,
            pitch_result: 'called_strike' as const,
            balls_before: 0,
            strikes_before: 0,
        };

        const mockReturnedPitch = { id: 'test-pitch-id', ...basePitchData, pitch_number: 1 };

        function setupTransaction() {
            const mockClient = {
                query: jest
                    .fn()
                    // 1st call: get max pitch number
                    .mockResolvedValueOnce({ rows: [{ max_pitch: 0 }] })
                    // 2nd call: insert pitch
                    .mockResolvedValueOnce({ rows: [mockReturnedPitch] })
                    // 3rd call: update at_bats count
                    .mockResolvedValueOnce({ rows: [] })
                    // 4th call: check existing pitch type
                    .mockResolvedValueOnce({ rows: [] })
                    // 5th call: insert pitch type
                    .mockResolvedValueOnce({ rows: [] }),
            };
            mockTransaction.mockImplementation(async (cb) => cb(mockClient as any));
            return mockClient;
        }

        it('logs a pitch successfully (called_strike)', async () => {
            setupTransaction();
            const result = await service.logPitch(basePitchData);
            expect(result).toEqual(mockReturnedPitch);
            expect(mockTransaction).toHaveBeenCalledTimes(1);
        });

        it('increments balls on ball result', async () => {
            const client = setupTransaction();
            await service.logPitch({ ...basePitchData, pitch_result: 'ball' as const, balls_before: 1 });

            // 3rd client.query call is UPDATE at_bats SET balls = $1, strikes = $2
            const updateCall = client.query.mock.calls[2];
            expect(updateCall[1][0]).toBe(2); // balls: 1 + 1 = 2
            expect(updateCall[1][1]).toBe(0); // strikes unchanged
        });

        it('does not increment strikes on foul with 2 strikes', async () => {
            const client = setupTransaction();
            await service.logPitch({
                ...basePitchData,
                pitch_result: 'foul' as const,
                strikes_before: 2,
            });

            const updateCall = client.query.mock.calls[2];
            expect(updateCall[1][1]).toBe(2); // strikes stay at 2
        });

        it('increments strikes on foul with less than 2 strikes', async () => {
            const client = setupTransaction();
            await service.logPitch({
                ...basePitchData,
                pitch_result: 'foul' as const,
                strikes_before: 1,
            });

            const updateCall = client.query.mock.calls[2];
            expect(updateCall[1][1]).toBe(2); // strikes: 1 + 1 = 2
        });

        it('increments strikes on swinging_strike', async () => {
            const client = setupTransaction();
            await service.logPitch({
                ...basePitchData,
                pitch_result: 'swinging_strike' as const,
                strikes_before: 0,
            });

            const updateCall = client.query.mock.calls[2];
            expect(updateCall[1][1]).toBe(1); // strikes: 0 + 1 = 1
        });

        it('throws on missing required fields', async () => {
            await expect(service.logPitch({ at_bat_id: 'ab-1' } as any)).rejects.toThrow('Required fields missing');
        });

        it('throws when neither batter_id nor opponent_batter_id provided', async () => {
            await expect(
                service.logPitch({
                    at_bat_id: 'ab-1',
                    game_id: 'game-1',
                    pitcher_id: 'pitcher-1',
                    pitch_type: 'fastball',
                    pitch_result: 'ball' as const,
                })
            ).rejects.toThrow('Either batter_id or opponent_batter_id is required');
        });

        it('marks scouting tendencies as stale for opponent batters', async () => {
            setupTransaction();
            await service.logPitch({
                ...basePitchData,
                batter_id: undefined,
                opponent_batter_id: 'opp-batter-1',
            });

            expect(scoutingService.markTendenciesStale).toHaveBeenCalledWith('opp-batter-1');
        });

        it('does not mark tendencies stale for own-team batters', async () => {
            setupTransaction();
            await service.logPitch(basePitchData);
            expect(scoutingService.markTendenciesStale).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // getPitchesByAtBat
    // ========================================================================

    describe('getPitchesByAtBat', () => {
        it('returns pitches ordered by pitch_number', async () => {
            const mockPitches = [
                { id: 'p1', pitch_number: 1 },
                { id: 'p2', pitch_number: 2 },
            ];
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const result = await service.getPitchesByAtBat('ab-1');
            expect(result).toEqual(mockPitches);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('at_bat_id'), ['ab-1']);
        });
    });

    // ========================================================================
    // getPitchesByGame
    // ========================================================================

    describe('getPitchesByGame', () => {
        it('returns pitches with player names', async () => {
            const mockPitches = [{ id: 'p1', batter_first_name: 'John', pitcher_first_name: 'Mike' }];
            mockQuery.mockResolvedValueOnce({ rows: mockPitches } as any);

            const result = await service.getPitchesByGame('game-1');
            expect(result).toEqual(mockPitches);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('game_id'), ['game-1']);
        });
    });
});
