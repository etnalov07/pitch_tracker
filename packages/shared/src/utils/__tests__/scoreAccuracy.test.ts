import { PitchCallZone } from '../../index';
import { scoreAccuracy } from '../scoreAccuracy';

// The 20 worked-example pitches from
// docs/plans/2026-05-11-zone-based-accuracy.md. If you change the helper,
// re-run the sample by hand against the plan tables and update both here and
// the doc together.
describe('scoreAccuracy — worked example (20 pitches)', () => {
    const cases: Array<{ target: PitchCallZone; actual: PitchCallZone; expected: number; reason: string }> = [
        { target: '2-2', actual: '2-2', expected: 1, reason: 'Spot on (low-out)' },
        { target: '2-2', actual: '1-2', expected: 0.75, reason: 'Same col (out), 1 row off' },
        { target: '2-2', actual: '0-2', expected: 0.5, reason: 'Same col (out), 2 rows off' },
        { target: '2-2', actual: '2-1', expected: 0.25, reason: 'Adjacent col' },
        { target: '2-2', actual: '1-1', expected: 0.25, reason: 'Adjacent col' },
        { target: '2-2', actual: 'W-low-out', expected: 0.75, reason: 'Waste matching side (out)' },
        { target: '2-2', actual: 'W-low-in', expected: 0, reason: 'Waste opposite side' },
        { target: '0-0', actual: '0-0', expected: 1, reason: 'Spot on (high-in)' },
        { target: '0-0', actual: '1-0', expected: 0.75, reason: 'Same col (in), 1 row off' },
        { target: '0-0', actual: 'W-in', expected: 0.75, reason: 'Waste matching side (in)' },
        { target: '0-0', actual: 'W-high-out', expected: 0, reason: 'Waste opposite side' },
        { target: '1-2', actual: '1-2', expected: 1, reason: 'Spot on (mid-out)' },
        { target: '1-2', actual: '0-2', expected: 0.75, reason: 'Same col (out), 1 row off' },
        { target: '1-2', actual: '1-0', expected: 0, reason: '2 cols off' },
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

    it('total of the 20-pitch sample sums to 11.25 (56% rounded)', () => {
        const sum = cases.reduce((acc, c) => acc + scoreAccuracy(c.target, c.actual), 0);
        expect(sum).toBeCloseTo(11.25, 10);
        expect(Math.round((sum / cases.length) * 100)).toBe(56);
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
        // Target col 0 (in) → matches waste col -1.
        expect(scoreAccuracy('2-0', 'W-low-in')).toBe(0.75);
        expect(scoreAccuracy('2-0', 'W-high-in')).toBe(0.75);
        expect(scoreAccuracy('2-0', 'W-low-out')).toBe(0);
        expect(scoreAccuracy('2-0', 'W-high-out')).toBe(0);
    });

    it('waste target (e.g. W-low-out) projects to its in-zone neighbor (2-2) for scoring', () => {
        // Behaves identically to target = 2-2 for the same actuals.
        expect(scoreAccuracy('W-low-out', '2-2')).toBe(1);
        expect(scoreAccuracy('W-low-out', '1-2')).toBe(0.75);
        expect(scoreAccuracy('W-low-out', '1-1')).toBe(0.25);
        expect(scoreAccuracy('W-low-out', 'W-low-in')).toBe(0);
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
