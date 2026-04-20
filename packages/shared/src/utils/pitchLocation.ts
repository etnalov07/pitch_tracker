// Constants and helpers for pitch-location math.
//
// Strike zone is represented in normalized coordinates where the zone occupies
// (0,0) to (1,1). The ball and target circle are both rendered at ball-width
// diameter, so their radius in zone coords is BALL_RADIUS.
//
// A pitch counts as "hitting its target" when the distance between the
// (target_x, target_y) and (actual_x, actual_y) is within TARGET_ACCURACY_THRESHOLD.
//
// Rationale for 0.22: the target is a ball-width circle (radius ~0.085). A
// threshold of 0.22 means the ball circle visually touches or overlaps the
// target — forgiving enough to credit well-spotted pitches, strict enough that
// clear misses still miss. Roughly 3.75" tolerance across a 17" zone.

export const BALL_RADIUS = 0.085;
export const BALL_DIAMETER = BALL_RADIUS * 2;

export const TARGET_ACCURACY_THRESHOLD = 0.22;

/** Euclidean distance between target and actual pitch location in zone coords. */
export function targetDistance(targetX: number, targetY: number, actualX: number, actualY: number): number {
    const dx = actualX - targetX;
    const dy = actualY - targetY;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Returns true if the actual location is within the target-accuracy threshold. */
export function isTargetHit(
    targetX: number,
    targetY: number,
    actualX: number,
    actualY: number,
    threshold: number = TARGET_ACCURACY_THRESHOLD
): boolean {
    return targetDistance(targetX, targetY, actualX, actualY) <= threshold;
}
