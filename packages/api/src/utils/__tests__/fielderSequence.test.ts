import { formatFielderSequence, parseFielderSequence } from '@pitch-tracker/shared';

describe('utils/fielderSequence', () => {
    describe('formatFielderSequence', () => {
        it('joins ordered position numbers with hyphens', () => {
            expect(formatFielderSequence([9, 2])).toBe('9-2');
            expect(formatFielderSequence([8, 4, 2])).toBe('8-4-2');
            expect(formatFielderSequence([3])).toBe('3');
        });

        it('returns an empty string for null/undefined/empty', () => {
            expect(formatFielderSequence(null)).toBe('');
            expect(formatFielderSequence(undefined)).toBe('');
            expect(formatFielderSequence([])).toBe('');
        });
    });

    describe('parseFielderSequence', () => {
        it('parses canonical hyphen-joined sequences', () => {
            expect(parseFielderSequence('9-2')).toEqual([9, 2]);
            expect(parseFielderSequence('8-4-2')).toEqual([8, 4, 2]);
        });

        it('tolerates whitespace around separators', () => {
            expect(parseFielderSequence(' 9 - 2 ')).toEqual([9, 2]);
        });

        it('returns null for empty or invalid input', () => {
            expect(parseFielderSequence('')).toBeNull();
            expect(parseFielderSequence(null)).toBeNull();
            expect(parseFielderSequence(undefined)).toBeNull();
            expect(parseFielderSequence('-')).toBeNull();
            expect(parseFielderSequence('10')).toBeNull(); // outside 1-9
            expect(parseFielderSequence('0-2')).toBeNull(); // 0 not allowed
            expect(parseFielderSequence('9,2')).toBeNull(); // wrong separator
            expect(parseFielderSequence('A-2')).toBeNull(); // non-numeric
        });
    });

    describe('round-trip', () => {
        it('parse(format(x)) === x for valid inputs', () => {
            const cases: number[][] = [[9, 2], [8, 4, 2], [3], [5, 4, 3]];
            for (const c of cases) {
                expect(parseFielderSequence(formatFielderSequence(c))).toEqual(c);
            }
        });
    });
});
