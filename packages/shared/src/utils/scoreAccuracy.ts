// Zone-based pitch command scoring.
//
// Returns a partial-credit score in {0, 0.25, 0.5, 0.75, 1} based on how
// close the actual landing zone is to the called target zone.
//
// Rules (full matrix in docs/plans/2026-05-11-zone-based-accuracy.md, with
// 2026-05-12 row-floor softening in docs/plans/2026-05-12-command-grade-softening.md):
//   - In/out column targets are column-anchored: column miss matters more
//     than row miss. Adjacent column = 0.25. Two columns off = 0, unless the
//     row matches the target row, in which case 0.25 (right height, wrong
//     side).
//   - Mid-column targets are row-anchored: row miss dominates. Adjacent row
//     gets partial credit; two rows off is zero.
//   - Waste landings on the matching col-side get 1.0. Waste on the wrong
//     col-side (or perpendicular waste like W-low / W-high) gets 0.25 when
//     its row-side matches the target row, else 0.
//   - Waste targets (called intentional ball, very rare) project to the
//     nearest in-zone neighbor before scoring.

import type { PitchCallZone } from '../index';

// Every zone mapped to its position in an extended 5x5 grid. In-zone occupies
// rows 0..2 / cols 0..2. Waste zones extend one step in each direction:
//   col -1 = inside the strike zone vertical edge
//   col  3 = outside the strike zone vertical edge
//   row -1 = above the strike zone horizontal edge
//   row  3 = below the strike zone horizontal edge
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

// Project a waste-zone coordinate to its nearest in-zone neighbor by clamping.
function projectToInZone(coord: { row: number; col: number }): { row: number; col: number } {
    return {
        row: Math.max(0, Math.min(2, coord.row)),
        col: Math.max(0, Math.min(2, coord.col)),
    };
}

/**
 * Score how close `actual` was to `target` in the strike-zone grid.
 *
 * Returns one of {0, 0.25, 0.5, 0.75, 1}. See full rules in
 * `docs/plans/2026-05-11-zone-based-accuracy.md`.
 */
export function scoreAccuracy(target: PitchCallZone, actual: PitchCallZone): 0 | 0.25 | 0.5 | 0.75 | 1 {
    const targetRaw = ZONE_GRID[target];
    const t = isInZone(targetRaw) ? targetRaw : projectToInZone(targetRaw);
    const a = ZONE_GRID[actual];

    if (t.col === 0 || t.col === 2) {
        // Column-anchored: in or out target. Matching col-side = 1.0.
        // Adjacent col = 0.25. 2 cols off = 0, unless row matches → 0.25
        // (right height, wrong side). Wrong-col-side / perpendicular waste
        // with matching row-side = 0.25.
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
    // Actual is waste. Match on row-side direction.
    //   target row 0 (high) → match if waste row === -1
    //   target row 2 (low)  → match if waste row === 3
    //   target row 1 (mid)  → match if waste row === 1 (W-in / W-out are mid-row)
    const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    return a.row === matchingWasteRow ? 0.75 : 0;
}
