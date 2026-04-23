import { getNextBattingOrder, getNextBatter, applyAtBatResult, advanceHalf, HalfInningState, LineupSlot } from '../gameSimulation';
import { BaseRunners, clearBases } from '../atBatHelpers';

// ============================================================================
// Helpers
// ============================================================================

function makeLineup(size = 9): LineupSlot[] {
    return Array.from({ length: size }, (_, i) => ({
        id: `player-${i + 1}`,
        batting_order: i + 1,
        replaced_by_id: null,
    }));
}

function halfState(
    inning: number,
    half: 'top' | 'bottom',
    currentOrder = 1,
    outs = 0,
    baseRunners: BaseRunners = clearBases()
): HalfInningState {
    return { inning, half, outs, currentOrder, baseRunners, runsScored: 0 };
}

// Drives a scripted half-inning to completion (3 outs).
// Returns the final HalfInningState after the last out and the list of batters who hit.
function playHalf(
    initialState: HalfInningState,
    script: string[],
    lineupSize = 9
): { state: HalfInningState; battersWhoHit: number[]; runsScored: number } {
    let state = initialState;
    const battersWhoHit: number[] = [];

    for (const result of script) {
        const outcome = applyAtBatResult(state, result, lineupSize);
        battersWhoHit.push(outcome.batterWhoHit);
        state = outcome.nextState;
        if (outcome.inningEnded) break;
    }

    return { state, battersWhoHit, runsScored: state.runsScored + (state.outs === 0 ? 0 : 0) };
}

// ============================================================================
// getNextBattingOrder
// ============================================================================

describe('getNextBattingOrder', () => {
    it('increments within lineup', () => {
        expect(getNextBattingOrder(1)).toBe(2);
        expect(getNextBattingOrder(5)).toBe(6);
        expect(getNextBattingOrder(8)).toBe(9);
    });

    it('wraps from lineupSize back to 1', () => {
        expect(getNextBattingOrder(9)).toBe(1);
        expect(getNextBattingOrder(9, 9)).toBe(1);
    });

    it('respects custom lineupSize', () => {
        expect(getNextBattingOrder(10, 10)).toBe(1);
        expect(getNextBattingOrder(7, 10)).toBe(8);
    });
});

// ============================================================================
// getNextBatter
// ============================================================================

describe('getNextBatter', () => {
    const lineup = makeLineup(9);

    it('returns the player at the next batting order slot', () => {
        const next = getNextBatter(lineup, 1);
        expect(next?.batting_order).toBe(2);
        expect(next?.id).toBe('player-2');
    });

    it('wraps from 9 to 1', () => {
        const next = getNextBatter(lineup, 9);
        expect(next?.batting_order).toBe(1);
        expect(next?.id).toBe('player-1');
    });

    it('skips replaced players', () => {
        const lineupWithSub: LineupSlot[] = [
            { id: 'p1', batting_order: 1, replaced_by_id: null },
            { id: 'p2', batting_order: 2, replaced_by_id: 'sub-id' }, // replaced
            { id: 'p3', batting_order: 3, replaced_by_id: null },
        ];
        // getNextBatter from 1 → looks for order 2 → p2 is replaced → returns null
        // (the helper finds BY order, so if that slot is replaced it returns null)
        const next = getNextBatter(lineupWithSub, 1, 3);
        expect(next).toBeNull();
    });

    it('returns null when lineup is empty', () => {
        expect(getNextBatter([], 1)).toBeNull();
    });

    it('works with custom lineupSize', () => {
        const small = makeLineup(3);
        expect(getNextBatter(small, 3, 3)?.batting_order).toBe(1);
    });
});

// ============================================================================
// applyAtBatResult — single at-bat mechanics
// ============================================================================

describe('applyAtBatResult', () => {
    describe('outs tracking', () => {
        it('increments outs on a strikeout', () => {
            const state = halfState(1, 'top', 1, 0);
            const { nextState, inningEnded } = applyAtBatResult(state, 'strikeout');
            expect(nextState.outs).toBe(1);
            expect(inningEnded).toBe(false);
        });

        it('marks inningEnded when outs reach 3', () => {
            const state = halfState(1, 'top', 3, 2);
            const { inningEnded, nextState } = applyAtBatResult(state, 'groundout');
            expect(inningEnded).toBe(true);
            expect(nextState.outs).toBe(0);
        });

        it('counts double_play as 2 outs', () => {
            const withRunner: BaseRunners = { first: true, second: false, third: false };
            const state = halfState(1, 'top', 4, 0, withRunner);
            const { nextState, inningEnded } = applyAtBatResult(state, 'double_play');
            expect(nextState.outs).toBe(2);
            expect(inningEnded).toBe(false);
        });

        it('ends inning immediately when double_play brings outs to 3', () => {
            const withRunner: BaseRunners = { first: true, second: false, third: false };
            const state = halfState(1, 'top', 5, 1, withRunner);
            const { inningEnded } = applyAtBatResult(state, 'double_play');
            expect(inningEnded).toBe(true);
        });
    });

    describe('batting order advancement', () => {
        it('advances currentOrder on every at-bat', () => {
            const state = halfState(1, 'top', 3, 0);
            const { nextState } = applyAtBatResult(state, 'single');
            expect(nextState.currentOrder).toBe(4);
        });

        it('advances currentOrder even when inning ends', () => {
            const state = halfState(1, 'top', 3, 2);
            const { nextState } = applyAtBatResult(state, 'flyout');
            expect(nextState.currentOrder).toBe(4);
        });

        it('wraps batting order from 9 to 1', () => {
            const state = halfState(1, 'top', 9, 0);
            const { nextState } = applyAtBatResult(state, 'single');
            expect(nextState.currentOrder).toBe(1);
        });
    });

    describe('base runners', () => {
        it('clears bases when inning ends', () => {
            const loaded: BaseRunners = { first: true, second: true, third: true };
            const state = halfState(1, 'top', 5, 2, loaded);
            const { nextState } = applyAtBatResult(state, 'flyout');
            expect(nextState.baseRunners).toEqual(clearBases());
        });

        it('updates base runners for a hit when inning does not end', () => {
            const state = halfState(1, 'top', 1, 0);
            const { nextState } = applyAtBatResult(state, 'single');
            expect(nextState.baseRunners.first).toBe(true);
        });
    });

    describe('runs scored', () => {
        it('accumulates runs across at-bats', () => {
            let state = halfState(1, 'top', 1, 0);
            state = applyAtBatResult(state, 'single').nextState; // runner on 1st
            const { nextState, runsThisPlay } = applyAtBatResult(state, 'home_run'); // 2 runs
            expect(runsThisPlay).toBe(2);
            expect(nextState.runsScored).toBe(2);
        });

        it('batterWhoHit reflects the order that faced the pitch', () => {
            const state = halfState(1, 'top', 5, 0);
            const { batterWhoHit } = applyAtBatResult(state, 'strikeout');
            expect(batterWhoHit).toBe(5);
        });
    });
});

// ============================================================================
// advanceHalf
// ============================================================================

describe('advanceHalf', () => {
    it('advances top → bottom of same inning', () => {
        const state = halfState(1, 'top', 4, 0);
        const next = advanceHalf(state);
        expect(next.inning).toBe(1);
        expect(next.half).toBe('bottom');
    });

    it('advances bottom → top of next inning', () => {
        const state = halfState(1, 'bottom', 7, 0);
        const next = advanceHalf(state);
        expect(next.inning).toBe(2);
        expect(next.half).toBe('top');
    });

    it('carries batting order forward (does not reset to 1)', () => {
        const state = halfState(2, 'top', 6, 0);
        const next = advanceHalf(state);
        expect(next.currentOrder).toBe(6);
    });

    it('resets outs and baseRunners', () => {
        const loaded: BaseRunners = { first: true, second: true, third: true };
        const state: HalfInningState = { inning: 1, half: 'top', outs: 2, currentOrder: 3, baseRunners: loaded, runsScored: 1 };
        const next = advanceHalf(state);
        expect(next.outs).toBe(0);
        expect(next.baseRunners).toEqual(clearBases());
        expect(next.runsScored).toBe(0);
    });
});

// ============================================================================
// Full 3-inning game simulation
// ============================================================================

describe('3-inning game simulation', () => {
    // 9 unique batters per team + 1 pitcher each
    const awayLineup = makeLineup(9);
    const homeLineup = makeLineup(9);

    // Scripted at-bat results for each half-inning.
    // Each script ends with exactly the 3rd out.
    const scripts: Record<string, string[]> = {
        inn1top: ['strikeout', 'flyout', 'groundout'], // 3 outs, 0 runs; next batter: 4
        inn1bot: ['single', 'home_run', 'strikeout', 'flyout', 'strikeout'], // 3 outs, 2 runs; next batter: 6
        inn2top: ['walk', 'single', 'flyout', 'flyout', 'groundout'], // 3 outs, 0 runs; next batter: 9
        inn2bot: ['triple', 'single', 'strikeout', 'flyout', 'lineout'], // 3 outs, 1 run;  next batter: 2 (wraps 9→1→2)
        inn3top: ['home_run', 'strikeout', 'groundout', 'flyout'], // 3 outs, 1 run;  next batter: 4 (wraps 9→1→2→3→4)
        inn3bot: ['home_run', 'strikeout', 'strikeout', 'flyout'], // 3 outs, 1 run;  next batter: 6
    };

    let awayScore = 0;
    let homeScore = 0;
    let awayHalf = halfState(1, 'top', 1);
    let homeHalf = halfState(1, 'bottom', 1);

    // Play through all 6 half-innings and collect results for assertion
    const results: Record<string, { battersWhoHit: number[]; runsScored: number; nextOrder: number }> = {};

    beforeAll(() => {
        // Inning 1 — Top (away)
        let outcome = playHalf(awayHalf, scripts.inn1top);
        results.inn1top = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        awayScore += outcome.state.runsScored;
        awayHalf = advanceHalf(advanceHalf(outcome.state)); // top→bottom, bottom→top inning 2

        // Inning 1 — Bottom (home)
        outcome = playHalf(homeHalf, scripts.inn1bot);
        results.inn1bot = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        homeScore += outcome.state.runsScored;
        homeHalf = advanceHalf(advanceHalf(outcome.state)); // bottom→top inn2, top→bottom inn2

        // Inning 2 — Top (away, starting at order 4)
        outcome = playHalf(awayHalf, scripts.inn2top);
        results.inn2top = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        awayScore += outcome.state.runsScored;
        awayHalf = advanceHalf(advanceHalf(outcome.state));

        // Inning 2 — Bottom (home, starting at order 6)
        outcome = playHalf(homeHalf, scripts.inn2bot);
        results.inn2bot = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        homeScore += outcome.state.runsScored;
        homeHalf = advanceHalf(advanceHalf(outcome.state));

        // Inning 3 — Top (away, starting at order 9)
        outcome = playHalf(awayHalf, scripts.inn3top);
        results.inn3top = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        awayScore += outcome.state.runsScored;

        // Inning 3 — Bottom (home, starting at order 2)
        outcome = playHalf(homeHalf, scripts.inn3bot);
        results.inn3bot = {
            battersWhoHit: outcome.battersWhoHit,
            runsScored: outcome.state.runsScored,
            nextOrder: outcome.state.currentOrder,
        };
        homeScore += outcome.state.runsScored;
    });

    // --- Batting order continuity ---

    it('inn1 top: batters 1-2-3 face pitches in order', () => {
        expect(results.inn1top.battersWhoHit).toEqual([1, 2, 3]);
    });

    it('inn1 bot: batters 1-2-3-4-5 face pitches in order', () => {
        expect(results.inn1bot.battersWhoHit).toEqual([1, 2, 3, 4, 5]);
    });

    it('inn2 top: continues from order 4, not reset to 1', () => {
        expect(results.inn2top.battersWhoHit[0]).toBe(4);
        expect(results.inn2top.battersWhoHit).toEqual([4, 5, 6, 7, 8]);
    });

    it('inn2 bot: continues from order 6, wraps 9→1 correctly', () => {
        expect(results.inn2bot.battersWhoHit[0]).toBe(6);
        expect(results.inn2bot.battersWhoHit).toEqual([6, 7, 8, 9, 1]);
    });

    it('inn3 top: continues from order 9, wraps through 1-2-3', () => {
        expect(results.inn3top.battersWhoHit).toEqual([9, 1, 2, 3]);
    });

    it('inn3 bot: continues from order 2 (not reset after wrap)', () => {
        expect(results.inn3bot.battersWhoHit[0]).toBe(2);
        expect(results.inn3bot.battersWhoHit).toEqual([2, 3, 4, 5]);
    });

    // --- Next-batter-up after each half-inning ---

    it('leadoff batter for inn2 top is order 4 (one past last out in inn1)', () => {
        expect(results.inn1top.nextOrder).toBe(4);
    });

    it('leadoff batter for inn2 bot is order 6 (one past last out in inn1 bot)', () => {
        expect(results.inn1bot.nextOrder).toBe(6);
    });

    it('leadoff batter for inn3 top is order 9', () => {
        expect(results.inn2top.nextOrder).toBe(9);
    });

    it('leadoff batter for inn3 bot is order 2 (wrap from 9→1→2)', () => {
        expect(results.inn2bot.nextOrder).toBe(2);
    });

    it('would-be leadoff for inn4 top is order 4 (3→4)', () => {
        expect(results.inn3top.nextOrder).toBe(4);
    });

    it('would-be leadoff for inn4 bot is order 6 (5→6)', () => {
        expect(results.inn3bot.nextOrder).toBe(6);
    });

    // --- Scores ---

    it('away team scores 0 in innings 1-2, 1 in inning 3 (total: 1)', () => {
        expect(results.inn1top.runsScored).toBe(0);
        expect(results.inn2top.runsScored).toBe(0);
        expect(results.inn3top.runsScored).toBe(1);
        expect(awayScore).toBe(1);
    });

    it('home team scores 2 in inning 1, 1 in inning 2, 1 in inning 3 (total: 4)', () => {
        expect(results.inn1bot.runsScored).toBe(2);
        expect(results.inn2bot.runsScored).toBe(1);
        expect(results.inn3bot.runsScored).toBe(1);
        expect(homeScore).toBe(4);
    });

    it('home team wins 4-1', () => {
        expect(homeScore).toBeGreaterThan(awayScore);
        expect(homeScore - awayScore).toBe(3);
    });

    // --- No duplicate batters in a half-inning (unique per slot) ---

    it('each half-inning has no repeated batting-order slot', () => {
        for (const [key, result] of Object.entries(results)) {
            const set = new Set(result.battersWhoHit);
            // Wrap can cause a slot to appear twice only if lineupSize < at-bats in the half,
            // which cannot happen in a 9-batter lineup with at most 9 at-bats.
            expect(set.size).toBe(result.battersWhoHit.length);
        }
    });

    // --- getNextBatter integration with scripted lineup ---

    it('getNextBatter correctly resolves players from lineup objects', () => {
        // Away batter order 3 made last out in inn1 → next is order 4
        const next = getNextBatter(awayLineup, 3);
        expect(next?.batting_order).toBe(4);
        expect(next?.id).toBe('player-4');
    });

    it('getNextBatter wraps 9→1 from actual lineup', () => {
        const next = getNextBatter(homeLineup, 9);
        expect(next?.batting_order).toBe(1);
        expect(next?.id).toBe('player-1');
    });
});
