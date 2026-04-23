import { BaseRunners, clearBases, getSuggestedAdvancement, getOutsForResult } from './atBatHelpers';

// Minimum shape needed for batter-sequencing helpers — both OpponentLineupPlayer
// and MyTeamLineupPlayer satisfy this interface.
export interface LineupSlot {
    id: string;
    batting_order: number;
    replaced_by_id?: string | null;
}

/**
 * Returns the next batting-order position, wrapping lineupSize → 1.
 */
export function getNextBattingOrder(currentOrder: number, lineupSize = 9): number {
    return currentOrder >= lineupSize ? 1 : currentOrder + 1;
}

/**
 * Finds the next active batter in the lineup after currentOrder.
 * Skips slots where replaced_by_id is set (player was substituted out).
 */
export function getNextBatter<T extends LineupSlot>(lineup: T[], currentOrder: number, lineupSize = 9): T | null {
    const nextOrder = getNextBattingOrder(currentOrder, lineupSize);
    return lineup.find((p) => p.batting_order === nextOrder && !p.replaced_by_id) ?? null;
}

// ============================================================================
// Pure half-inning state machine — used for simulation tests
// ============================================================================

export interface HalfInningState {
    inning: number;
    half: 'top' | 'bottom';
    outs: number;
    /** Batting-order slot of the NEXT batter to face a pitch. */
    currentOrder: number;
    baseRunners: BaseRunners;
    /** Runs accumulated so far in this half-inning. */
    runsScored: number;
}

export interface AtBatOutcome {
    /** Batting-order slot that just completed the at-bat. */
    batterWhoHit: number;
    runsThisPlay: number;
    inningEnded: boolean;
    nextState: HalfInningState;
}

/**
 * Applies one at-bat result to the current half-inning state.
 * When the inning ends (outs reach 3), currentOrder advances to the leadoff
 * batter for the *next* time this team bats — batting order never resets to 1
 * unless it naturally wraps past lineupSize.
 */
export function applyAtBatResult(state: HalfInningState, result: string, lineupSize = 9): AtBatOutcome {
    const outsFromPlay = getOutsForResult(result);
    const newOuts = state.outs + outsFromPlay;
    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(state.baseRunners, result);
    const inningEnded = newOuts >= 3;
    const nextOrder = getNextBattingOrder(state.currentOrder, lineupSize);

    return {
        batterWhoHit: state.currentOrder,
        runsThisPlay: suggestedRuns,
        inningEnded,
        nextState: {
            inning: state.inning,
            half: state.half,
            outs: inningEnded ? 0 : newOuts,
            currentOrder: nextOrder,
            baseRunners: inningEnded ? clearBases() : suggestedRunners,
            runsScored: state.runsScored + suggestedRuns,
        },
    };
}

/**
 * Transitions the game from one half-inning to the next.
 * top → bottom (same inning), bottom → top (inning + 1).
 * Batting order and run total carry over as-is; the caller owns score tracking.
 */
export function advanceHalf(state: HalfInningState): HalfInningState {
    return {
        inning: state.half === 'bottom' ? state.inning + 1 : state.inning,
        half: state.half === 'top' ? 'bottom' : 'top',
        outs: 0,
        currentOrder: state.currentOrder,
        baseRunners: clearBases(),
        runsScored: 0,
    };
}
