/**
 * Determine if an at-bat result is an out.
 */
export const isOutResult = (result: string): boolean => {
    const outResults = [
        'strikeout',
        'groundout',
        'flyout',
        'lineout',
        'popout',
        'double_play',
        'triple_play',
        'fielders_choice',
        'force_out',
        'tag_out',
        'caught_stealing',
        'sacrifice_fly',
        'sacrifice_bunt',
    ];
    return outResults.includes(result);
};

/**
 * Get the number of outs recorded for a given result.
 * Double play = 2, triple play = 3, other outs = 1, non-outs = 0.
 */
export const getOutsForResult = (result: string): number => {
    if (result === 'double_play') return 2;
    if (result === 'triple_play') return 3;
    if (isOutResult(result)) return 1;
    return 0;
};

// ============================================================================
// Base Runner Utilities
// ============================================================================

export interface BaseRunners {
    first: boolean;
    second: boolean;
    third: boolean;
}

export type RunnerBase = 'first' | 'second' | 'third';

export interface RunnerAdvancementResult {
    suggestedRunners: BaseRunners;
    suggestedRuns: number;
}

/**
 * Get suggested runner positions after a hit result.
 * These are the "standard" advancement positions - users can override.
 * For example, on a single, standard advancement is +1 base,
 * but a runner on first could go to third (user adjusts manually).
 */
export const getSuggestedAdvancement = (
    currentRunners: BaseRunners,
    result: string
): RunnerAdvancementResult => {
    let runs = 0;
    const newRunners: BaseRunners = { first: false, second: false, third: false };

    switch (result) {
        case 'home_run':
            // All runners + batter score, bases cleared
            runs =
                (currentRunners.first ? 1 : 0) +
                (currentRunners.second ? 1 : 0) +
                (currentRunners.third ? 1 : 0) +
                1; // +1 for batter
            break;

        case 'triple':
            // All runners score, batter to 3rd
            runs =
                (currentRunners.first ? 1 : 0) +
                (currentRunners.second ? 1 : 0) +
                (currentRunners.third ? 1 : 0);
            newRunners.third = true; // Batter to 3rd
            break;

        case 'double':
            // Standard: runners advance 2 bases
            if (currentRunners.third) runs++;
            if (currentRunners.second) runs++;
            if (currentRunners.first) newRunners.third = true; // 1st to 3rd
            newRunners.second = true; // Batter to 2nd
            break;

        case 'single':
            // Standard: runners advance 1 base
            if (currentRunners.third) runs++;
            if (currentRunners.second) newRunners.third = true; // 2nd to 3rd
            if (currentRunners.first) newRunners.second = true; // 1st to 2nd
            newRunners.first = true; // Batter to 1st
            break;

        case 'walk':
        case 'hit_by_pitch':
            // Force advance only
            if (currentRunners.first) {
                if (currentRunners.second) {
                    if (currentRunners.third) runs++; // Bases loaded walk scores a run
                    newRunners.third = true;
                } else {
                    // Second base was empty, but now occupied by force
                    newRunners.second = true;
                    // Third base: keep if was occupied (no force)
                    if (currentRunners.third) newRunners.third = true;
                }
            } else {
                // First was empty, so no force - runners stay put
                if (currentRunners.second) newRunners.second = true;
                if (currentRunners.third) newRunners.third = true;
            }
            newRunners.first = true; // Batter always goes to 1st
            break;

        case 'sacrifice_fly':
            // Runner on third scores, other runners typically stay
            if (currentRunners.third) runs++;
            if (currentRunners.first) newRunners.first = true;
            if (currentRunners.second) newRunners.second = true;
            break;

        case 'fielders_choice':
            // Batter reaches, but a runner is out - complex, use defaults
            // Typically the lead runner is out, batter goes to first
            newRunners.first = true;
            if (currentRunners.second && !currentRunners.third) {
                newRunners.second = true; // If runner on 2nd only, they likely stay
            }
            break;

        default:
            // Outs (groundout, flyout, etc.) - runners typically stay in place
            // Return current positions as suggested (user can adjust for errors, advancement on throw, etc.)
            return { suggestedRunners: { ...currentRunners }, suggestedRuns: 0 };
    }

    return { suggestedRunners: newRunners, suggestedRuns: runs };
};

/**
 * Remove a runner from a specific base.
 */
export const removeRunner = (runners: BaseRunners, base: RunnerBase): BaseRunners => {
    return {
        ...runners,
        [base]: false,
    };
};

/**
 * Clear all bases (e.g., on inning change).
 */
export const clearBases = (): BaseRunners => ({
    first: false,
    second: false,
    third: false,
});
