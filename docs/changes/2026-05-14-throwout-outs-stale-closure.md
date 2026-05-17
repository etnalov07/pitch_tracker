# Post-hit throwouts didn't add to the inning's outs (stale-closure bug)

- **Date:** 2026-05-14
- **Type:** fix
- **Commit:** `bc94f85`
- **Versions:** mobile `1.98.0` → `1.99.0`, web `1.3.0` → `1.4.0`

## Context

When the user logged a hit and then used the post-hit Runner Advancement modal's "Add throwout" section to mark a runner as thrown out advancing, the throwout's out wasn't fully reflected in downstream state:

- After **single + 1 throwout** (0 outs → expected 1): the live screen displayed 1 out (correct), but the at-bat record was saved with `outs_after = 0` and the next at-bat was created with `outs_before = 0`. Silent DB inconsistency.
- After **sacrifice fly + 1 throwout** (1 out → expected 3, inning over): the displayed outs only went to 1, the at-bat record saved `outs_after = 2`, and the inning didn't end. Visible bug.

Root cause: `handleEndAtBat` was reading `currentOuts` from its `useCallback`/closure scope. The post-hit confirm flow records the throwout events, calls `setCurrentOuts(lastOutsAfter)`, then immediately invokes `handleEndAtBat` — but React hadn't flushed the state update, so `handleEndAtBat`'s `currentOuts` was still the pre-throwout value. `newOutCount = currentOuts (stale) + getOutsForResult(result)` therefore dropped the throwouts entirely.

## Decisions

- **Pass the corrected outs explicitly** rather than relying on a `useRef` or refactoring the at-bat-end pipeline. The post-hit confirm already knows the correct `lastOutsAfter` (returned by the API per-event), so threading it through a new `extra.outs_before_override` parameter is one line at the call site and a one-line read inside `handleEndAtBat`.
- Kept the existing inning-end check (`outsFromPlay > 0 && newOutCount >= 3`) and the confirm-side `setInningEndedByBaserunnerOut(true)` flag as-is — out of scope for this fix and the surrounding behavior was correct given the override.
- No new shared helper. The math is `outsBefore + getOutsForResult(result)`; extracting it would be premature.

## What shipped

### Mobile (`packages/mobile/app/game/[id]/live.tsx`)

- `handleEndAtBat` extra param widened to `{ rbi?, runs_scored?, outs_before_override? }`.
- Internal `outsBefore = extra?.outs_before_override ?? currentOuts`; `newOutCount` and the `startAtBatForBatter` outs argument both derived from `outsBefore`.
- `handleRunnerAdvancementConfirm` passes `outs_before_override: lastOutsAfter` when calling `handleEndAtBat`.

### Web (`packages/web/src/pages/LiveGame/useLiveGameActions.ts`)

- Mirrored: same extra param widening, same `outsBefore` derivation, same `advanceToNextBatter(outsBefore)` substitution, same call-site override from `handleRunnerAdvancementConfirm`.

### Versions

- `packages/mobile/package.json`: 1.98.0 → 1.99.0
- `packages/web/package.json`: 1.3.0 → 1.4.0

## Verification

1. Mobile: with 0 outs and a runner on 1st, log a single. In the Runner Advancement modal, "Add throwout" 1st → 3rd, confirm. Expect inning shows 1 out. Reload and confirm next at-bat record has `outs_before = 1`.
2. Mobile: with 1 out and a runner on 3rd, log a sacrifice fly. "Add throwout" of the runner from another base trying to advance, confirm. Expect inning to end (3 outs displayed → inning change modal).
3. Web: repeat both scenarios at `localhost:3000`.
4. The standalone "Runner Out" modal (caught stealing, pickoff, etc.) was unchanged — its `handleRecordBaserunnerOut` already used `currentOuts + 1` synchronously and was correct.

## Out of scope (deferred)

- The pre-existing bug where `handleEndAtBat` can start a new at-bat in the *old* inning when `lastOutsAfter >= 3` from throwouts alone (single + N throwouts ending the inning). The existing `inningEndedByBaserunnerOut` flag plus the confirm-side inning-change UI mask the symptom; a deeper refactor splitting "record at-bat" from "advance state" is the right cleanup, but not gated on this fix.
- Migrating `handleEndAtBat` to a `useRef`-based latest-outs pattern. The override is local and explicit; converting all call sites would be churn.
- Reporting/inning-summary UI — already reads `baserunner_events.out_recorded`, which was correct (the bug was downstream).
