# Command / pitch accuracy audit — 2026-05-12

| Status                 | Date       | Code shipped                                                                            |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------- |
| A1 + F2 shipped        | 2026-05-12 | See [docs/changes/2026-05-12-command-grade-a1.md](../changes/2026-05-12-command-grade-a1.md). F1 still open. |

## Context

Command Grade got two algorithm changes in two days (zone-based scoring
2026-05-11, row-floor softening 2026-05-12). This doc steps back and audits
**everything accuracy-flavored** across the codebase, identifies the tuning
levers, and validates each one against six curated games from the prod dump.
No code ships from this audit directly — implementation is gated on the user
picking which findings to land.

## TL;DR

1. **Two label-vs-math mismatches need fixing before any more tuning.**
   - `GameLogTable` (web) and `GameLogDetail` show a column called **"Command"**
     populated by `target_accuracy_percentage` from
     `analytics.service.ts` — which still uses the strict Euclidean
     `TARGET_ACCURACY_THRESHOLD = 0.22` (~3.75"). The same pitcher's
     postgame `PerformanceSummaryCard` shows **"Command Grade"** computed by
     the zone-based 5-level algorithm. Same column name, different math.
   - `SUMMARY_TARGET_ACCURACY_THRESHOLD` is imported by
     `performanceSummary.service.ts:1` but **never used** in the file. Dead
     import left over from the pre-zone-based summary path. The constant is
     still re-exported from `@pitch-tracker/shared` and tested in
     `pitchLocation.test.ts`. Safe to delete or keep documented as
     deprecated — but the unused import in `performanceSummary.service.ts`
     should at minimum go.

2. **Of the four scoring proposals tested, only A1 earns its complexity.**
   - A1 (col-anchored, adjacent col + row matches → 0.5) moves 26 of 530
     curated pitches into a meaningful new bucket. Modest grade shift (+1 to
     +2 per game) but materially fixes a fairness gap: today a pitch missing
     by one column with the right height scores the same (0.25) as one
     missing both axes.
   - C1 (mid-col, 2 cols off + row matches → 0.5) and D1 (mid-col, 1 row off
     + same col → 0.5) **fire 0 and 2 times respectively** across 530 pitches.
     The sub-cases they target are theoretically reasonable but operationally
     rare in real game data.
   - Recommendation: ship A1 + the dead-code cleanup. Skip C1 and D1.

3. **Call analytics is a separate metric and should stay that way.** The
   `pitchCallAnalytics.service.ts` strict-equality zone match is the right
   answer for "did the pitcher throw what the catcher called" — that's a
   yes/no question, not a fuzzy execution score.

## Three places "accuracy" is computed today

| Path                                | File(s)                                                      | What it answers                                              | Used by                                                      |
| ----------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Live / per-pitch Euclidean          | `packages/shared/src/utils/pitchLocation.ts` (0.22)          | "Did this pitch land within ~3.75" of the target?" (binary)  | live charting UI, bullpen live UI, `analytics.service.ts` queries (pitcher dashboard) |
| Zone-based 5-level partial credit   | `packages/shared/src/utils/scoreAccuracy.ts` + api mirror    | "How close did this pitch land to the called zone?" (0–1)    | `performanceSummary.service.ts` → `performance_summaries` cache → `PerformanceSummaryCard` |
| Call-vs-execution exact match       | `packages/api/src/services/pitchCallAnalytics.service.ts`    | "Did the pitcher throw the type + zone the catcher called?" | `/bt-api/pitch-call-analytics/...` endpoints, mobile + web call-analytics screens |

## Findings

### F1. GameLogTable "Command" column uses the wrong math

`analytics.service.ts` line 412–428 (and again 449–470, 567–586) computes
`target_accuracy_percentage` from raw SQL using
`SQRT(POWER(dx,2) + POWER(dy,2)) <= TARGET_ACCURACY_THRESHOLD` (0.22).
The result lands on `PitcherGameLog.target_accuracy_percentage`, which the
web `GameLogTable.tsx:62` renders under a column header **"Command"** (line
44). `GameLogDetail` and the corresponding mobile screens use the same field.

Meanwhile `performanceSummary.service.ts` computes a same-named field via
`scoreAccuracy` and stores it on `performance_summaries`. The
`PerformanceSummaryCard.tsx` calls this **"Command Grade"**.

A pitcher viewing his profile sees, say, `35%` "Command" for a game in the
game log. Clicking through to the performance summary card for the same game
shows `40%` "Command Grade." Both labels are right under different
definitions, but the surface area says the same word and the user can't tell.

**Recommendation:** Decide which definition wins for the column called
"Command" / "Command Grade." Options:
- **F1a (recommended):** Switch the GameLogTable column to read from
  `performance_summaries` (zone-based) when a summary exists; fall back to
  the strict number when it doesn't. Pre-warm the cache on game completion
  so the cold path is rare. Renames the Euclidean stat to **"Target Hit %"**
  (or similar) anywhere it still appears.
- **F1b:** Keep two stats with two names. Rename the GameLogTable column to
  "Target Hit %" (the strict definition is the one that survives there) and
  promote the per-game "Command Grade" only as a summary-card stat.
- **F1c:** Backfill the GameLogTable column with on-demand zone-based scoring
  in `analytics.service.ts`. Duplicates work and forces both paths through
  the same dump-from-DB-and-score pipeline.

### F2. Dead `SUMMARY_TARGET_ACCURACY_THRESHOLD` import

`packages/api/src/services/performanceSummary.service.ts:1` imports
`SUMMARY_TARGET_ACCURACY_THRESHOLD` and `isTargetHit` from
`../utils/pitchLocation`. Neither name appears anywhere else in the file
(grepped). Both are leftover from the pre-zone-based summary path.

`SUMMARY_TARGET_ACCURACY_THRESHOLD` is still re-exported from
`@pitch-tracker/shared/src/index.ts:10` and exercised by
`pitchLocation.test.ts` (4 cases). Web/mobile do not import it.

**Recommendation:** Drop the unused import line and the `isTargetHit` import
on the same line. The exported constant + tests can stay (cheap, fully
documented in `pitchLocation.ts` header) or get the deprecation comment that
matches reality.

### F3. Per-game scoring sweep results

`scripts/sweep-accuracy-proposals.ts` (new) re-scores six curated games
("our pitcher" filter) under baseline and four proposals from the plan:

| Game     | Pitches | Baseline | A1     | C1   | D1   | A1+C1+D1 |
| -------- | ------: | -------: | -----: | ---: | ---: | -------: |
| c646824a |     130 |     40%  | 41%    | 40%  | 40%  | 41%      |
| 9bd6d5e9 |     123 |     50%  | 51%    | 50%  | 50%  | 51%      |
| b3224c08 |      66 |     40%  | 41%    | 40%  | 40%  | 41%      |
| e2b3d7d4 |      67 |     35%  | 37%    | 35%  | 35%  | 37%      |
| b78db9ff |      77 |     39%  | 41%    | 39%  | 39%  | 41%      |
| 7937c2ca |      67 |     54%  | 54%    | 54%  | 54%  | 54%      |
| **Total** | **530** | **43%** | **44%** | **43%** | **43%** | **44%** |

Score-bucket distribution across the 530 curated pitches:

| Bucket | Baseline    | A1          | C1          | D1          | A1+C1+D1    |
| -----: | ----------: | ----------: | ----------: | ----------: | ----------: |
|   1.00 | 121 (23%)   | 121 (23%)   | 121 (23%)   | 121 (23%)   | 121 (23%)   |
|   0.75 |  48 (9%)    |  48 (9%)    |  48 (9%)    |  48 (9%)    |  48 (9%)    |
|   0.50 |   0 (0%)    |  26 (5%)    |   0 (0%)    |   2 (0%)    |  28 (5%)    |
|   0.25 | 287 (54%)   | 261 (49%)   | 287 (54%)   | 285 (54%)   | 259 (49%)   |
|   0.00 |  74 (14%)   |  74 (14%)   |  74 (14%)   |  74 (14%)   |  74 (14%)   |

**Observations:**

- The shipped 5-level algorithm produces an effectively 4-level distribution
  on real data — the 0.50 bucket is empty unless a mid-col target lands on a
  same-row neighbor (rare; 0 cases here). A1 is the first proposal that
  populates the bucket meaningfully.
- A1 moves 26 pitches from 0.25 → 0.50. These are all "adjacent column,
  matching row" cases — visually, the same row of the strike zone, one
  column over. The eye test reads these as "one bucket off horizontally
  with perfect height" and 0.5 is a reasonable score.
- The 0 bucket (74 catastrophic misses: wrong col AND wrong row) is
  unchanged by every proposal — the 2026-05-12 softening already addressed
  the "right height, wrong side" floor.
- The b3224c08 baseline confirms the 2026-05-12 fix held (40% — matches the
  doc). Under A1 it nudges to 41%.

### F4. Target-zone distribution

Across the curated 6 games (our pitcher), the target distribution is
overwhelmingly corner-anchored:

| Target     | Count | Branch         |
| ---------- | ----: | -------------- |
| 2-2        |   364 | col-anchored   |
| 1-2        |   229 | col-anchored   |
| 2-1        |   128 | mid-col        |
| 1-1        |    81 | mid-col        |
| (no zone)  |    67 | re-projected   |
| 1-0        |    66 | col-anchored   |
| W-out      |    57 | col-anchored   |
| 2-0        |    55 | col-anchored   |
| W-in       |    26 | col-anchored   |
| others     |    19 | mixed          |

~80% of charted targets hit the col-anchored branch. **This is why C1 and D1
don't earn their complexity** — mid-col targets are real (~19%) but the
specific sub-cases C1 and D1 fire on (2-col-off-same-row, 1-row-off-same-col
on a mid-col target) are operationally rare.

### F5. Call analytics — leave alone

`pitchCallAnalytics.service.ts:72` does strict `calledZone === actualZone`.
This is the right call: the metric answers "did the pitcher do what the
catcher asked, yes or no?" Partial credit would muddle a fundamentally
binary question.

The lever to revisit there isn't accuracy math — it's the `abbrevToFull`
map (lines 46–53, repeated three times). That's a separate cleanup, not
part of this audit.

## Recommendations

Ranked by impact, smallest changes first:

1. **Land A1** (`scoreAccuracy.ts` + api mirror + tests + cache invalidation
   migration 038). Same surgical pattern as the 2026-05-12 softening; ~5 new
   tests; api patch bump `1.5.1 → 1.5.2`. Expected grade movements: +1 to
   +2 points per game on most outings, no change on the worst (all-zero
   pitches stay zero).

2. **Drop the dead import** in `performanceSummary.service.ts:1`. Trivial
   cleanup; no version bump needed; can ride along on the A1 commit or its
   own chore commit.

3. **Decide F1 (label-vs-math mismatch).** This is the highest-impact
   finding — it's the only one a user will notice in practice. Plan and
   document the fix separately (it touches web + mobile + the api game-logs
   shape); don't bundle with the A1 algorithm tweak.

4. **Skip C1 and D1.** Data doesn't support the complexity. Revisit only if
   real-game grades show a recurring "mid-col target with same-row miss"
   complaint.

5. **Skip the Dial 2 6-level proposal** (`docs/plans/2026-05-12-command-grade-six-level.md`).
   The 5-level system has an essentially empty 0.50 bucket today; refining
   into 6 levels solves a problem that the data isn't presenting. The 5
   levels with A1 active produce a sensible spread (23% / 9% / 5% / 49% /
   14%) with the buckets actually exercised.

## Files touched by this audit (read-only)

- `packages/shared/src/utils/scoreAccuracy.ts`
- `packages/api/src/utils/zoneAccuracy.ts`
- `packages/shared/src/utils/pitchLocation.ts`
- `packages/api/src/services/performanceSummary.service.ts`
- `packages/api/src/services/analytics.service.ts`
- `packages/api/src/services/pitchCallAnalytics.service.ts`
- `packages/web/src/components/pitcher/GameLogTable/GameLogTable.tsx`
- `packages/api/scripts/analyze-game-accuracy.ts` (existing tool)
- `packages/api/scripts/sweep-accuracy-proposals.ts` (new — added for this audit)

## Out of scope

- Implementation of any recommendation. Each lands as its own change with
  its own doc.
- Changes to the live `TARGET_ACCURACY_THRESHOLD = 0.22`. Still appropriate
  for the binary per-pitch "did this hit the target circle visually" signal.
- Web/mobile UI restructuring of the F1 mismatch — needs its own plan once
  the user picks F1a / F1b / F1c.
