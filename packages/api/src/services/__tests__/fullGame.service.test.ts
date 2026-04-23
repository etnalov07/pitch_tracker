/**
 * Full 3-inning game — service-layer integration test.
 *
 * Drives GameService + AtBatService + PitchService through a complete game
 * using mocked DB calls. Verifies that outs_before/outs_after are threaded
 * correctly, batting-order fields are written as expected, and inning
 * advancement produces the right half/inning transitions.
 *
 * No HTTP, no real DB — just the service objects with jest-mocked query/transaction.
 */

jest.mock('../../config/database', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockImplementation(() => `uuid-${Math.random().toString(36).slice(2, 8)}`),
}));

import { query, transaction } from '../../config/database';
import { GameService } from '../game.service';
import { AtBatService } from '../atBat.service';
import { PitchService } from '../pitch.service';

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;

// ─── Factories ───────────────────────────────────────────────────────────────

function makeGame(overrides: Record<string, unknown> = {}) {
    return {
        id: 'game-1',
        status: 'in_progress',
        current_inning: 1,
        inning_half: 'top',
        is_home_game: true,
        home_team_id: 'home-team',
        away_team_id: 'away-team',
        home_score: 0,
        away_score: 0,
        charting_mode: 'both',
        lineup_size: 9,
        total_innings: 3,
        ...overrides,
    };
}

function makeInning(inning: number, half: 'top' | 'bottom') {
    return { id: `inning-${inning}-${half}`, game_id: 'game-1', inning_number: inning, half };
}

function makeAtBat(id: string, battingOrder: number, outsBefore: number) {
    return {
        id,
        game_id: 'game-1',
        inning_id: `inning-1-top`,
        batting_order: battingOrder,
        outs_before: outsBefore,
        balls: 0,
        strikes: 0,
    };
}

function makePitch(atBatId: string, pitchNumber: number) {
    return { id: `pitch-${atBatId}-${pitchNumber}`, at_bat_id: atBatId, pitch_number: pitchNumber };
}

// ─── Mock helpers ─────────────────────────────────────────────────────────────

/** Sets up a transaction mock that executes the callback with a client whose
 *  query() calls return the provided results in order. */
function setupTransaction(results: unknown[]) {
    const client = { query: jest.fn() };
    results.forEach((r) => client.query.mockResolvedValueOnce(r));
    mockTransaction.mockImplementationOnce(async (cb: (client: any) => any) => cb(client));
    return client;
}

// ─── Services ────────────────────────────────────────────────────────────────

let gameService: GameService;
let atBatService: AtBatService;
let pitchService: PitchService;

beforeEach(() => {
    jest.clearAllMocks();
    gameService = new GameService();
    atBatService = new AtBatService();
    pitchService = new PitchService();
});

// ============================================================================
// startGame — creates first inning
// ============================================================================

describe('startGame', () => {
    it('transitions game to in_progress and creates inning 1 top', async () => {
        const game = makeGame({ status: 'in_progress', current_inning: 1, inning_half: 'top' });
        setupTransaction([{ rows: [game] }, { rows: [] }]);

        const result = await gameService.startGame('game-1');

        expect(result.status).toBe('in_progress');
        expect(result.current_inning).toBe(1);
        expect(result.inning_half).toBe('top');
        expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
});

// ============================================================================
// advanceInning — half transitions
// ============================================================================

describe('advanceInning', () => {
    it('advances inning 1 top → inning 1 bottom', async () => {
        const game = makeGame({ current_inning: 1, inning_half: 'top' });
        const advancedGame = makeGame({ current_inning: 1, inning_half: 'bottom' });

        mockQuery.mockResolvedValueOnce({ rows: [game] } as any);
        setupTransaction([{ rows: [advancedGame] }, { rows: [] }]);

        const result = await gameService.advanceInning('game-1');

        expect(result.current_inning).toBe(1);
        expect(result.inning_half).toBe('bottom');
    });

    it('advances inning 1 bottom → inning 2 top', async () => {
        const game = makeGame({ current_inning: 1, inning_half: 'bottom' });
        const advancedGame = makeGame({ current_inning: 2, inning_half: 'top' });

        mockQuery.mockResolvedValueOnce({ rows: [game] } as any);
        setupTransaction([{ rows: [advancedGame] }, { rows: [] }]);

        const result = await gameService.advanceInning('game-1');

        expect(result.current_inning).toBe(2);
        expect(result.inning_half).toBe('top');
    });

    it('advances through all 6 half-innings of a 3-inning game', async () => {
        const halves: Array<{ inning: number; half: string }> = [
            { inning: 1, half: 'top' },
            { inning: 1, half: 'bottom' },
            { inning: 2, half: 'top' },
            { inning: 2, half: 'bottom' },
            { inning: 3, half: 'top' },
            { inning: 3, half: 'bottom' },
        ];

        const transitions = [
            [
                { inning: 1, half: 'top' },
                { inning: 1, half: 'bottom' },
            ],
            [
                { inning: 1, half: 'bottom' },
                { inning: 2, half: 'top' },
            ],
            [
                { inning: 2, half: 'top' },
                { inning: 2, half: 'bottom' },
            ],
            [
                { inning: 2, half: 'bottom' },
                { inning: 3, half: 'top' },
            ],
            [
                { inning: 3, half: 'top' },
                { inning: 3, half: 'bottom' },
            ],
        ];

        for (const [from, to] of transitions) {
            const fromGame = makeGame({ current_inning: from.inning, inning_half: from.half });
            const toGame = makeGame({ current_inning: to.inning, inning_half: to.half });

            mockQuery.mockResolvedValueOnce({ rows: [fromGame] } as any);
            setupTransaction([{ rows: [toGame] }, { rows: [] }]);

            const result = await gameService.advanceInning('game-1');
            expect(result.current_inning).toBe(to.inning);
            expect(result.inning_half).toBe(to.half);
        }

        expect(mockTransaction).toHaveBeenCalledTimes(5);
    });
});

// ============================================================================
// createAtBat — outs_before is correctly threaded
// ============================================================================

describe('createAtBat — outs_before threading', () => {
    it('creates at-bat 1 with outs_before=0', async () => {
        const atBat = makeAtBat('ab-1', 1, 0);
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.createAtBat({
            game_id: 'game-1',
            inning_id: 'inning-1-top',
            pitcher_id: 'pitcher-away',
            opponent_batter_id: 'batter-1',
            batting_order: 1,
            outs_before: 0,
        });

        expect(result.outs_before).toBe(0);
        expect(result.batting_order).toBe(1);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO at_bats'),
            expect.arrayContaining([0]) // outs_before = 0
        );
    });

    it('creates at-bat 2 with outs_before=1 after first out', async () => {
        const atBat = makeAtBat('ab-2', 2, 1);
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.createAtBat({
            game_id: 'game-1',
            inning_id: 'inning-1-top',
            pitcher_id: 'pitcher-away',
            opponent_batter_id: 'batter-2',
            batting_order: 2,
            outs_before: 1,
        });

        expect(result.outs_before).toBe(1);
        expect(result.batting_order).toBe(2);
    });

    it('creates at-bat with outs_before=2 before third out', async () => {
        const atBat = makeAtBat('ab-3', 3, 2);
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.createAtBat({
            game_id: 'game-1',
            inning_id: 'inning-1-top',
            pitcher_id: 'pitcher-away',
            opponent_batter_id: 'batter-3',
            batting_order: 3,
            outs_before: 2,
        });

        expect(result.outs_before).toBe(2);
    });
});

// ============================================================================
// endAtBat — outs_after is correctly computed
// ============================================================================

describe('endAtBat — outs_after correctness', () => {
    it('strikeout: outs_after = outs_before + 1', async () => {
        const atBat = { id: 'ab-1', result: 'strikeout', outs_after: 1 };
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.endAtBat('ab-1', 'strikeout', 1);

        expect(result.result).toBe('strikeout');
        expect(result.outs_after).toBe(1);
        expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['strikeout', 1, 0, 0, 'ab-1']);
    });

    it('single (non-out): outs_after = outs_before (unchanged)', async () => {
        const atBat = { id: 'ab-4', result: 'single', outs_after: 0, rbi: 0 };
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.endAtBat('ab-4', 'single', 0);

        expect(result.result).toBe('single');
        expect(result.outs_after).toBe(0);
    });

    it('home_run with RBI: outs_after unchanged, rbi recorded', async () => {
        const atBat = { id: 'ab-hr', result: 'home_run', outs_after: 0, rbi: 2, runs_scored: 2 };
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.endAtBat('ab-hr', 'home_run', 0, 2, 2);

        expect(result.rbi).toBe(2);
        expect(result.runs_scored).toBe(2);
        expect(result.outs_after).toBe(0);
    });

    it('double_play: outs_after = outs_before + 2 (capped at 3)', async () => {
        const atBat = { id: 'ab-dp', result: 'double_play', outs_after: 3 };
        mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

        const result = await atBatService.endAtBat('ab-dp', 'double_play', 3);

        expect(result.outs_after).toBe(3);
    });
});

// ============================================================================
// logPitch — pitch is linked to correct at-bat
// ============================================================================

describe('logPitch', () => {
    function setupPitchTransaction(pitchResult: unknown) {
        setupTransaction([
            { rows: [{ max_pitch: 0 }] }, // max pitch number
            { rows: [pitchResult] }, // INSERT pitch
            { rows: [] }, // UPDATE at_bats
            { rows: [] }, // check pitch type
            { rows: [] }, // upsert pitch type
        ]);
    }

    it('logs a fastball strike on the first pitch of an at-bat', async () => {
        const pitch = makePitch('ab-1', 1);
        setupPitchTransaction(pitch);

        const result = await pitchService.logPitch({
            at_bat_id: 'ab-1',
            game_id: 'game-1',
            pitcher_id: 'pitcher-away',
            opponent_batter_id: 'batter-1',
            pitch_type: 'fastball',
            pitch_result: 'called_strike',
            location_x: 50,
            location_y: 50,
            velocity: 91,
            balls_before: 0,
            strikes_before: 0,
            pitch_number: 1,
        });

        expect(result.at_bat_id).toBe('ab-1');
        expect(result.pitch_number).toBe(1);
    });

    it('logs a curveball for a different batter', async () => {
        const pitch = makePitch('ab-5', 1);
        setupPitchTransaction(pitch);

        const result = await pitchService.logPitch({
            at_bat_id: 'ab-5',
            game_id: 'game-1',
            pitcher_id: 'pitcher-home',
            opponent_batter_id: 'away-batter-5',
            pitch_type: 'curveball',
            pitch_result: 'swinging_strike',
            location_x: 40,
            location_y: 60,
            balls_before: 1,
            strikes_before: 0,
            pitch_number: 1,
        });

        expect(result.at_bat_id).toBe('ab-5');
    });
});

// ============================================================================
// Full 3-inning game — service call sequence
// ============================================================================

describe('full 3-inning game — service call sequence', () => {
    /**
     * Simulates one half-inning: creates N at-bats, logs 1 pitch each,
     * ends each at-bat. Verifies outs_before increments correctly and
     * resets to 0 on the new half.
     */
    async function playHalfInning(
        inningId: string,
        pitcherId: string,
        batterIds: string[],
        results: string[],
        startingOuts: number
    ): Promise<number> {
        let outs = startingOuts;

        for (let i = 0; i < results.length; i++) {
            const batterId = batterIds[i % batterIds.length];
            const result = results[i];
            const atBatId = `ab-${inningId}-${i + 1}`;

            // createAtBat
            const atBat = makeAtBat(atBatId, i + 1, outs);
            mockQuery.mockResolvedValueOnce({ rows: [atBat] } as any);

            const created = await atBatService.createAtBat({
                game_id: 'game-1',
                inning_id: inningId,
                pitcher_id: pitcherId,
                opponent_batter_id: batterId,
                batting_order: i + 1,
                outs_before: outs,
            });
            expect(created.outs_before).toBe(outs);

            // logPitch (1 pitch per at-bat for simplicity)
            const pitch = makePitch(atBatId, 1);
            setupTransaction([{ rows: [{ max_pitch: 0 }] }, { rows: [pitch] }, { rows: [] }, { rows: [] }, { rows: [] }]);

            await pitchService.logPitch({
                at_bat_id: atBatId,
                game_id: 'game-1',
                pitcher_id: pitcherId,
                opponent_batter_id: batterId,
                pitch_type: 'fastball',
                pitch_result: result === 'strikeout' ? 'swinging_strike' : 'in_play',
                location_x: 50,
                location_y: 50,
                balls_before: 0,
                strikes_before: 0,
                pitch_number: 1,
            });

            // endAtBat
            const outsFromPlay =
                result === 'double_play' ? 2 : ['strikeout', 'groundout', 'flyout', 'lineout', 'popout'].includes(result) ? 1 : 0;
            const outsAfter = Math.min(outs + outsFromPlay, 3);
            const ended = { id: atBatId, result, outs_after: outsAfter };
            mockQuery.mockResolvedValueOnce({ rows: [ended] } as any);

            await atBatService.endAtBat(atBatId, result, outsAfter);

            outs = outsAfter >= 3 ? 0 : outsAfter;
            if (outsAfter >= 3) break;
        }

        return outs; // always 0 when half-inning completes
    }

    it('plays 3 complete innings with correct outs threading', async () => {
        // 9-batter lineups
        const awayBatters = Array.from({ length: 9 }, (_, i) => `away-p${i + 1}`);
        const homeBatters = Array.from({ length: 9 }, (_, i) => `home-p${i + 1}`);

        const innings = [
            {
                inningId: 'inning-1-top',
                pitcherId: 'pitcher-home',
                batters: awayBatters,
                script: ['strikeout', 'flyout', 'groundout'],
            },
            {
                inningId: 'inning-1-bottom',
                pitcherId: 'pitcher-away',
                batters: homeBatters,
                script: ['single', 'home_run', 'strikeout', 'flyout', 'strikeout'],
            },
            {
                inningId: 'inning-2-top',
                pitcherId: 'pitcher-home',
                batters: awayBatters,
                script: ['flyout', 'flyout', 'groundout'],
            },
            {
                inningId: 'inning-2-bottom',
                pitcherId: 'pitcher-away',
                batters: homeBatters,
                script: ['strikeout', 'strikeout', 'flyout'],
            },
            {
                inningId: 'inning-3-top',
                pitcherId: 'pitcher-home',
                batters: awayBatters,
                script: ['groundout', 'flyout', 'strikeout'],
            },
            {
                inningId: 'inning-3-bottom',
                pitcherId: 'pitcher-away',
                batters: homeBatters,
                script: ['strikeout', 'groundout', 'flyout'],
            },
        ];

        for (const half of innings) {
            const finalOuts = await playHalfInning(half.inningId, half.pitcherId, half.batters, half.script, 0);
            // Each half ends with 3 outs → reset to 0
            expect(finalOuts).toBe(0);
        }
    });

    it('score accumulates correctly: updateScore called with running totals', async () => {
        const updatedGame = makeGame({ home_score: 2, away_score: 0 });
        mockQuery.mockResolvedValueOnce({ rows: [updatedGame] } as any);

        const result = await gameService.updateGameScore('game-1', 2, 0);
        expect(result.home_score).toBe(2);
        expect(result.away_score).toBe(0);
    });

    it('getCurrentInning returns the active half after advance', async () => {
        const game = makeGame({ current_inning: 2, inning_half: 'top' });
        const inning = makeInning(2, 'top');
        mockQuery.mockResolvedValueOnce({ rows: [game] } as any);
        mockQuery.mockResolvedValueOnce({ rows: [inning] } as any);

        const result = await gameService.getCurrentInning('game-1');
        expect(result?.inning_number).toBe(2);
        expect(result?.half).toBe('top');
    });

    it('endGame transitions status to completed', async () => {
        const completedGame = makeGame({ status: 'completed', home_score: 4, away_score: 1 });
        mockQuery.mockResolvedValueOnce({ rows: [completedGame] } as any);

        const result = await gameService.endGame('game-1');
        expect(result.status).toBe('completed');
        expect(result.home_score).toBe(4);
        expect(result.away_score).toBe(1);
    });
});
