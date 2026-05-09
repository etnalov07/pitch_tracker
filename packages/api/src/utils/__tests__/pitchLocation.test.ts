import {
    BALL_RADIUS,
    BALL_DIAMETER,
    TARGET_ACCURACY_THRESHOLD,
    SUMMARY_TARGET_ACCURACY_THRESHOLD,
    targetDistance,
    isTargetHit,
} from '../pitchLocation';

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

    describe('SUMMARY_TARGET_ACCURACY_THRESHOLD', () => {
        it('equals 2.5 ball-widths', () => {
            expect(SUMMARY_TARGET_ACCURACY_THRESHOLD).toBeCloseTo(BALL_DIAMETER * 2.5, 10);
        });

        it('is looser than the live-UI TARGET_ACCURACY_THRESHOLD', () => {
            expect(SUMMARY_TARGET_ACCURACY_THRESHOLD).toBeGreaterThan(TARGET_ACCURACY_THRESHOLD);
        });

        it('credits a near-miss that the strict threshold would reject', () => {
            // 1.5 ball-widths off — outside live threshold (0.22), inside summary threshold (0.425)
            const dx = BALL_DIAMETER * 1.5;
            expect(isTargetHit(0.5, 0.5, 0.5 + dx, 0.5)).toBe(false);
            expect(isTargetHit(0.5, 0.5, 0.5 + dx, 0.5, SUMMARY_TARGET_ACCURACY_THRESHOLD)).toBe(true);
        });

        it('still rejects clear misses beyond 2.5 ball-widths', () => {
            // 3 ball-widths off — outside both thresholds
            const dx = BALL_DIAMETER * 3;
            expect(isTargetHit(0.5, 0.5, 0.5 + dx, 0.5, SUMMARY_TARGET_ACCURACY_THRESHOLD)).toBe(false);
        });
    });
});
