export const BALL_RADIUS = 0.085;
export const BALL_DIAMETER = BALL_RADIUS * 2;

export const TARGET_ACCURACY_THRESHOLD = 0.22;

export function targetDistance(targetX: number, targetY: number, actualX: number, actualY: number): number {
    const dx = actualX - targetX;
    const dy = actualY - targetY;
    return Math.sqrt(dx * dx + dy * dy);
}

export function isTargetHit(
    targetX: number,
    targetY: number,
    actualX: number,
    actualY: number,
    threshold: number = TARGET_ACCURACY_THRESHOLD
): boolean {
    return targetDistance(targetX, targetY, actualX, actualY) <= threshold;
}
