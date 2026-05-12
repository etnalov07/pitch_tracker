# Feat: Zone-based command-grade scoring (replaces Euclidean accuracy)

| Date       | Type   | Commit    | Versions                                                           |
| ---------- | ------ | --------- | ------------------------------------------------------------------ |
| 2026-05-11 | feat   | `0c73762` | api 1.3.0 → 1.4.0, web 0.99.0 → 1.0.0, mobile 1.94.0 → 1.95.0      |
| 2026-05-11 | fix    | `6d9e5c4` | api-local copy of scoreAccuracy to unbreak prod runtime            |
| 2026-05-11 | tuning | `26b5bc8` | api 1.4.0 → 1.5.0: same-column = 1.0 (collapse 0.75 / 0.5 buckets) |

## Context

`target_accuracy_percentage` on the Performance Summary used a single
Euclidean threshold: a pitch counted as "accurate" iff
`sqrt(dx² + dy²) ≤ SUMMARY_TARGET_ACCURACY_THRESHOLD` (0.425 in normalized
zone coords, ~7"). The result was binary and symmetric — a pitch that landed
1 zone off scored the same as a pitch that hit the spot dead-on, and a pitch
that missed by a hair scored zero. It didn't reflect pitching reality:
column miss matters more than row miss, and being close to the called zone
deserves partial credit.

Forward-design doc: [docs/plans/2026-05-11-zone-based-accuracy.md](../plans/2026-05-11-zone-based-accuracy.md).

## Decisions

Five-level zone-based grade (1 / 0.75 / 0.5 / 0.25 / 0):

- In-zone in/out targets are **column-anchored**. Same zone = 1; same col 1
  row off = 0.75; same col 2 rows off = 0.50; adjacent col = 0.25; far col = 0. Waste landings on the matching side = 0.75; opposite side = 0.
- Mid-column targets are **row-anchored** (rows matter more than cols when
  the target is dead-center horizontally). Same zone = 1; same row 1 col off
  = 0.75; 1 row off = 0.25; 2 rows off = 0. Waste landings on the matching
  row side = 0.75.
- Waste targets project to their nearest in-zone neighbor before scoring (a
  rare case — coaches don't usually call waste pitches as the "target").
- Aggregate = `round(sumOfScores / qualifyingPitches × 100)`.

**Scope:** post-game pitcher summary + post-bullpen-session summary. Both
flow through `performanceSummary.service.ts` → cached `performance_summaries`
rows. The live in-game "Accuracy" stat keeps the strict
`TARGET_ACCURACY_THRESHOLD = 0.22` (~3.75") — that single-pitch binary
signal is the right shape for "did this one pitch hit the spot?"; zone-based
scoring is for aggregate post-fact grading.

**UI rename:** "Accuracy" → "Command Grade" on the prominent stat box (web +
mobile), "Accuracy" → "Command" on the table column headers (web). API field
name `target_accuracy_percentage` is unchanged — only the rendered label.

20-pitch worked example proving every rule fires, and a comparison to the
old algorithm, live in the [plan doc](../plans/2026-05-11-zone-based-accuracy.md#worked-example--20-pitches).

## What shipped

### packages/shared

- `src/utils/scoreAccuracy.ts` — new helper
  `scoreAccuracy(target: PitchCallZone, actual: PitchCallZone): 0 | 0.25 | 0.5 | 0.75 | 1`.
  Pure function. Branches on whether the target column is in/out
  (column-anchored) or mid (row-anchored). Waste zones live on an extended
  5×5 grid (rows/cols ∈ {-1, 0, 1, 2, 3}) so the same arithmetic handles
  waste landings.
- `src/utils/__tests__/scoreAccuracy.test.ts` — 26 cases including all 20
  from the worked example plus boundary cases (mid-mid target, four-corner
  targets, waste-target projection, exhaustive 17×17 enumeration verifying
  every score is in {0, 0.25, 0.5, 0.75, 1}).
- `src/index.ts` — re-exports `scoreAccuracy`.
- Built with `npm run build`.

### packages/api

- `src/services/performanceSummary.service.ts`
    - Imported `getNearestPitchCallZone`, `scoreAccuracy`, `PitchCallZone`
      from `@pitch-tracker/shared`.
    - `gatherGameStats`: removed the inline SQL Euclidean check from the
      whole-game stats query and from the per-pitch-type breakdown query.
      Added a new query pulling per-pitch `pitch_type`, `target_zone`,
      `target_location_x/y`, `location_x/y`. Calls a new helper
      `aggregateAccuracy()` (also added) that resolves target zone (prefer
      stored `target_zone`, derive from coords otherwise), derives the
      actual zone via `getNearestPitchCallZone`, sums `scoreAccuracy`
      results globally and per pitch type, and returns rounded
      percentages.
    - `gatherBullpenStats`: same swap. Bullpen pitches don't carry
      `target_zone`, so the helper always derives from `target_x/y` and
      `actual_x/y`.
- `src/migrations/036_invalidate_zone_accuracy_summaries.sql` — `DELETE FROM
public.performance_summaries` to force lazy regeneration under the new
  algorithm. Affects both `source_type='game'` and `source_type='bullpen'`
  cached rows. Follows the precedent of `016_invalidate_performance_summaries.sql`.
- `package.json` — `1.3.0` → `1.4.0`.

### packages/web

Stat label rename (4 files):

- `src/components/performanceSummary/PerformanceSummaryCard/PerformanceSummaryCard.tsx` —
  `<StatLabel>Accuracy</StatLabel>` → `<StatLabel>Command Grade</StatLabel>`.
- `src/components/pitcher/GameLogTable/GameLogTable.tsx` — column header
  `Accuracy` → `Command`.
- `src/components/pitcher/GameLogDetail/GameLogDetail.tsx` — pitch-type
  column header same swap.
- `src/components/pitcher/BullpenLogTable/BullpenLogTable.tsx` — same swap.
- `package.json` — `0.99.0` → `1.0.0`.

### packages/mobile

- `src/components/performanceSummary/PerformanceSummaryView.tsx` — stat
  label `Accuracy` → `Command Grade`.
- `package.json` + `app.json` — `1.94.0` → `1.95.0` (kept in sync).

## Verification

1. **Shared tests:** `cd packages/shared && npx jest --no-coverage` — 142
   pass (includes 26 new scoreAccuracy cases).
2. **API tests:** `cd packages/api && npx jest --no-coverage` — 490 pass
   (no regressions; existing accuracy expectations in
   `performanceSummary` integration tests were unaffected because they
   either use exact-spot pitches or pitches with no target).
3. **Mobile tests:** `cd packages/mobile && npx jest --no-coverage` — 5
   pass.
4. **TypeScript:** `npx tsc --noEmit` clean in api, web, mobile.
5. **ESLint web:** `npx eslint src/ --ext .ts,.tsx` clean.
6. **End-to-end (manual):** open a recent game with a charted pitcher,
   regenerate the Performance Summary, confirm the "Command Grade" stat
   reads a reasonable number (35–75% for a decent outing) and the
   per-pitch-type breakdown shows partial-credit-aware percentages. Same
   spot-check on a completed bullpen session.
7. **Migration:** apply `036_invalidate_zone_accuracy_summaries.sql` against
   dev DB. Old cached summaries are deleted; next view of any postgame
   pitcher tab or post-bullpen tab triggers regeneration under the new
   algorithm.

## Out of scope (deferred)

- Rewriting the **live** "Accuracy" stat (per-pitcher running, in-game and
  in-bullpen). Stays on the strict `TARGET_ACCURACY_THRESHOLD = 0.22` — that
  binary signal is the right shape for single-pitch feedback.
- Surfacing partial-credit raw numbers in the per-pitch-type breakdown
  ("9.0 of 22 fastballs hit the spot"). Coaches prefer the rounded
  percentage; the fractional math stays internal.
- Backfilling historical `performance_summaries` rows beyond the
  invalidation. Regeneration is lazy.
- Renaming the `target_accuracy_percentage` column / API field. Pure UI
  label change; API contract unchanged so web/mobile clients keep working.

## Follow-up tuning (2026-05-11)

After the initial ship, coach feedback was that 5-level scoring was still
too strict for in/out targets. Collapsed the rule:

**Before** (5 levels for in/out targets): same zone = 1.0; same col 1 row
off = 0.75; same col 2 rows off = 0.5; adjacent col = 0.25; far col = 0;
waste matching side = 0.75.

**After**: same column (any row, in-zone OR waste matching side) = 1.0;
adjacent col = 0.25; far col or wrong-side waste = 0. Effectively 3 levels
for in/out targets (1.0 / 0.25 / 0), with mid-col targets unchanged
(still 1.0 / 0.75 / 0.25 / 0).

Rationale: a pitch called for the outside corner that ends up middle-out
or high-out is still on the called side. Coaches consider that good
command. The earlier scheme penalized height variation within the same
column, which doesn't match how pitching is graded in practice.

20-pitch worked-example total moved from 56% to **65%** under the new
scheme. Files touched:

- `packages/shared/src/utils/scoreAccuracy.ts` — collapsed
  column-anchored branch.
- `packages/shared/src/utils/__tests__/scoreAccuracy.test.ts` — 4
  worked-example cases bumped from 0.75 → 1.0, 1 case bumped 0.5 → 1.0, 2
  waste-matching cases bumped 0.75 → 1.0, sum/total updated.
- `packages/api/src/utils/zoneAccuracy.ts` — same collapse (mirror of
  shared).
- `packages/api/src/utils/__tests__/zoneAccuracy.test.ts` — smoke-test
  expectations updated.
- `packages/api/package.json` — `1.4.0` → `1.5.0`.
- `docs/plans/2026-05-11-zone-based-accuracy.md` — scoring matrix +
  worked example table updated.

No DB migration needed — the previous invalidation (`036`) already forces
regeneration; any newly-cached summary picks up the new algorithm.
