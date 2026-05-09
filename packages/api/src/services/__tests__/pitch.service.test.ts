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

        const mockSnapshotRow = {
            balls: 0,
            strikes: 0,
            result: null,
            outs_after: 0,
            rbi: 0,
            runs_scored: 0,
            ab_end_time: null,
            base_runners: { first: false, second: false, third: false },
            home_score: 0,
            away_score: 0,
        };

        function setupTransaction(snapshot = mockSnapshotRow) {
            const mockClient = {
                query: jest
                    .fn()
                    // 1st call: get max pitch number
                    .mockResolvedValueOnce({ rows: [{ max_pitch: 0 }] })
                    // 2nd call: snapshot pre-pitch state
                    .mockResolvedValueOnce({ rows: [snapshot] })
                    // 3rd call: insert pitch
                    .mockResolvedValueOnce({ rows: [mockReturnedPitch] })
                    // 4th call: update at_bats count
                    .mockResolvedValueOnce({ rows: [] })
                    // 5th call: check existing pitch type
                    .mockResolvedValueOnce({ rows: [] })
                    // 6th call: insert pitch type
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
            const updateCall = client.query.mock.calls[3];
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

            const updateCall = client.query.mock.calls[3];
            expect(updateCall[1][1]).toBe(2); // strikes stay at 2
        });

        it('increments strikes on foul with less than 2 strikes', async () => {
            const client = setupTransaction();
            await service.logPitch({
                ...basePitchData,
                pitch_result: 'foul' as const,
                strikes_before: 1,
            });

            const updateCall = client.query.mock.calls[3];
            expect(updateCall[1][1]).toBe(2); // strikes: 1 + 1 = 2
        });

        it('increments strikes on swinging_strike', async () => {
            const client = setupTransaction();
            await service.logPitch({
                ...basePitchData,
                pitch_result: 'swinging_strike' as const,
                strikes_before: 0,
            });

            const updateCall = client.query.mock.calls[3];
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

        it('captures pre-pitch snapshot in INSERT (prev_state column)', async () => {
            const snap = {
                balls: 1,
                strikes: 2,
                result: null,
                outs_after: 1,
                rbi: 0,
                runs_scored: 0,
                ab_end_time: null,
                base_runners: { first: true, second: false, third: true },
                home_score: 3,
                away_score: 2,
            };
            const client = setupTransaction(snap);
            await service.logPitch({ ...basePitchData, balls_before: 1, strikes_before: 2 });

            // INSERT pitch is the 3rd client.query call; prev_state is the 20th param (index 19)
            const insertCall = client.query.mock.calls[2];
            const prevStateJson = insertCall[1][19];
            const prevState = JSON.parse(prevStateJson);
            expect(prevState.at_bat).toEqual({
                balls: 1,
                strikes: 2,
                result: null,
                outs_after: 1,
                rbi: 0,
                runs_scored: 0,
                ab_end_time: null,
            });
            expect(prevState.game).toEqual({
                base_runners: { first: true, second: false, third: true },
                home_score: 3,
                away_score: 2,
            });
        });

        it('snapshot defaults base_runners when null', async () => {
            const client = setupTransaction({ ...mockSnapshotRow, base_runners: null as any });
            await service.logPitch(basePitchData);
            const insertCall = client.query.mock.calls[2];
            const prevState = JSON.parse(insertCall[1][19]);
            expect(prevState.game.base_runners).toEqual({ first: false, second: false, third: false });
        });

        it('throws if at_bat snapshot missing', async () => {
            const mockClient = {
                query: jest
                    .fn()
                    .mockResolvedValueOnce({ rows: [{ max_pitch: 0 }] })
                    .mockResolvedValueOnce({ rows: [] }),
            };
            mockTransaction.mockImplementation(async (cb) => cb(mockClient as any));
            await expect(service.logPitch(basePitchData)).rejects.toThrow('At-bat not found');
        });
    });

    // ========================================================================
    // undoPitch
    // ========================================================================

    describe('undoPitch', () => {
        const sampleSnapshot = {
            at_bat: {
                balls: 1,
                strikes: 1,
                result: null,
                outs_after: 0,
                rbi: 0,
                runs_scored: 0,
                ab_end_time: null,
            },
            game: {
                base_runners: { first: true, second: false, third: false },
                home_score: 1,
                away_score: 2,
            },
        };

        function buildPitchRow(overrides: Partial<any> = {}) {
            return {
                id: 'pitch-1',
                at_bat_id: 'ab-1',
                game_id: 'game-1',
                opponent_batter_id: null,
                created_at: '2026-01-01T00:00:00Z',
                pitch_number: 3,
                prev_state: sampleSnapshot,
                ...overrides,
            };
        }

        function setupUndo(opts: { pitchRow?: any | null; latestId?: string; atBatRow?: any; gameRow?: any }) {
            const pitchRow = opts.pitchRow === null ? null : (opts.pitchRow ?? buildPitchRow());
            const latestId = opts.latestId ?? pitchRow?.id ?? 'pitch-1';
            const atBatRow = opts.atBatRow ?? { id: 'ab-1', balls: 1, strikes: 1, result: null };
            const gameRow = opts.gameRow ?? { id: 'game-1', base_runners: { first: true, second: false, third: false } };

            const calls: { query: jest.Mock } = { query: jest.fn() };
            calls.query
                // 1. SELECT pitch
                .mockResolvedValueOnce({ rows: pitchRow ? [pitchRow] : [] })
                // 2. SELECT latest pitch
                .mockResolvedValueOnce({ rows: latestId ? [{ id: latestId }] : [] })
                // 3. DELETE baserunner_events
                .mockResolvedValueOnce({ rows: [] })
                // 4. UPDATE at_bats
                .mockResolvedValueOnce({ rows: [atBatRow] })
                // 5. UPDATE games
                .mockResolvedValueOnce({ rows: [gameRow] })
                // 6. DELETE pitch
                .mockResolvedValueOnce({ rows: [] });

            mockTransaction.mockImplementation(async (cb) => cb(calls as any));
            return calls;
        }

        it('restores at_bats and games from snapshot, deletes pitch', async () => {
            const client = setupUndo({});
            const result = await service.undoPitch('pitch-1');

            // 1st call: SELECT pitch FOR UPDATE
            expect(client.query.mock.calls[0][0]).toContain('SELECT * FROM pitches');
            expect(client.query.mock.calls[0][1]).toEqual(['pitch-1']);

            // 3rd call: DELETE baserunner_events with at_bat_id + created_at
            expect(client.query.mock.calls[2][0]).toContain('DELETE FROM baserunner_events');
            expect(client.query.mock.calls[2][1]).toEqual(['ab-1', '2026-01-01T00:00:00Z']);

            // 4th call: UPDATE at_bats with snapshot values
            const updateAtBatArgs = client.query.mock.calls[3][1];
            expect(updateAtBatArgs[0]).toBe(1); // balls
            expect(updateAtBatArgs[1]).toBe(1); // strikes
            expect(updateAtBatArgs[2]).toBe(null); // result
            expect(updateAtBatArgs[3]).toBe(0); // outs_after
            expect(updateAtBatArgs[4]).toBe(0); // rbi
            expect(updateAtBatArgs[5]).toBe(0); // runs_scored
            expect(updateAtBatArgs[6]).toBe(null); // ab_end_time
            expect(updateAtBatArgs[7]).toBe('ab-1');

            // 5th call: UPDATE games with snapshot values
            const updateGameArgs = client.query.mock.calls[4][1];
            expect(JSON.parse(updateGameArgs[0])).toEqual({ first: true, second: false, third: false });
            expect(updateGameArgs[1]).toBe(1); // home_score
            expect(updateGameArgs[2]).toBe(2); // away_score

            // 6th call: DELETE pitch
            expect(client.query.mock.calls[5][0]).toContain('DELETE FROM pitches');

            expect(result.atBat).toEqual({ id: 'ab-1', balls: 1, strikes: 1, result: null });
            expect(result.game).toMatchObject({ id: 'game-1' });
        });

        it('rejects with 404 when pitch not found', async () => {
            setupUndo({ pitchRow: null });
            await expect(service.undoPitch('missing')).rejects.toMatchObject({ status: 404, message: /not found/i });
        });

        it('rejects with 400 for legacy pitches without prev_state', async () => {
            setupUndo({ pitchRow: buildPitchRow({ prev_state: null }) });
            await expect(service.undoPitch('pitch-1')).rejects.toMatchObject({ status: 400 });
        });

        it('rejects with 409 if pitch is not the latest in its at-bat', async () => {
            setupUndo({ latestId: 'pitch-2' });
            await expect(service.undoPitch('pitch-1')).rejects.toMatchObject({ status: 409 });
        });

        it('marks tendencies stale when undoing a pitch against an opponent batter', async () => {
            setupUndo({ pitchRow: buildPitchRow({ opponent_batter_id: 'opp-1' }) });
            await service.undoPitch('pitch-1');
            expect(scoutingService.markTendenciesStale).toHaveBeenCalledWith('opp-1');
        });

        it('does not call markTendenciesStale when no opponent_batter_id', async () => {
            setupUndo({});
            await service.undoPitch('pitch-1');
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
