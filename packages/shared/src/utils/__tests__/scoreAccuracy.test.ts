import { PitchCallZone } from '../../index';
import { scoreAccuracy } from '../scoreAccuracy';

// 20 worked-example pitches originally from
// docs/plans/2026-05-11-zone-based-accuracy.md, updated 2026-05-12 for the
// row-floor softening in docs/plans/2026-05-12-command-grade-softening.md.
// Two cases now score 0.25 instead of 0 (right height, wrong column-side).
describe('scoreAccuracy — worked example (20 pitches)', () => {
    const cases: Array<{ target: PitchCallZone; actual: PitchCallZone; expected: number; reason: string }> = [
        { target: '2-2', actual: '2-2', expected: 1, reason: 'Same col (in-zone)' },
        { target: '2-2', actual: '1-2', expected: 1, reason: 'Same col (in-zone)' },
        { target: '2-2', actual: '0-2', expected: 1, reason: 'Same col (in-zone)' },
        { target: '2-2', actual: '2-1', expected: 0.25, reason: 'Adjacent col' },
        { target: '2-2', actual: '1-1', expected: 0.25, reason: 'Adjacent col' },
        { target: '2-2', actual: 'W-low-out', expected: 1, reason: 'Waste matching side (out)' },
        { target: '2-2', actual: 'W-low-in', expected: 0.25, reason: 'Wrong-col-side waste, row matches (Dial 1)' },
        { target: '0-0', actual: '0-0', expected: 1, reason: 'Same col (in-zone)' },
        { target: '0-0', actual: '1-0', expected: 1, reason: 'Same col (in-zone)' },
        { target: '0-0', actual: 'W-in', expected: 1, reason: 'Waste matching side (in)' },
        { target: '0-0', actual: 'W-high-out', expected: 0.25, reason: 'Wrong-col-side waste, row matches (Dial 1)' },
        { target: '1-2', actual: '1-2', expected: 1, reason: 'Same col (in-zone)' },
        { target: '1-2', actual: '0-2', expected: 1, reason: 'Same col (in-zone)' },
        { target: '1-2', actual: '1-0', expected: 0.25, reason: '2 cols off but row matches (Dial 1)' },
        { target: '0-1', actual: '0-1', expected: 1, reason: 'Spot on (mid-col target)' },
        { target: '0-1', actual: '0-0', expected: 0.75, reason: 'Mid-col target: same row, 1 col off' },
        { target: '0-1', actual: '0-2', expected: 0.75, reason: 'Mid-col target: same row, 1 col off' },
        { target: '0-1', actual: '1-1', expected: 0.25, reason: 'Mid-col target: 1 row off' },
        { target: '0-1', actual: 'W-high', expected: 0.75, reason: 'Mid-col + waste matching row side' },
        { target: '0-1', actual: 'W-low', expected: 0, reason: 'Mid-col + waste opposite row' },
    ];

    cases.forEach(({ target, actual, expected, reason }, i) => {
        it(`#${i + 1}: ${target} → ${actual} = ${expected} (${reason})`, () => {
            expect(scoreAccuracy(target, actual)).toBe(expected);
        });
    });

    it('total of the 20-pitch sample sums to 13.75 (69% rounded) under Dial 1', () => {
        const sum = cases.reduce((acc, c) => acc + scoreAccuracy(c.target, c.actual), 0);
        expect(sum).toBeCloseTo(13.75, 10);
        expect(Math.round((sum / cases.length) * 100)).toBe(69);
    });
});

describe('scoreAccuracy — additional coverage', () => {
    it('every in-zone target hitting its own zone scores 1.0', () => {
        const inZone: PitchCallZone[] = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
        for (const z of inZone) {
            expect(scoreAccuracy(z, z)).toBe(1);
        }
    });

    it('mid-mid target (1-1) treats both side waste landings the same (matching row → 0.75)', () => {
        // Target 1-1 is mid-row, mid-col. W-in / W-out are mid-row waste → 0.75.
        expect(scoreAccuracy('1-1', 'W-in')).toBe(0.75);
        expect(scoreAccuracy('1-1', 'W-out')).toBe(0.75);
        // W-high / W-low are off-row → 0.
        expect(scoreAccuracy('1-1', 'W-high')).toBe(0);
        expect(scoreAccuracy('1-1', 'W-low')).toBe(0);
    });

    it('high-mid (0-1) vs all four corner waste landings: only matching-row scores', () => {
        // Target row 0 → matches waste row -1.
        expect(scoreAccuracy('0-1', 'W-high-in')).toBe(0.75);
        expect(scoreAccuracy('0-1', 'W-high-out')).toBe(0.75);
        expect(scoreAccuracy('0-1', 'W-low-in')).toBe(0);
        expect(scoreAccuracy('0-1', 'W-low-out')).toBe(0);
    });

    it('low-in (2-0) corner target: column-anchored against all four waste corners', () => {
        // Target col 0 (in), row 2 (low). Matching waste col = -1, matching
        // waste row = 3. So in-side waste = 1.0 regardless of row. Wrong-side
        // waste = 0.25 if row-side matches (Dial 1), else 0.
        expect(scoreAccuracy('2-0', 'W-low-in')).toBe(1); // matching col-side
        expect(scoreAccuracy('2-0', 'W-high-in')).toBe(1); // matching col-side
        expect(scoreAccuracy('2-0', 'W-low-out')).toBe(0.25); // wrong side, row matches (Dial 1)
        expect(scoreAccuracy('2-0', 'W-high-out')).toBe(0); // wrong side, row doesn't match
    });

    it('waste target (e.g. W-low-out) projects to its in-zone neighbor (2-2) for scoring', () => {
        // Behaves identically to target = 2-2 for the same actuals.
        expect(scoreAccuracy('W-low-out', '2-2')).toBe(1);
        expect(scoreAccuracy('W-low-out', '1-2')).toBe(1);
        expect(scoreAccuracy('W-low-out', '1-1')).toBe(0.25);
        expect(scoreAccuracy('W-low-out', 'W-low-in')).toBe(0.25); // wrong side, row matches (Dial 1)
    });

    describe('Dial 1 row-floor (2026-05-12)', () => {
        it('column-anchored: 2 cols off but row matches → 0.25', () => {
            // Target low-out (2-2), actual low-in (2-0). Right height, wrong side.
            expect(scoreAccuracy('2-2', '2-0')).toBe(0.25);
            // Target high-in (0-0), actual high-out (0-2). Right height, wrong side.
            expect(scoreAccuracy('0-0', '0-2')).toBe(0.25);
            // Target mid-in (1-0), actual mid-out (1-2). Right height, wrong side.
            expect(scoreAccuracy('1-0', '1-2')).toBe(0.25);
        });

        it('column-anchored: 2 cols off and row off → 0 (unchanged)', () => {
            // Target low-out, actual mid-in. Both axes off.
            expect(scoreAccuracy('2-2', '1-0')).toBe(0);
            // Target low-out, actual high-in. Catastrophic miss.
            expect(scoreAccuracy('2-2', '0-0')).toBe(0);
            // Target high-in, actual low-out.
            expect(scoreAccuracy('0-0', '2-2')).toBe(0);
        });

        it('column-anchored: wrong-col-side waste with matching row-side → 0.25', () => {
            // Target low-out (2-2), actual low-in waste W-low-in. Row matches.
            expect(scoreAccuracy('2-2', 'W-low-in')).toBe(0.25);
            // Target high-out (0-2), actual high-in waste W-high-in. Row matches.
            expect(scoreAccuracy('0-2', 'W-high-in')).toBe(0.25);
            // Target mid-in (1-0), actual mid-out waste W-out (wrong side, row matches).
            expect(scoreAccuracy('1-0', 'W-out')).toBe(0.25);
            // Target low-in (2-0), actual low-out waste W-low-out. Row matches.
            expect(scoreAccuracy('2-0', 'W-low-out')).toBe(0.25);
        });

        it('column-anchored: matching col-side waste still scores 1.0 regardless of row', () => {
            // These should NOT trigger the row-floor logic — matching col-side
            // is always 1.0 in the algorithm.
            expect(scoreAccuracy('1-2', 'W-out')).toBe(1);
            expect(scoreAccuracy('1-2', 'W-high-out')).toBe(1);
            expect(scoreAccuracy('1-2', 'W-low-out')).toBe(1);
            expect(scoreAccuracy('1-0', 'W-in')).toBe(1);
            expect(scoreAccuracy('1-0', 'W-high-in')).toBe(1);
            expect(scoreAccuracy('1-0', 'W-low-in')).toBe(1);
        });

        it('column-anchored: perpendicular waste (W-high / W-low) with matching row-side → 0.25', () => {
            // Target low-out (2-2), actual W-low (mid-col waste below the zone). Row matches.
            expect(scoreAccuracy('2-2', 'W-low')).toBe(0.25);
            // Target high-out (0-2), actual W-high. Row matches.
            expect(scoreAccuracy('0-2', 'W-high')).toBe(0.25);
            // Target low-in (2-0), actual W-low. Row matches.
            expect(scoreAccuracy('2-0', 'W-low')).toBe(0.25);
        });

        it('column-anchored: perpendicular / wrong-side waste with mismatched row → 0', () => {
            // Target low-out (2-2), actual W-in (mid-row waste on the wrong side). Row doesn't match.
            expect(scoreAccuracy('2-2', 'W-in')).toBe(0);
            // Target low-out (2-2), actual W-high (perpendicular, opposite row). Row doesn't match.
            expect(scoreAccuracy('2-2', 'W-high')).toBe(0);
            // Target high-in (0-0), actual W-low-out (corner waste, opposite row + opposite col).
            expect(scoreAccuracy('0-0', 'W-low-out')).toBe(0);
        });
    });

    it('returns only values from {0, 0.25, 0.5, 0.75, 1}', () => {
        const allZones: PitchCallZone[] = [
            '0-0',
            '0-1',
            '0-2',
            '1-0',
            '1-1',
            '1-2',
            '2-0',
            '2-1',
            '2-2',
            'W-high',
            'W-low',
            'W-in',
            'W-out',
            'W-high-in',
            'W-high-out',
            'W-low-in',
            'W-low-out',
        ];
        const allowed = new Set([0, 0.25, 0.5, 0.75, 1]);
        for (const t of allZones) {
            for (const a of allZones) {
                const score = scoreAccuracy(t, a);
                expect(allowed.has(score)).toBe(true);
            }
        }
    });
});
