# Fix: Team-offense narrative inflated walk/strikeout counts

| Date       | Type | Commit | Versions          |
| ---------- | ---- | ------ | ----------------- |
| 2026-05-10 | fix  | _TBD_  | api 1.1.0 → 1.2.0 |

## Context

The "How they attacked us" team-offense narrative on the Performance Summary tab
was reporting wildly inflated walk and strikeout totals. Reproduced on game
`b3224c08-d134-4e2b-a4aa-c95f45495df0`: the AI summary referenced 36 walks when
the real count was ~9. Reading user reported the discrepancy; the per-hitter
accordion in the same view showed the correct walk count, which narrowed the
bug to the team rollup that feeds the LLM prompt.

## Decisions

The bug is in `bucketOutcomeForPitch`
(`packages/api/src/services/performanceSummary.service.ts:1967`). It is called
**once per pitch** but its return values include `'walk'` and `'strikeout'`,
which are at-bat outcomes. The walk branch returned `'walk'` for every pitch
where `pitch_result === 'ball'` AND `at_bat_result === 'walk'` — i.e. for **all
four balls** of a walked at-bat, not just the deciding 4th ball. Same shape for
strikeouts (every called/swinging strike in a K).

`hit`, `weak_contact_out`, and HBP were unaffected because each of those at-bats
has exactly one matching pitch (`in_play` or `hit_by_pitch`). The per-hitter
`outcomes` block was unaffected because it dedupes via `ab_outcome_counted:
Set<at_bat_id>` at lines 1491–1506.

**Chosen fix:** tighten the predicate using fields already on the row.
`pitches.balls_before` and `pitches.strikes_before` are selected by the
team-offense query (lines 1380-1381) and already used a few lines above for
`bucketSituation`, so no schema change, no new query, no new join.

- Walk now requires `pitch_result === 'ball' && balls_before === 3` (the 4th
  ball).
- Strikeout now requires `(pitch_result === 'swinging_strike' ||
'called_strike') && strikes_before === 2` (strike three).

**Tradeoff accepted:** the team-zone outcome heatmap on `OpponentAttackSummary`
will attribute each walk/K to the deciding pitch's type and zone instead of
smearing across all contributing pitches. This is the intended behavior — the
put-away pitch is what coaches care about — but the heatmap will look different
than it did before this fix. Cached narratives in `performance_summaries` are
not backfilled; they update on the next regeneration.

## What shipped

**API**

- `packages/api/src/services/performanceSummary.service.ts` —
  `bucketOutcomeForPitch` row type widened to include `balls_before` and
  `strikes_before`; walk and strikeout predicates tightened to fire only on the
  deciding pitch. Hit, HBP, and BIP branches unchanged.
- `packages/api/package.json` — version bump `1.1.0` → `1.2.0`.

No shared types changed. No web/mobile changes. No migration.

## Verification

1. `cd packages/api && npx tsc --noEmit` — clean.
2. Re-trigger the team-offense narrative on game
   `b3224c08-d134-4e2b-a4aa-c95f45495df0`: clear the cached
   `performance_summaries` row (`source_type='team_offense' AND source_id=<gameId>`)
   and reload the Summary tab, OR hit the Regenerate Narrative button on
   `OpponentAttackSummary`. Confirm the new narrative's walk and strikeout
   counts agree with the per-hitter accordion totals on the same page.
3. Spot-check one more completed game's narrative against its accordion totals.

## Out of scope (deferred)

- Backfilling historical `performance_summaries.narrative` rows. They update on
  next regeneration; no need to mass-invalidate.
- Refactoring the rest of the team aggregation in `getOpponentAttackSummary`.
- Re-styling the team-zone outcome heatmap to acknowledge the new
  put-away-pitch semantics.
