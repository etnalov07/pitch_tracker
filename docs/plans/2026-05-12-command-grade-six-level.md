# Command Grade — Six-Level Scoring (Dial 2)

| Field      | Value                                                                         |
| ---------- | ----------------------------------------------------------------------------- |
| Date       | 2026-05-12                                                                    |
| Status     | Not adopted — [Dial 1](2026-05-12-command-grade-softening.md) shipped instead |
| Owner      | brian.volante@bvolante.com                                                    |
| Supersedes | n/a                                                                           |

## Context

[Dial 1](2026-05-12-command-grade-softening.md) softens the column-anchored
branch with two surgical exceptions (row-floor at 0.25). It preserves the
5-level scale `{0, 0.25, 0.5, 0.75, 1}` and the existing rule structure.

Dial 2 takes a different approach: **collapse the in-zone / waste distinction
by projecting both to a 3×3 grid**, then use weighted (row, col) distance to
produce 6 levels `{0, 0.20, 0.40, 0.60, 0.80, 1.00}`. The output is more
granular and the code is simpler (no special-cased waste matrix).

## The algorithm

```ts
// Project any zone (in-zone or waste) to the nearest 3×3 cell.
function project(zone: PitchCallZone): { row: number; col: number } {
    const raw = ZONE_GRID[zone];
    return {
        row: Math.max(0, Math.min(2, raw.row)),
        col: Math.max(0, Math.min(2, raw.col)),
    };
}

export function scoreAccuracy(target, actual): 0 | 0.2 | 0.4 | 0.6 | 0.8 | 1 {
    const t = project(target);
    const a = project(actual);
    const rd = Math.abs(t.row - a.row);
    const cd = Math.abs(t.col - a.col);

    if (t.col === 0 || t.col === 2) {
        // Column-anchored: col miss weighted heavier than row miss.
        if (cd === 0) return rd === 0 ? 1.0 : rd === 1 ? 0.8 : 0.6;
        if (cd === 1) return rd === 0 ? 0.6 : rd === 1 ? 0.4 : 0.2;
        // cd === 2
        return rd === 0 ? 0.2 : 0;
    }
    // Mid-col target: row miss weighted heavier than col miss.
    if (rd === 0) return cd === 0 ? 1.0 : 0.8;
    if (rd === 1) return cd === 0 ? 0.6 : 0.4;
    return cd === 0 ? 0.2 : 0;
}
```

That's the whole thing. No separate waste branch, no row-side projection,
no matching-side col logic — just project-and-distance.

## Scoring matrices

**Column-anchored target (t.col ∈ {0, 2})** — col miss matters more:

| colDiff | rowDiff=0 | rowDiff=1 | rowDiff=2 |
| ------: | --------: | --------: | --------: |
|       0 |  **1.00** |      0.80 |      0.60 |
|       1 |      0.60 |      0.40 |      0.20 |
|       2 |      0.20 |      0.00 |      0.00 |

**Mid-col target (t.col === 1)** — row miss matters more:

| rowDiff | colDiff=0 | colDiff=1 |
| ------: | --------: | --------: |
|       0 |  **1.00** |      0.80 |
|       1 |      0.60 |      0.40 |
|       2 |      0.20 |      0.00 |

Waste projection (rows): -1 → 0, 1 → 1, 3 → 2. Same for cols.

## What this changes vs. current (2026-05-11)

| Case                                                             | Current | Dial 2 | Δ     |
| ---------------------------------------------------------------- | ------- | ------ | ----- |
| Target 2-2, actual 2-2 (exact)                                   | 1.00    | 1.00   | —     |
| Target 2-2, actual W-low-out (matching corner waste)             | 1.00    | 1.00   | —     |
| Target 2-2, actual W-out (matching col, 1 row off via mid waste) | 1.00    | 0.80   | −0.20 |
| Target 2-2, actual W-high-out (matching col, opposite corner)    | 1.00    | 0.60   | −0.40 |
| Target 2-2, actual 1-2 (same col, 1 row off)                     | 1.00    | 0.80   | −0.20 |
| Target 2-2, actual 0-2 (same col, 2 rows off)                    | 1.00    | 0.60   | −0.40 |
| Target 2-2, actual 2-1 (adj col, same row)                       | 0.25    | 0.60   | +0.35 |
| Target 2-2, actual 1-1 (adj col, 1 row off)                      | 0.25    | 0.40   | +0.15 |
| Target 2-2, actual 0-1 (adj col, 2 rows off)                     | 0.25    | 0.20   | −0.05 |
| Target 2-2, actual 2-0 (2 cols off, same row)                    | 0.00    | 0.20   | +0.20 |
| Target 2-2, actual 1-0 (2 cols off, 1 row off)                   | 0.00    | 0.00   | —     |
| Target 2-2, actual W-low-in (wrong-side waste, matching row)     | 0.00    | 0.20   | +0.20 |
| Target 2-2, actual W-in (wrong-side waste, perpendicular row)    | 0.00    | 0.00   | —     |
| Target 2-2, actual W-low (perpendicular waste, matching row)     | 0.00    | 0.60\* | +0.60 |
| Target 2-1, actual 2-0 (mid-col, same row, 1 col off)            | 0.75    | 0.80   | +0.05 |
| Target 2-1, actual 2-2 (mid-col, same row, 1 col off)            | 0.75    | 0.80   | +0.05 |
| Target 2-1, actual 1-1 (mid-col, 1 row off, same col)            | 0.25    | 0.60   | +0.35 |
| Target 2-1, actual W-low (mid-col, matching row-side waste)      | 0.75    | 0.80   | +0.05 |

\* W-low (waste) projects to (row 2, col 1) — same grid point as in-zone 2-1.
This is a deliberate choice: the cleanest version of Dial 2 treats waste and
in-zone landings identically once mapped. If you'd rather penalize waste
landings more, see "Variant" below.

## Re-scored game `b3224c08`

Same 66 pitches scored under all three algorithms:

| Score | Current | Dial 1 | Dial 2 |
| ----: | ------: | -----: | -----: |
|  1.00 |      15 |     15 |      9 |
|  0.80 |       — |      — |      9 |
|  0.75 |       3 |      3 |      — |
|  0.60 |       — |      — |      4 |
|  0.50 |       — |      — |      — |
|  0.40 |       — |      — |      2 |
|  0.25 |       5 |     36 |      — |
|  0.20 |       — |      — |     30 |
|  0.00 |      43 |     12 |     12 |

| Algorithm | Sum   | Grade   |
| --------- | ----- | ------- |
| Current   | 18.50 | 28%     |
| Dial 1    | 26.25 | 40%     |
| Dial 2    | 25.40 | **38%** |

**The grade is similar to Dial 1 but the distribution is richer**:

- 9 pitches at 1.00 (true exact hits and matching corner waste)
- 9 pitches at 0.80 (same column, slight row miss — e.g. #4/5/6 #19 #31 #64,
  the "matching col but missed up" cases that were previously 1.00)
- 4 pitches at 0.60 (adjacent col with same row — recognizes "right height,
  one zone over")
- 2 pitches at 0.40 (one-axis miss + one-axis adjacent)
- 30 pitches at 0.20 ("right idea, wrong side" — same row, 2 cols off)
- 12 pitches at 0.00 (same 12 catastrophic misses as Dial 1)

The 12 still at 0.00 are identical to Dial 1's set.

## Pros / cons vs. Dial 1

| Aspect                 | Dial 1                                       | Dial 2                                            |
| ---------------------- | -------------------------------------------- | ------------------------------------------------- |
| Levels                 | 5 `{0, .25, .5, .75, 1}`                     | 6 `{0, .2, .4, .6, .8, 1}`                        |
| Code surface           | +2 conditions on existing branch             | Replace function entirely (cleaner)               |
| Existing tests         | All 26 still pass; add 4–5 new cases         | ~half of the 26 will need updated expected values |
| Same-col vertical miss | 1.00 (e.g. #6 stays 1.00, generous)          | 0.80 / 0.60 (catches #6 as 0.80)                  |
| Adj col, same row      | 0.25 (still feels low)                       | 0.60 (recognizes "right height, one over")        |
| Waste handling         | Special-cased (matching-side, perpendicular) | Just project to grid, treat same as in-zone       |
| Migration              | 039_invalidate_command_grade_summaries.sql   | Same migration                                    |
| Risk                   | Smaller surface area, low test churn         | Bigger conceptual shift, more test churn          |

## Variant — penalize waste landings

If "waste lands identical to in-zone of the same grid cell" feels wrong
(e.g. you want pitch #51, target 2-2 → W-low, to score lower than pitch #2,
target 2-2 → 2-1, which both project to (row 2, col 1)):

```ts
// After computing the base score:
if (!isInZone(ZONE_GRID[actual])) {
    score = Math.max(0, score - 0.2); // one bucket down for any waste landing
}
```

This drops every waste landing by one tier:

- Target 2-2, actual W-low-out (matching corner): 1.00 → 0.80
- Target 2-2, actual W-out: 0.80 → 0.60
- Target 2-2, actual W-low (mid-col waste, same row): 0.60 → 0.40
- Target 2-2, actual W-low-in (wrong-side waste): 0.20 → 0.00

Recommendation: **start without the variant**. A waste pitch with the right
intent is still a competitive pitch (#4-6 are foul balls / swinging
strikes — useful outcomes). The grade is about command intent, not strike-call
correctness.

## Implementation plan

### packages/shared

1. **Replace** `scoreAccuracy()` body in
   `packages/shared/src/utils/scoreAccuracy.ts` with the version above.
   Drop the now-unused `projectToInZone` helper (or keep it; the new
   `project()` is essentially the same thing).
2. **Update return type:**
   `function scoreAccuracy(target, actual): 0 | 0.2 | 0.4 | 0.6 | 0.8 | 1`.
3. **Rewrite** `packages/shared/src/utils/__tests__/scoreAccuracy.test.ts`
   to use the new matrix as the source of truth. Most existing cases will
   change expected values — that's fine, the algorithm changed. Aim for
   coverage of every (rd, cd) cell in both target types.

### packages/api

4. Mirror the same algorithm into `packages/api/src/utils/zoneAccuracy.ts`
   (api-local copy — [feedback_api_no_runtime_shared_imports]).
5. Mirror the test updates in `packages/api/src/utils/__tests__/zoneAccuracy.test.ts`.
6. Migration `039_invalidate_command_grade_summaries.sql` — same as Dial 1.

### packages/web + packages/mobile

7. **Update any type imports** of the `scoreAccuracy` return type if the
   union is referenced anywhere outside the shared util. (Spot-check
   passing.) No UI label changes.

### Versions

- `packages/api` minor bump (1.4.x → 1.5.0) — algorithm change, user-visible
  scores will shift.
- `packages/shared`: **no version bump** (per memory).
- `packages/web` / `packages/mobile`: no version bump.

## Verification

- [ ] All cells of the column-anchored 3×3 matrix have at least one test case.
- [ ] All cells of the mid-col 3×2 matrix have at least one test case.
- [ ] Waste projection tested for every waste zone (8 zones).
- [ ] Migration runs cleanly.
- [ ] Regenerate game `b3224c08` Performance Summary; confirm grade is ~38%
      and the per-bucket histogram matches the table above.
- [ ] Sanity-check 2–3 recent games where grade was already 50–70%; new
      grade should land within ±5 points.

## Out of scope

- The "penalize waste landings" variant — defer until we see real games and
  decide whether it's needed.
- Touching the live `TARGET_ACCURACY_THRESHOLD` (still binary, still right
  for the live signal).
- Backfilling historical summaries beyond the migration invalidation.

## Decision needed

Pick before implementation:

- **Dial 1** if you want the smallest possible code change and to preserve
  the 5-level type signature.
- **Dial 2** if you want the more graduated scale and don't mind rewriting
  the function + tests. The HTML report at
  `docs/reports/2026-05-11-game-b3224c08-strike-zone-plot.html` lets you
  toggle between all three (Current / Dial 1 / Dial 2) and step through
  pitch by pitch.
