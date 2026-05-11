import { getNearestPitchCallZone, scoreAccuracy } from '../zoneAccuracy';

// Smoke tests for the api-local copy. The exhaustive 26-case suite lives in
// packages/shared/src/utils/__tests__/scoreAccuracy.test.ts — that file is
// the source of truth for the algorithm. These cases exist only to catch
// drift between the api copy and the shared copy (api can't import from
// @pitch-tracker/shared at runtime in production, hence the duplication).
describe('zoneAccuracy (api-local mirror of shared)', () => {
    it('spot-on hit returns 1', () => {
        expect(scoreAccuracy('2-2', '2-2')).toBe(1);
        expect(scoreAccuracy('0-0', '0-0')).toBe(1);
        expect(scoreAccuracy('1-1', '1-1')).toBe(1);
    });

    it('column-anchored target (in/out): same col 1 row off = 0.75', () => {
        expect(scoreAccuracy('2-2', '1-2')).toBe(0.75);
        expect(scoreAccuracy('0-0', '1-0')).toBe(0.75);
    });

    it('column-anchored target: same col 2 rows off = 0.5', () => {
        expect(scoreAccuracy('2-2', '0-2')).toBe(0.5);
    });

    it('column-anchored target: adjacent col = 0.25', () => {
        expect(scoreAccuracy('2-2', '2-1')).toBe(0.25);
        expect(scoreAccuracy('2-2', '1-1')).toBe(0.25);
    });

    it('column-anchored target: 2 cols off = 0', () => {
        expect(scoreAccuracy('1-2', '1-0')).toBe(0);
    });

    it('column-anchored target: waste matching side = 0.75, opposite = 0', () => {
        expect(scoreAccuracy('2-2', 'W-low-out')).toBe(0.75);
        expect(scoreAccuracy('0-0', 'W-in')).toBe(0.75);
        expect(scoreAccuracy('2-2', 'W-low-in')).toBe(0);
        expect(scoreAccuracy('0-0', 'W-high-out')).toBe(0);
    });

    it('mid-col target: same row 1 col off = 0.75', () => {
        expect(scoreAccuracy('0-1', '0-0')).toBe(0.75);
        expect(scoreAccuracy('0-1', '0-2')).toBe(0.75);
    });

    it('mid-col target: 1 row off = 0.25, 2 rows off = 0', () => {
        expect(scoreAccuracy('0-1', '1-1')).toBe(0.25);
        expect(scoreAccuracy('0-1', '2-1')).toBe(0);
    });

    it('mid-col target: waste matching row = 0.75, opposite row = 0', () => {
        expect(scoreAccuracy('0-1', 'W-high')).toBe(0.75);
        expect(scoreAccuracy('0-1', 'W-low')).toBe(0);
        expect(scoreAccuracy('1-1', 'W-in')).toBe(0.75);
        expect(scoreAccuracy('1-1', 'W-high')).toBe(0);
    });

    it('getNearestPitchCallZone resolves to the closest zone', () => {
        expect(getNearestPitchCallZone(0.5, 0.5)).toBe('1-1');
        expect(getNearestPitchCallZone(0.167, 0.167)).toBe('0-0');
        expect(getNearestPitchCallZone(0.833, 0.833)).toBe('2-2');
        expect(getNearestPitchCallZone(1.15, 1.15)).toBe('W-low-out');
    });
});
