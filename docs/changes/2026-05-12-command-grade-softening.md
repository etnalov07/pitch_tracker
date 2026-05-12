# Fix: Command Grade softening — row floor on column-anchored targets

| Date       | Type | Commit    | Versions          |
| ---------- | ---- | --------- | ----------------- |
| 2026-05-12 | fix  | `f821d7e` | api 1.5.0 → 1.5.1 |

## Context

The zone-based command-grade scoring shipped 2026-05-11 ([change doc](2026-05-11-zone-based-accuracy.md))
was too strict on the **column-anchored** branch. Reviewing game
`b3224c08-d134-4e2b-a4aa-c95f45495df0` (66 pitches, "our pitcher"):

- 53/66 pitches targeted **2-2** (low-out). The pitcher consistently leaked
  to col 0 (inside) — recognizably the same intent, executed on the wrong
  corner. Grade came in at **28%**.
- 31 of the 43 zeroes were cases where the **row matched** (right height,
  wrong side). The strike-zone plot at
  `docs/reports/2026-05-11-game-b3224c08-strike-zone-plot.html` made this
  visually obvious: a tight cluster of low-and-inside misses that all
  scored 0.

A 0.00 floor on "wrong side but right height" wasn't reflecting command
intent. 28% is harsher than MLB-starter command grades typically run, even
on a poor outing.

Forward-design doc: [docs/plans/2026-05-12-command-grade-softening.md](../plans/2026-05-12-command-grade-softening.md).
Considered (and not adopted): the [6-level Dial 2 proposal](../plans/2026-05-12-command-grade-six-level.md)
— more granular but a bigger rewrite; Dial 1 is the surgical fix.

## Decisions

Two new partial-credit conditions added to the column-anchored branch.
Mid-col branch unchanged.

### New scoring matrix (column-anchored targets only)

| Condition                                                  | Old  | New      |
| ---------------------------------------------------------- | ---- | -------- |
| Same column (in-zone, any row)                             | 1.00 | 1.00     |
| Matching col-side waste                                    | 1.00 | 1.00     |
| Adjacent column (1 col off, any row)                       | 0.25 | 0.25     |
| **2 cols off in-zone, row matches target row**             | 0.00 | **0.25** |
| 2 cols off in-zone, row off                                | 0.00 | 0.00     |
| **Wrong-col-side / perpendicular waste, row-side matches** | 0.00 | **0.25** |
| Wrong-col-side / perpendicular waste, row-side off         | 0.00 | 0.00     |

Row-side match for waste:

- Target row 0 (high) ↔ waste row -1
- Target row 1 (mid) ↔ waste row 1
- Target row 2 (low) ↔ waste row 3

### Re-scored game b3224c08

| Score | Before | After | Delta |
| ----: | -----: | ----: | ----: |
|  1.00 |     15 |    15 |     — |
|  0.75 |      3 |     3 |     — |
|  0.25 |      5 |    36 |   +31 |
|  0.00 |     43 |    12 |   −31 |

| Algorithm | Sum   | Grade   |
| --------- | ----- | ------- |
| Before    | 18.50 | **28%** |
| After     | 26.25 | **40%** |

The 12 pitches still at 0.00 are catastrophic misses (wrong column AND wrong
row) — they pass the eye test as "genuinely bad."

## What shipped

### packages/shared

- `src/utils/scoreAccuracy.ts` — column-anchored branch (`t.col === 0 || t.col === 2`)
  gained two new conditions:
    - In-zone: `if (a.row === t.row) return 0.25;` (after the `colDiff` checks)
    - Waste: `if (a.row === matchingWasteRow) return 0.25;` (after the
      matching-col-side check)
      Header comment updated to reference both plan docs.
- `src/utils/__tests__/scoreAccuracy.test.ts`
    - 3 cases in the 20-pitch worked example moved from 0 to 0.25 (target 2-2 →
      W-low-in, target 0-0 → W-high-out, target 1-2 → 1-0). Total sum: 13.0
      → 13.75. Grade: 65% → 69%.
    - 2 cases in the "additional coverage" block moved from 0 to 0.25 (target
      2-0 → W-low-out, target W-low-out → W-low-in).
    - New `Dial 1 row-floor` describe block with 5 new tests covering:
      "2 cols off but row matches", "2 cols off with row off (still 0)",
      "wrong-col-side waste with matching row", "perpendicular waste W-high /
      W-low with matching row", and "matching col-side waste still 1.0
      regardless of row." 31 tests total in the suite.

### packages/api

- `src/utils/zoneAccuracy.ts` — same two conditions mirrored. Header comment
  was already documenting the api-local-copy pattern; no change there.
- `src/utils/__tests__/zoneAccuracy.test.ts` — equivalent test updates:
  split "matching side = 1, opposite = 0" into two specific tests, added
  "Dial 1" cases for 2-cols-off-row-matches and wrong-side waste row-match.
- `src/migrations/037_invalidate_command_grade_summaries.sql` —
  `DELETE FROM public.performance_summaries;`. Same pattern as 036; forces
  lazy regeneration under the new algorithm on next view of every
  `source_type IN ('game', 'bullpen')` summary.
- `package.json` — version `1.5.0` → `1.5.1` (patch bump, algorithm tweak).

### Verification

Pre-commit checks all green:

- `packages/shared`: `npm run build` clean, `tsc --noEmit` clean,
  `jest` 148/148 pass.
- `packages/api`: `tsc --noEmit` clean, full `jest` suite 502/502 pass.
- Prettier: all 4 changed files already conformant.
- No web/mobile changes; no parity-check needed.

## Verification (post-deploy)

- [ ] Migration 037 runs cleanly on dev DB (and prod): `DELETE FROM public.performance_summaries;`
- [ ] Reopen game `b3224c08-d134-4e2b-a4aa-c95f45495df0` performance summary;
      confirm Command Grade rises from 28% → ~40%.
- [ ] Sanity-check 2–3 recent games where the prior grade was 50–70%; the
      new grade should land within ~5 points (only "row matched, sideways
      miss" pitches change buckets).

## Out of scope (deferred)

- The 6-level Dial 2 algorithm (more granular grid distance). See
  [the proposal](../plans/2026-05-12-command-grade-six-level.md) — kept as
  a record but not adopted; can revisit if the 5-level scale starts feeling
  too coarse in real game review.
- A fractional `0.1` score for "barely partial credit." If 0.25 feels too
  generous after more games, that's the next conversation.
- Touching the live `TARGET_ACCURACY_THRESHOLD` (per-pitch binary stat) —
  still strict, still right for the live signal.
- Backfilling historical `performance_summaries` rows beyond the migration
  invalidation. They regenerate lazily on next view.
