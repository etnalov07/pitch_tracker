# Zone-Based Pitch Accuracy Scoring

| Field      | Value                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- |
| Date       | 2026-05-11                                                                              |
| Status     | Approved                                                                                |
| Owner      | brian.volante@bvolante.com                                                              |
| Supersedes | Current Euclidean threshold (`SUMMARY_TARGET_ACCURACY_THRESHOLD` in `pitchLocation.ts`) |

## Context

The `target_accuracy_percentage` on the Performance Summary uses a single
Euclidean threshold: a pitch counts as "accurate" iff
`sqrt(dx² + dy²) ≤ 0.425` in normalized zone coordinates (~7" tolerance).
This is binary and symmetric, which doesn't reflect how pitchers and coaches
actually evaluate command:

1. **Column matters more than row.** Leaving a ball over the middle is a
   meaningful command error; missing slightly high or low on the corner you
   wanted is execution noise. The current scheme treats both the same.
2. **No partial credit.** A pitch that lands one zone away (target low-away,
   landed mid-away) currently scores either 1.0 (if inside the threshold) or
   0.0 (if outside). There's no "right idea, wrong spot" middle ground.
3. **The threshold is a brittle magic number.** It's already been tuned once
   (`SUMMARY_TARGET_ACCURACY_THRESHOLD` is 2.5× the live threshold) and isn't
   coach-intuitive.

Zone-based scoring fixes all three: it's coach-readable, asymmetric, and
gives partial credit.

## Confirmed Decisions (2026-05-11)

Zones are the existing `PitchCallZone` set (9 in-zone + 8 waste).
`{row}-{col}` where **row** 0=high / 1=mid / 2=low, **col** 0=in / 1=mid / 2=out.

### Scoring matrix

For in-zone targets (col is `in` or `out`) — **column-anchored, row doesn't matter**:

| Condition                                                  | Score |
| ---------------------------------------------------------- | ----- |
| Same column (any row, in-zone)                             | 1.00  |
| Waste landing on the matching side (col-direction matches) | 1.00  |
| Adjacent column (1 col off, any row)                       | 0.25  |
| Far column (2 cols off, any row)                           | 0.00  |
| Waste landing on the opposite or no-col side               | 0.00  |

Updated 2026-05-11: collapsed all same-column landings (and waste on the matching column side) to 1.00. The earlier 5-level scheme (1.0 / 0.75 / 0.5 / 0.25 / 0) was too strict for in/out targets — coaches care that the pitch was on the called side; height variation within the same column is acceptable command.

For in-zone targets where col is `mid` (reverse-anchor on row):

| Condition                          | Score |
| ---------------------------------- | ----- |
| `actual` zone equals `target` zone | 1.00  |
| Same row, col off by 1             | 0.75  |
| 1 row off (any col)                | 0.25  |
| 2 rows off                         | 0.00  |
| Waste landing on matching row side | 0.75  |
| Waste landing on opposite row side | 0.00  |

Note: mid-col targets never have a "2 cols off" case because mid → in or out is only 1 column step.

### Waste-target case (rare, but defined for completeness)

When the called target itself is a waste zone (e.g., intentional ball, very
rare): treat the same as the nearest in-zone equivalent for scoring purposes.
Implementation note: project the waste target's nearest in-zone neighbor via
the same row/col indices.

### Denominator rule (unchanged)

A pitch contributes to accuracy only if **both** `target_zone` and an
`actualZone` (derived from `location_x/y`) are present. Pitches with no
target are excluded from numerator and denominator. Pitches with no charted
location are excluded.

## Worked example — 20 pitches

Coordinates in the **Tgt** / **Act** columns are zone centers in normalized
(x, y) units; included only to show what the old Euclidean threshold would
have scored each pitch. Target column shows zone in `row-col` notation.

| #   | Target (zone)  | Actual (zone)  | Score | Why                                 | Old (≤0.425)? |
| --- | -------------- | -------------- | ----- | ----------------------------------- | ------------- |
| #   | Target (zone)  | Actual (zone)  | Score | Why                                 | Old (≤0.425)? |
| --- | -------------- | -------------- | ----- | ----------------------------------- | ------------- |
| 1   | 2-2 (low-out)  | 2-2            | 1.00  | Same col (in-zone)                  | ✓             |
| 2   | 2-2 (low-out)  | 1-2 (mid-out)  | 1.00  | Same col (in-zone)                  | ✓             |
| 3   | 2-2 (low-out)  | 0-2 (high-out) | 1.00  | Same col (in-zone)                  | ✗             |
| 4   | 2-2 (low-out)  | 2-1 (low-mid)  | 0.25  | Adjacent col                        | ✓             |
| 5   | 2-2 (low-out)  | 1-1 (mid-mid)  | 0.25  | Adjacent col                        | ✗             |
| 6   | 2-2 (low-out)  | W-low-out      | 1.00  | Waste matching side (out)           | ✗             |
| 7   | 2-2 (low-out)  | W-low-in       | 0.00  | Waste opposite side                 | ✗             |
| 8   | 0-0 (high-in)  | 0-0            | 1.00  | Same col (in-zone)                  | ✓             |
| 9   | 0-0 (high-in)  | 1-0 (mid-in)   | 1.00  | Same col (in-zone)                  | ✓             |
| 10  | 0-0 (high-in)  | W-in           | 1.00  | Waste matching side (in)            | ✗             |
| 11  | 0-0 (high-in)  | W-high-out     | 0.00  | Waste opposite side                 | ✗             |
| 12  | 1-2 (mid-out)  | 1-2            | 1.00  | Same col (in-zone)                  | ✓             |
| 13  | 1-2 (mid-out)  | 0-2 (high-out) | 1.00  | Same col (in-zone)                  | ✓             |
| 14  | 1-2 (mid-out)  | 1-0 (mid-in)   | 0.00  | 2 cols off                          | ✗             |
| 15  | 0-1 (high-mid) | 0-1            | 1.00  | Spot on (mid-col target)            | ✓             |
| 16  | 0-1 (high-mid) | 0-0 (high-in)  | 0.75  | Mid-col target: same row, 1 col off | ✓             |
| 17  | 0-1 (high-mid) | 0-2 (high-out) | 0.75  | Mid-col target: same row, 1 col off | ✓             |
| 18  | 0-1 (high-mid) | 1-1 (mid-mid)  | 0.25  | Mid-col target: 1 row off           | ✓             |
| 19  | 0-1 (high-mid) | W-high         | 0.75  | Mid-col + waste matching row side   | ✓             |
| 20  | 0-1 (high-mid) | W-low          | 0.00  | Mid-col + waste opposite row        | ✗             |

**Sum: 13.00 / 20**

| Algorithm                                  | Accuracy% |
| ------------------------------------------ | --------- |
| **Proposed zone-based (current)**          | **65%**   |
| Current Euclidean threshold (count ≤ .425) | 55%       |

Under the current rule:

- **10 pitches** earn 1.00 (same column as an in/out target, in-zone or
  matching-side waste; or a mid-col target spot-on).
- **3 pitches** earn 0.75 (mid-col target: same row with col off, or waste
  on matching row side).
- **3 pitches** earn 0.25 (adjacent col for an in/out target, or 1 row off
  for a mid-col target).
- **4 pitches** earn 0 (2 cols off, or waste on the opposite side).

The 65% reflects a pitcher who hit the called column most of the time but
sometimes leaked one column over. Versus the old Euclidean number (55%):
the new scheme rewards "right side, wrong height" appropriately while
still penalizing "wrong side entirely" — the old algorithm couldn't
distinguish them at all.

## Implementation plan

### packages/shared

1. **New helper** `scoreAccuracy(target: PitchCallZone, actual: PitchCallZone): 0 | 0.25 | 0.5 | 0.75 | 1`
    - Parses `{row}-{col}` for in-zone, special-cases the 8 waste zones.
    - Branches on target type:
        - In-zone, col ∈ {in, out}: column-anchored (table above).
        - In-zone, col = mid: row-anchored (table above).
        - Waste target: project to nearest in-zone neighbor first, then apply
          the same rule.
    - Pure function. No I/O. Fully unit-testable.
2. **Unit tests** at `packages/shared/src/utils/__tests__/scoreAccuracy.test.ts`
   — at minimum the 20 cases from the worked example, plus boundary cases:
    - Two waste zones (target waste vs actual waste): apply the same logic.
    - All four corners as targets.
    - Mid-mid target (1-1) as a special boundary case.

### packages/api

1. **`packages/api/src/services/performanceSummary.service.ts`** — postgame
   pitcher summary path
    - Replace the SQL distance check at line 387–391 with a row-set query that
      pulls `target_zone, location_x, location_y` for each pitch and computes
      the sum in JS using `scoreAccuracy(target_zone, getNearestPitchCallZone(x, y))`.
    - Replace the per-pitch-type aggregation at line 430 the same way.
    - `target_accuracy_percentage` formula becomes
      `Math.round((sumOfScores / qualifyingPitches) * 100)`.
    - Where `qualifyingPitches` = pitches with both `target_zone` (or
      `target_location_x/y` we can derive) AND `location_x/y`.
2. **`gatherBullpenStats` in the same file** (around line 438) — post-bullpen
   summary path
    - Same swap. `bullpen_pitches` carry `target_x`, `target_y`, `actual_x`,
      `actual_y` (or equivalents). For each pitch, derive both zones via
      `getNearestPitchCallZone` and call `scoreAccuracy`. Update lines
      499 and 518 (whole-session and per-pitch-type accuracy).
3. **`packages/api/src/services/bullpen.service.ts:322`** — if this surfaces
   the bullpen accuracy outside the performance-summary flow (live bullpen
   stats during a session vs. the post-session summary), confirm it's the
   summary path and update the same way. If it's a live in-progress
   per-pitch readout, leave it alone — see "Out of scope" below.
4. **Migration `038_invalidate_zone_accuracy_summaries.sql`** — invalidate
   cached `performance_summaries` rows (both `source_type='game'` and
   `source_type='bullpen'`) so they regenerate under the new algorithm on
   next view. Precedent: `016_invalidate_performance_summaries.sql`. Set
   `target_accuracy_percentage = NULL` and bump `updated_at`. Narratives
   regenerate lazily.

### packages/web

Per Q2 resolution: rename the stat label from **"Accuracy"** to **"Command Grade"**
on the stat box, and "Accuracy" → **"Command"** on table column headers.
No data-shape changes — the API field stays `target_accuracy_percentage`,
only the label rendered to the user changes.

Files to update:

- `packages/web/src/components/performanceSummary/PerformanceSummaryCard/PerformanceSummaryCard.tsx:293`
  — `<StatLabel>Accuracy</StatLabel>` → `<StatLabel>Command Grade</StatLabel>`
- `packages/web/src/components/pitcher/GameLogTable/GameLogTable.tsx:44`
  — `<Th align="center">Accuracy</Th>` → `<Th align="center">Command</Th>`
- `packages/web/src/components/pitcher/GameLogDetail/GameLogDetail.tsx:106`
  — `<BTh align="center">Accuracy</BTh>` → `<BTh align="center">Command</BTh>`
- `packages/web/src/components/pitcher/BullpenLogTable/BullpenLogTable.tsx:32`
  — `<Th align="center">Accuracy</Th>` → `<Th align="center">Command</Th>`

### packages/mobile

- `packages/mobile/src/components/performanceSummary/PerformanceSummaryView.tsx:75`
  — `<Text … >Accuracy</Text>` → `<Text … >Command Grade</Text>`

### Versions

- `packages/api` minor bump (`1.3.0` → `1.4.0`) — formula change is
  user-visible.
- `packages/shared` minor bump because of the new exported helper.
- `packages/web` minor bump — label rename is user-visible.
- `packages/mobile` + `app.json` minor bump (in lockstep) — label rename
  is user-visible.

## Scope decision (2026-05-11)

**In scope:** postgame pitcher summary + post-bullpen-session summary. Both
flow through `performanceSummary.service.ts` and produce a cached
`performance_summaries` row that the user reads after the fact.

**Out of scope:** the live "Accuracy" stat shown during a game or an
in-progress bullpen session. The live UI keeps `TARGET_ACCURACY_THRESHOLD =
0.22` (~3.75") — that stricter binary number is the right signal for "did
this single pitch hit its spot?" while charting. Zone-based partial credit
is for aggregate review.

## Display decisions (2026-05-11)

1. **Per-pitch-type breakdown — display.** Resolved: show just the
   percentage. No raw partial-credit numbers ("9.0 of 22 fastballs hit the
   spot" reads weird). The fractional math stays internal.
2. **Label rename.** Resolved: rename "Accuracy" → **"Command Grade"** on
   the prominent stat box, and "Accuracy" → **"Command"** on table column
   headers. API field name (`target_accuracy_percentage`) is unchanged —
   only UI labels move. See file list under `packages/web` + `packages/mobile`
   above.

## Out of scope

- Backfilling historical `performance_summaries` rows beyond invalidating
  the cached number. They regenerate on next view.
- Rewriting the **live** "Accuracy" stat (the per-pitcher running number
  surfaced while a game or bullpen is in progress).
- Migrating `TARGET_ACCURACY_THRESHOLD` itself. The live UI's strict
  threshold still serves the "did this pitch hit its spot?" visual signal.
- UI changes to the Performance Summary card (none needed — same fields,
  same display).

## Verification checklist

When implementing:

- [ ] `scoreAccuracy` unit tests pass for all 20 cases in the worked example
      above plus the boundary cases.
- [ ] Existing `performanceSummary.service.test.ts` cases still pass after
      formula change (may need to update expected percentages).
- [ ] Migration `038_invalidate_zone_accuracy_summaries.sql` runs cleanly
      against the dev DB.
- [ ] Regenerate the Performance Summary on a real recent game and confirm
      the Accuracy% is in a reasonable range (35–75% for a good outing).
- [ ] No web/mobile changes needed; spot-check the stat still renders.
