# Fix: Command Grade A1 — adjacent-column row split + dead import cleanup

| Date       | Type | Commit    | Versions          |
| ---------- | ---- | --------- | ----------------- |
| 2026-05-12 | fix  | `06c50c3` | api 1.6.0 → 1.6.1 |

## Context

The 2026-05-12 command-grade audit (see
[docs/plans/2026-05-12-command-grade-audit.md](../plans/2026-05-12-command-grade-audit.md))
tested four candidate tweaks (A1, C1, D1, combined) against six curated
games from `dump.sql`. Only A1 moved enough pitches to earn its complexity:
26 of 530 curated pitches under A1, vs 0–2 under C1 / D1. The audit also
caught a dead import in `performanceSummary.service.ts` left over from the
pre-zone-based summary path.

Under the prior algorithm, a pitch missing by one column but holding the
target's row scored the same (0.25) as a pitch missing both axes by one
bucket — even though the first miss demonstrates better height command.
A1 splits that case.

## Decisions

### Algorithm change (A1)

Column-anchored branch (`t.col === 0 || t.col === 2`), in-zone actual,
`colDiff === 1`:

| Condition                                | Before | After   |
| ---------------------------------------- | -----: | ------: |
| Adjacent col, **row matches target row** |  0.25  | **0.5** |
| Adjacent col, row off                    |  0.25  |   0.25  |

All other rules unchanged. The mid-col branch is untouched. C1 and D1 from
the audit were intentionally not landed — see "Out of scope" below.

### Dead import cleanup

`packages/api/src/services/performanceSummary.service.ts:1` imported
`SUMMARY_TARGET_ACCURACY_THRESHOLD` and `isTargetHit` from
`../utils/pitchLocation`. Neither was referenced anywhere else in the file
— leftover from before the summary path moved to zone-based scoring. The
import line is removed. The constant itself remains exported from
`@pitch-tracker/shared` for now (still tested in `pitchLocation.test.ts`).

### Re-scored curated games (from the audit sweep)

| Game     | Pitches | Baseline | After A1 | Δ |
| -------- | ------: | -------: | -------: | -: |
| c646824a |     130 |     40%  |     41%  | +1 |
| 9bd6d5e9 |     123 |     50%  |     51%  | +1 |
| b3224c08 |      66 |     40%  |     41%  | +1 |
| e2b3d7d4 |      67 |     35%  |     37%  | +2 |
| b78db9ff |      77 |     39%  |     41%  | +2 |
| 7937c2ca |      67 |     54%  |     54%  |  – |
| **Total**|     530 |     43%  |     44%  | +1 |

Bucket distribution across the 530 pitches: the 0.50 bucket goes from
**0 → 26 pitches** (5%) — the 5-level scale finally exercises every level
on real data.

## What shipped

### packages/shared

- `src/utils/scoreAccuracy.ts` — column-anchored in-zone branch:
  `colDiff === 1` returns `a.row === t.row ? 0.5 : 0.25` (was always 0.25).
  Header comment updated to reference this change doc alongside the prior
  softening.
- `src/utils/__tests__/scoreAccuracy.test.ts`
    - Worked-example case #4 (target `2-2` → actual `2-1`) moves from 0.25
      to 0.5. Sum: 13.75 → 14.00. Grade: 69% → 70%.
    - New `A1 adjacency split` describe block with 3 specific test cases:
      "adjacent col + row matches → 0.5" (4 directions), "adjacent col +
      row off → still 0.25" (3 cases), and "A1 does not affect mid-col or
      waste cases" (3 sanity checks). 151 tests total (was 148).
- No version bump — shared stays at 1.0.0 per the established pattern.

### packages/api

- `src/utils/zoneAccuracy.ts` — mirrors the shared change exactly. Header
  comment includes "A1 2026-05-12."
- `src/utils/__tests__/zoneAccuracy.test.ts` — the existing "adjacent col
  = 0.25" smoke test split into "adjacent col + row matches = 0.5 (A1)"
  and "adjacent col + row off = 0.25."
- `src/migrations/039_invalidate_a1_summaries.sql` —
  `DELETE FROM public.performance_summaries;` Same pattern as 036 / 037.
  Forces lazy regeneration on next view; applies to both `'game'` and
  `'bullpen'` summaries.
- `src/services/performanceSummary.service.ts` — removed the unused
  `SUMMARY_TARGET_ACCURACY_THRESHOLD, isTargetHit` import line.
- `package.json` — version `1.6.0` → `1.6.1` (patch bump for algorithm
  tweak; same precedent as 1.5.0 → 1.5.1 for the Dial 1 softening).

### scripts (kept for future tuning rounds)

- `packages/api/scripts/sweep-accuracy-proposals.ts` — re-runs every
  curated game under baseline + each proposal in one pass. Not part of the
  prod bundle.

## Verification

Pre-commit checks all green:

- `packages/shared`: `npm run build` clean, `tsc --noEmit` clean,
  `jest` 151/151 pass.
- `packages/api`: `tsc --noEmit` clean, full `jest` suite 522/522 pass.
- Prettier: all changed `.ts` files conformant after `npx prettier --write`.
- No web/mobile changes; no parity-check needed.

### Post-deploy

- [ ] Migration 039 runs cleanly on dev DB (and prod):
      `DELETE FROM public.performance_summaries;`.
- [ ] Reopen game `b3224c08-d134-4e2b-a4aa-c95f45495df0` performance
      summary; confirm Command Grade ticks from 40% → 41%.
- [ ] Spot-check 2–3 recent games where the prior grade was 50–70%; the
      new grade should land within +0/+2 points (only adjacent-column-with-
      matching-row pitches change buckets).
- [ ] Spot-check the curated sweep numbers by re-running
      `npx ts-node scripts/sweep-accuracy-proposals.ts` against a fresh
      `dump.sql` — the Baseline column reflects A1 after this ships, so
      the relevant comparison is total grade ≈ 44% across the 6 games.

## Out of scope (deferred)

- **C1 and D1 from the audit** — mid-col-target-row-anchored tweaks fired
  on 0 and 2 pitches respectively in 530. Not enough signal to ship.
- **F1 from the audit** — the GameLogTable "Command" column reads from
  `analytics.service.ts` (strict Euclidean) while the PerformanceSummaryCard
  reads from `performance_summaries` (zone-based). Same label, different
  math. Needs its own plan + change because it spans web + mobile + the
  api game-logs response shape.
- **The 6-level Dial 2 algorithm** — the 5-level scale with A1 now
  exercises every bucket on real data (23% / 9% / 5% / 49% / 14%). No
  need to refine until a different gap shows up.
- **Backfilling historical `performance_summaries` beyond invalidation** —
  they regenerate lazily on next view. Same as 036 / 037.
- **Touching the live `TARGET_ACCURACY_THRESHOLD = 0.22`** — still the
  right number for the per-pitch binary signal.
