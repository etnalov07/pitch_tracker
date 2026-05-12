# Command Grade Softening — Row Floor on Column-Anchored Targets

| Field      | Value                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Date       | 2026-05-12                                                                                                                 |
| Status     | Approved (shipped 2026-05-12)                                                                                              |
| Owner      | brian.volante@bvolante.com                                                                                                 |
| Supersedes | Refines [2026-05-11 zone-based-accuracy](2026-05-11-zone-based-accuracy.md) — same algorithm, two new partial-credit cases |

## Context

The zone-based `scoreAccuracy()` rolled out 2026-05-11 (commit `26b5bc8`)
solved the right problem — partial credit, asymmetric in/out vs. mid-col,
coach-readable. But the **column-anchored** branch is too binary on the
"2 cols off" edge:

- Target 2-2 (low-out), actual 2-0 (low-in) — pitcher hit the right **height**,
  but the opposite side. Today: **0.00**.
- Target 2-2, actual W-low-in (waste, low + inside) — same idea. Today: **0.00**.

Game `b3224c08` review (66 pitches, "our pitcher", 2026-05-11): pitcher
targeted 2-2 on 53 of 66 pitches (80%) and leaked to the inside (col 0)
constantly. The current algorithm scored 28% command. Eye-test from the
report and the strike-zone plot says **the height was often right** — every
2-0 actual landed within ~0.05y of the called 0.83y. That's worth more than
zero.

Two diagnostics from the strike-zone plot
(`docs/reports/2026-05-11-game-b3224c08-strike-zone-plot.html`):

1. **31 of the 43 zeroes** are cases where the row matches the target row
   (in-zone "row matched, sideways miss" + matching-row-side waste). These
   land in a tight cluster low-and-inside — recognizably the same intent as
   the called pitch, executed on the wrong corner.
2. **12 of the 43 zeroes** are true misses (mid-row, wrong column, or
   catastrophic both-axis miss). These deserve to stay at 0.00.

## Confirmed Decisions (pending approval)

Two new partial-credit cases on column-anchored targets (target col ∈ {0, 2}).
Mid-col target rules are unchanged — they already credit "right row, wrong
column" appropriately.

### New scoring matrix for column-anchored targets

| Condition                                                     | Old  | New      |
| ------------------------------------------------------------- | ---- | -------- |
| Same column (in-zone, any row)                                | 1.00 | 1.00     |
| Matching-side waste (col = -1 for in target, col = 3 for out) | 1.00 | 1.00     |
| Adjacent column in-zone (1 col off)                           | 0.25 | 0.25     |
| **2 cols off in-zone, row matches target row**                | 0.00 | **0.25** |
| 2 cols off in-zone, row off                                   | 0.00 | 0.00     |
| **Wrong-side waste OR perpendicular waste, row-side matches** | 0.00 | **0.25** |
| Wrong-side / perpendicular waste, row-side doesn't match      | 0.00 | 0.00     |

"Row-side matches" for the waste rule:

- Target row 0 (high) ↔ waste row -1 (e.g. W-high, W-high-in, W-high-out)
- Target row 1 (mid) ↔ waste row 1 (e.g. W-in, W-out — but those are
  already the matching-col-side waste, so this case only fires on
  W-in/W-out when the target is on the opposite column side, which never
  happens because those zones are the matching side for one or the other)
- Target row 2 (low) ↔ waste row 3 (e.g. W-low, W-low-in, W-low-out)

### Why 0.25 and not 0.5

A 0.5 floor would mean "missed by 2 columns but row matched" is worth as
much as "row matched but wrong column for a mid-col target" (also 0.5
under-ish-equivalent in the current mid-col rule via the 0.75 case). That
collapses the distinction between "leaked one column over" (currently 0.25)
and "completely wrong side but right height" (proposed 0.25). Keeping both
at 0.25 is fine: they're both "you had part of the picture right."

If 0.25 still feels too high after seeing the rescored game, the fallback is
0.1 — but a non-{0, 0.25, 0.5, 0.75, 1} value would break the type signature
on `scoreAccuracy`, so we'd need to widen the return type. Easier to start
at 0.25.

## Re-scored game `b3224c08` (preview)

Same 66 pitches, scored under the new rules:

| Score | Current count | New count |   Delta |
| ----: | ------------: | --------: | ------: |
|  1.00 |            15 |        15 |       — |
|  0.75 |             3 |         3 |       — |
|  0.25 |             5 |        36 | **+31** |
|  0.00 |            43 |        12 | **−31** |

| Algorithm                         | Sum   | Grade   |
| --------------------------------- | ----- | ------- |
| Current (zone-based, 2026-05-11)  | 18.50 | **28%** |
| Proposed (Dial 1 + waste sibling) | 26.25 | **40%** |

The 12 pitches still at 0.00 under the new algorithm:

| #   | Target | Actual | Why still 0                             |
| --- | ------ | ------ | --------------------------------------- |
| 21  | 2-2    | 1-0    | mid-in: wrong column AND row off        |
| 24  | 2-2    | W-in   | mid waste, wrong column, row off        |
| 29  | 2-2    | 1-0    | mid-in: wrong column AND row off        |
| 33  | 2-2    | W-in   | same as 24                              |
| 36  | 1-2    | 2-0    | target mid-out, actual low-in: both off |
| 46  | 2-2    | W-in   | same as 24                              |
| 50  | 2-2    | 1-0    | mid-in: wrong column AND row off        |
| 52  | 2-2    | 1-0    | same as 50                              |
| 55  | 2-2    | 0-0    | high-in: catastrophic both-axis miss    |
| 56  | 2-2    | W-in   | same as 24                              |
| 57  | 2-2    | W-in   | same as 24                              |
| 61  | 2-2    | W-in   | same as 24                              |

All twelve pass the eye test as "genuinely bad pitches." The 31 that moved
to 0.25 all share the pattern "right height, wrong side" — exactly the case
the softening is designed for.

40% feels right for this outing: it was a poor command game (53/66 attempted
to the same spot, repeatedly leaked inside), but not 28%-of-MLB-average bad.

## Implementation plan

### packages/shared

1. Update `scoreAccuracy()` at `packages/shared/src/utils/scoreAccuracy.ts`
   lines 69–82 (the column-anchored branch). Two new conditions:

```ts
if (t.col === 0 || t.col === 2) {
    if (isInZone(a)) {
        const colDiff = Math.abs(t.col - a.col);
        if (colDiff === 0) return 1;
        if (colDiff === 1) return 0.25;
        // NEW: 2 cols off, but row matches → 0.25 (was 0)
        if (a.row === t.row) return 0.25;
        return 0;
    }
    // Actual is waste.
    const matchingWasteCol = t.col === 0 ? -1 : 3;
    if (a.col === matchingWasteCol) return 1;
    // NEW: wrong-side / perpendicular waste with row-side match → 0.25 (was 0)
    const matchingWasteRow = t.row === 0 ? -1 : t.row === 2 ? 3 : 1;
    if (a.row === matchingWasteRow) return 0.25;
    return 0;
}
```

2. Mirror the same two cases in
   `packages/api/src/utils/zoneAccuracy.ts:101–113` (api-local copy — see
   `feedback_api_no_runtime_shared_imports`).

3. Extend `packages/shared/src/utils/__tests__/scoreAccuracy.test.ts` with
   cases for the new rule:
    - Column-anchored, 2 cols off, row matches → 0.25 (low-out → low-in, high-in → high-out, etc.)
    - Column-anchored, 2 cols off, row off → 0 (unchanged)
    - Column-anchored target with wrong-side waste, row matches → 0.25
      (target 2-2, actual W-low-in)
    - Column-anchored target with perpendicular waste, row matches → 0.25
      (target 2-2, actual W-low)
    - Column-anchored target with wrong-side waste, row off → 0 (target
      2-2, actual W-in)

4. Same tests duplicated in `packages/api/src/utils/__tests__/zoneAccuracy.test.ts`.

### packages/api

5. Migration `039_invalidate_command_grade_summaries.sql` — invalidate
   cached `performance_summaries.target_accuracy_percentage` so the new
   algorithm reflows on next view. Precedent: `038_invalidate_zone_accuracy_summaries.sql`.

### packages/web + packages/mobile

No UI changes — label and field shape unchanged.

### Versions

- `packages/api` patch bump (1.4.x → 1.4.x+1) — algorithm tweak, no API
  surface change.
- `packages/shared` patch bump (per [no shared version bumps] — actually
  leave it. The pinned 1.0.0 dependents will pick up the new function body
  on rebuild, and CI won't try to install a new shared version from the
  registry.) **Do not bump `packages/shared/package.json`** —
  see [no-shared-version-bumps memory].
- `packages/web` and `packages/mobile` — no version bump (no code change).

## Verification

- [ ] All 26 existing `scoreAccuracy` unit tests still pass.
- [ ] New tests for the 2 new conditions pass on both shared and api copies.
- [ ] Migration runs cleanly on dev DB.
- [ ] Regenerate game `b3224c08` Performance Summary; confirm grade rises
      from 28% → ~40%.
- [ ] Sanity-check 2–3 recent games where grade was already in the 50–70%
      range; new grade should be similar (only "row matched, sideways miss"
      pitches change).
- [ ] Add `2026-05-12-command-grade-softening.md` change doc to
      `docs/changes/` and update its README when shipped.

## Out of scope

- Touching the mid-col target branch. Already gentle enough — same row,
  col off by 1 = 0.75 is reasonable.
- Touching the live "Accuracy" stat threshold during a session
  (`TARGET_ACCURACY_THRESHOLD`). Still binary, still strict, still right
  for the live signal.
- Backfilling historical `performance_summaries` beyond the migration
  invalidation. Regenerate lazily on next view.
- Adding a fractional score like 0.1. If 0.25 feels too generous after
  rescoring real games, that's the next conversation.
