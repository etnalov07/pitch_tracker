import { BALL_RADIUS, BALL_DIAMETER, TARGET_ACCURACY_THRESHOLD, targetDistance, isTargetHit } from '../pitchLocation';

describe('utils/pitchLocation', () => {
    describe('constants', () => {
        it('BALL_DIAMETER is twice the radius', () => {
            expect(BALL_DIAMETER).toBeCloseTo(BALL_RADIUS * 2, 10);
        });
    });

    describe('targetDistance', () => {
        it('returns 0 when actual equals target', () => {
            expect(targetDistance(0.5, 0.5, 0.5, 0.5)).toBe(0);
        });

        it('returns the euclidean distance for arbitrary points', () => {
            // 3-4-5 triangle: dx=3, dy=4 → distance 5
            expect(targetDistance(0, 0, 3, 4)).toBe(5);
        });

        it('is symmetric in target/actual ordering', () => {
            const a = targetDistance(0.2, 0.8, 0.7, 0.4);
            const b = targetDistance(0.7, 0.4, 0.2, 0.8);
            expect(a).toBeCloseTo(b, 10);
        });
    });

    describe('isTargetHit', () => {
        it('returns true when distance is exactly at threshold', () => {
            // Use dx = threshold, dy = 0 → distance equals threshold
            expect(isTargetHit(0.5, 0.5, 0.5 + TARGET_ACCURACY_THRESHOLD, 0.5)).toBe(true);
        });

        it('returns true for a clean miss inside the threshold', () => {
            expect(isTargetHit(0.5, 0.5, 0.55, 0.55)).toBe(true);
        });

        it('returns false when distance exceeds threshold', () => {
            // dx = threshold + 0.01 keeps us just outside
            expect(isTargetHit(0.5, 0.5, 0.5 + TARGET_ACCURACY_THRESHOLD + 0.01, 0.5)).toBe(false);
        });

        it('honours a custom threshold override', () => {
            // 0.1 is outside default threshold... wait, default is 0.22, so 0.1 is inside.
            // Use a tighter custom threshold to flip the result.
            expect(isTargetHit(0.5, 0.5, 0.6, 0.5)).toBe(true);
            expect(isTargetHit(0.5, 0.5, 0.6, 0.5, 0.05)).toBe(false);
        });
    });
});
