// Zone-based pitch command scoring — api-local copy.
//
// Mirrors packages/shared/src/utils/scoreAccuracy.ts (same algorithm, same
// 26 unit tests live there). Duplicated here to avoid a runtime
// `require('@pitch-tracker/shared')` — the api's production deployment
// ships only the api dist and does not have @pitch-tracker/shared installed
// as a real npm package. Same pattern as `analytics.service.ts` and the
// `pitchLocation.ts` constants.
//
// If you change this file, also update the shared copy and its tests so the
// algorithm stays in sync. The shared tests are the source of truth for
// correctness.

import type { PitchCallZone } from '../types';

// Center coordinates (0..1 normalized) for every PitchCallZone. Matches
// PITCH_CALL_ZONE_COORDS in @pitch-tracker/shared.
const ZONE_COORDS: Record<PitchCallZone, { x: number; y: number }> = {
    '0-0': { x: 0.167, y: 0.167 },
    '0-1': { x: 0.5, y: 0.167 },
    '0-2': { x: 0.833, y: 0.167 },
    '1-0': { x: 0.167, y: 0.5 },
    '1-1': { x: 0.5, y: 0.5 },
    '1-2': { x: 0.833, y: 0.5 },
    '2-0': { x: 0.167, y: 0.833 },
    '2-1': { x: 0.5, y: 0.833 },
    '2-2': { x: 0.833, y: 0.833 },
    'W-high': { x: 0.5, y: -0.15 },
    'W-low': { x: 0.5, y: 1.15 },
    'W-in': { x: -0.15, y: 0.5 },
    'W-out': { x: 1.15, y: 0.5 },
    'W-high-in': { x: -0.15, y: -0.15 },
    'W-high-out': { x: 1.15, y: -0.15 },
    'W-low-in': { x: -0.15, y: 1.15 },
    'W-low-out': { x: 1.15, y: 1.15 },
};

const ALL_ZONES = Object.keys(ZONE_COORDS) as PitchCallZone[];

/** Nearest PitchCallZone to a normalized (x, y) coordinate. */
export function getNearestPitchCallZone(x: number, y: number): PitchCallZone {
    let best: PitchCallZone = '1-1';
    let bestDist = Infinity;
    for (const zone of ALL_ZONES) {
        const coords = ZONE_COORDS[zone];
        const dx = x - coords.x;
        const dy = y - coords.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
            bestDist = dist;
            best = zone;
        }
    }
    return best;
}

// Extended 5x5 grid: in-zone rows/cols are 0..2; waste extends one step
// to -1 / 3. See packages/shared/src/utils/scoreAccuracy.ts for the
// reasoning.
const ZONE_GRID: Record<PitchCallZone, { row: number; col: number }> = {
    '0-0': { row: 0, col: 0 },
    '0-1': { row: 0, col: 1 },
    '0-2': { row: 0, col: 2 },
    '1-0': { row: 1, col: 0 },
    '1-1': { row: 1, col: 1 },
    '1-2': { row: 1, col: 2 },
    '2-0': { row: 2, col: 0 },
    '2-1': { row: 2, col: 1 },
    '2-2': { row: 2, col: 2 },
    'W-high': { row: -1, col: 1 },
    'W-low': { row: 3, col: 1 },
    'W-in': { row: 1, col: -1 },
    'W-out': { row: 1, col: 3 },
    'W-high-in': { row: -1, col: -1 },
    'W-high-out': { row: -1, col: 3 },
    'W-low-in': { row: 3, col: -1 },
    'W-low-out': { row: 3, col: 3 },
};

function isInZone(coord: { row: number; col: number }): boolean {
    return coord.row >= 0 && coord.row <= 2 && coord.col >= 0 && coord.col <= 2;
}

function projectToInZone(coord: { row: number; col: number }): { row: number; col: number } {
    return {
        row: Math.max(0, Math.min(2, coord.row)),
        col: Math.max(0, Math.min(2, coord.col)),
    };
}

/**
 * Score how close `actual` was to `target` in the strike-zone grid.
 * Returns one of {0, 0.25, 0.5, 0.75, 1}. See full rules in
 * docs/plans/2026-05-11-zone-based-accuracy.md.
 */
export function scoreAccuracy(target: PitchCallZone, actual: PitchCallZone): 0 | 0.25 | 0.5 | 0.75 | 1 {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];

    if (t.col === 0 || t.col === 2) {
        // Column-anchored: matching col-side = 1.0. Adjacent col = 0.25.
        // 2 cols off = 0, unless row matches → 0.25 (right height, wrong
        // side). Wrong-col-side / perpendicular waste with matching row-side
        // = 0.25.
        const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
        if (isInZone(a)) {
            const colDiff = Math.abs(t.col - a.col);
            if (colDiff === 0) return 1;
            if (colDiff === 1) return 0.25;
            if (a.row === t.row) return 0.25;
            return 0;
        }
        const matchingWasteCol = t.col === 0 ? -1 : 3;
        if (a.col === matchingWasteCol) return 1;
        if (a.row === matchingWasteRow) return 0.25;
        return 0;
    }

    // Mid-col target (t.col === 1): row-anchored.
    if (isInZone(a)) {
        const rowDiff = Math.abs(t.row - a.row);
        const colDiff = Math.abs(1 - a.col);
        if (rowDiff === 0) {
            if (colDiff === 0) return 1;
            return 0.75;
        }
        if (rowDiff === 1) return 0.25;
        return 0;
    }
    const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === matchingWasteRow ? 0.75 : 0;
}
