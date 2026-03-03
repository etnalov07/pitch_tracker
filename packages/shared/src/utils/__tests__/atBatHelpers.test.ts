import { isOutResult, getOutsForResult, getSuggestedAdvancement, removeRunner, clearBases, BaseRunners } from '../atBatHelpers';

// ============================================================================
// isOutResult
// ============================================================================

describe('isOutResult', () => {
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

    it.each(outResults)('returns true for %s', (result) => {
        expect(isOutResult(result)).toBe(true);
    });

    const nonOutResults = ['single', 'double', 'triple', 'home_run', 'walk', 'hit_by_pitch', 'error'];

    it.each(nonOutResults)('returns false for %s', (result) => {
        expect(isOutResult(result)).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isOutResult('')).toBe(false);
    });
});

// ============================================================================
// getOutsForResult
// ============================================================================

describe('getOutsForResult', () => {
    it('returns 2 for double_play', () => {
        expect(getOutsForResult('double_play')).toBe(2);
    });

    it('returns 3 for triple_play', () => {
        expect(getOutsForResult('triple_play')).toBe(3);
    });

    it('returns 1 for single-out results', () => {
        expect(getOutsForResult('strikeout')).toBe(1);
        expect(getOutsForResult('groundout')).toBe(1);
        expect(getOutsForResult('flyout')).toBe(1);
        expect(getOutsForResult('sacrifice_fly')).toBe(1);
    });

    it('returns 0 for non-out results', () => {
        expect(getOutsForResult('single')).toBe(0);
        expect(getOutsForResult('home_run')).toBe(0);
        expect(getOutsForResult('walk')).toBe(0);
    });
});

// ============================================================================
// getSuggestedAdvancement
// ============================================================================

describe('getSuggestedAdvancement', () => {
    const empty: BaseRunners = { first: false, second: false, third: false };
    const loaded: BaseRunners = { first: true, second: true, third: true };
    const corners: BaseRunners = { first: true, second: false, third: true };
    const firstOnly: BaseRunners = { first: true, second: false, third: false };
    const secondOnly: BaseRunners = { first: false, second: true, third: false };
    const thirdOnly: BaseRunners = { first: false, second: false, third: true };
    const firstSecond: BaseRunners = { first: true, second: true, third: false };

    describe('home_run', () => {
        it('scores batter with empty bases (1 run)', () => {
            const result = getSuggestedAdvancement(empty, 'home_run');
            expect(result.suggestedRuns).toBe(1);
            expect(result.suggestedRunners).toEqual(empty);
        });

        it('scores everyone with bases loaded (4 runs)', () => {
            const result = getSuggestedAdvancement(loaded, 'home_run');
            expect(result.suggestedRuns).toBe(4);
            expect(result.suggestedRunners).toEqual(empty);
        });

        it('scores runners on corners + batter (3 runs)', () => {
            const result = getSuggestedAdvancement(corners, 'home_run');
            expect(result.suggestedRuns).toBe(3);
            expect(result.suggestedRunners).toEqual(empty);
        });
    });

    describe('triple', () => {
        it('batter to 3rd with empty bases, 0 runs', () => {
            const result = getSuggestedAdvancement(empty, 'triple');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: false, second: false, third: true });
        });

        it('all runners score, batter to 3rd with bases loaded', () => {
            const result = getSuggestedAdvancement(loaded, 'triple');
            expect(result.suggestedRuns).toBe(3);
            expect(result.suggestedRunners).toEqual({ first: false, second: false, third: true });
        });
    });

    describe('double', () => {
        it('batter to 2nd with empty bases', () => {
            const result = getSuggestedAdvancement(empty, 'double');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: false, second: true, third: false });
        });

        it('runner on 1st to 3rd, batter to 2nd', () => {
            const result = getSuggestedAdvancement(firstOnly, 'double');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: false, second: true, third: true });
        });

        it('runners on 2nd and 3rd both score', () => {
            const result = getSuggestedAdvancement({ first: false, second: true, third: true }, 'double');
            expect(result.suggestedRuns).toBe(2);
            expect(result.suggestedRunners).toEqual({ first: false, second: true, third: false });
        });

        it('bases loaded: 2nd and 3rd score, 1st to 3rd', () => {
            const result = getSuggestedAdvancement(loaded, 'double');
            expect(result.suggestedRuns).toBe(2);
            expect(result.suggestedRunners).toEqual({ first: false, second: true, third: true });
        });
    });

    describe('single', () => {
        it('batter to 1st with empty bases', () => {
            const result = getSuggestedAdvancement(empty, 'single');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: true, second: false, third: false });
        });

        it('runner on 1st to 2nd, batter to 1st', () => {
            const result = getSuggestedAdvancement(firstOnly, 'single');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: true, second: true, third: false });
        });

        it('runner on 3rd scores, batter to 1st', () => {
            const result = getSuggestedAdvancement(thirdOnly, 'single');
            expect(result.suggestedRuns).toBe(1);
            expect(result.suggestedRunners).toEqual({ first: true, second: false, third: false });
        });

        it('bases loaded: 3rd scores, 2nd to 3rd, 1st to 2nd, batter to 1st', () => {
            const result = getSuggestedAdvancement(loaded, 'single');
            expect(result.suggestedRuns).toBe(1);
            expect(result.suggestedRunners).toEqual({ first: true, second: true, third: true });
        });
    });

    describe('walk / hit_by_pitch', () => {
        it.each(['walk', 'hit_by_pitch'])('%s with empty bases: batter to 1st', (result) => {
            const adv = getSuggestedAdvancement(empty, result);
            expect(adv.suggestedRuns).toBe(0);
            expect(adv.suggestedRunners).toEqual({ first: true, second: false, third: false });
        });

        it.each(['walk', 'hit_by_pitch'])('%s with runner on 1st: force to 2nd', (result) => {
            const adv = getSuggestedAdvancement(firstOnly, result);
            expect(adv.suggestedRuns).toBe(0);
            expect(adv.suggestedRunners).toEqual({ first: true, second: true, third: false });
        });

        it.each(['walk', 'hit_by_pitch'])('%s with bases loaded: run scores, 2nd to 3rd', (result) => {
            const adv = getSuggestedAdvancement(loaded, result);
            expect(adv.suggestedRuns).toBe(1);
            // Code models: 3rd scores, 2nd→3rd, batter→1st (1st→2nd is implicit)
            expect(adv.suggestedRunners).toEqual({ first: true, second: false, third: true });
        });

        it.each(['walk', 'hit_by_pitch'])('%s with runner on 2nd only: stays, batter to 1st', (result) => {
            const adv = getSuggestedAdvancement(secondOnly, result);
            expect(adv.suggestedRuns).toBe(0);
            expect(adv.suggestedRunners).toEqual({ first: true, second: true, third: false });
        });

        it.each(['walk', 'hit_by_pitch'])('%s with corners (1st + 3rd): 1st forced to 2nd, 3rd stays', (result) => {
            const adv = getSuggestedAdvancement(corners, result);
            expect(adv.suggestedRuns).toBe(0);
            expect(adv.suggestedRunners).toEqual({ first: true, second: true, third: true });
        });

        it.each(['walk', 'hit_by_pitch'])('%s with 1st + 2nd: 2nd forced to 3rd', (result) => {
            const adv = getSuggestedAdvancement(firstSecond, result);
            expect(adv.suggestedRuns).toBe(0);
            // Code models: 2nd→3rd, batter→1st (1st→2nd is implicit)
            expect(adv.suggestedRunners).toEqual({ first: true, second: false, third: true });
        });
    });

    describe('sacrifice_fly', () => {
        it('runner on 3rd scores, others stay', () => {
            const result = getSuggestedAdvancement(loaded, 'sacrifice_fly');
            expect(result.suggestedRuns).toBe(1);
            expect(result.suggestedRunners).toEqual({ first: true, second: true, third: false });
        });

        it('no runner on 3rd: 0 runs', () => {
            const result = getSuggestedAdvancement(firstOnly, 'sacrifice_fly');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: true, second: false, third: false });
        });
    });

    describe('fielders_choice', () => {
        it('batter to 1st with empty bases', () => {
            const result = getSuggestedAdvancement(empty, 'fielders_choice');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: true, second: false, third: false });
        });

        it('runner on 2nd stays when no 3rd', () => {
            const result = getSuggestedAdvancement(secondOnly, 'fielders_choice');
            expect(result.suggestedRuns).toBe(0);
            expect(result.suggestedRunners).toEqual({ first: true, second: true, third: false });
        });
    });

    describe('default (outs)', () => {
        it.each(['groundout', 'flyout', 'strikeout', 'lineout'])('%s returns current runners, 0 runs', (result) => {
            const adv = getSuggestedAdvancement(loaded, result);
            expect(adv.suggestedRuns).toBe(0);
            expect(adv.suggestedRunners).toEqual(loaded);
        });

        it('returns a copy, not the same reference', () => {
            const adv = getSuggestedAdvancement(loaded, 'groundout');
            expect(adv.suggestedRunners).not.toBe(loaded);
        });
    });
});

// ============================================================================
// removeRunner
// ============================================================================

describe('removeRunner', () => {
    it('removes runner from first', () => {
        const runners: BaseRunners = { first: true, second: true, third: true };
        expect(removeRunner(runners, 'first')).toEqual({ first: false, second: true, third: true });
    });

    it('removes runner from second', () => {
        const runners: BaseRunners = { first: true, second: true, third: false };
        expect(removeRunner(runners, 'second')).toEqual({ first: true, second: false, third: false });
    });

    it('removes runner from third', () => {
        const runners: BaseRunners = { first: false, second: false, third: true };
        expect(removeRunner(runners, 'third')).toEqual({ first: false, second: false, third: false });
    });

    it('does not mutate the original object', () => {
        const runners: BaseRunners = { first: true, second: true, third: true };
        removeRunner(runners, 'first');
        expect(runners.first).toBe(true);
    });
});

// ============================================================================
// clearBases
// ============================================================================

describe('clearBases', () => {
    it('returns all bases false', () => {
        expect(clearBases()).toEqual({ first: false, second: false, third: false });
    });

    it('returns a new object each time', () => {
        expect(clearBases()).not.toBe(clearBases());
    });
});
