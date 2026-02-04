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
