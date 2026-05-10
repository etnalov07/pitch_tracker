# `advance_on_throw` runner event — wild pickoffs & extra bases on errors

- **Date:** 2026-05-10
- **Type:** feat
- **Commit:** `b198b4a`
- **Versions:** web `0.90.0` → `0.91.0`, mobile `1.85.0` → `1.86.0`

## Context

Two real scoring scenarios fell outside existing options:

1. **Wild pickoff** — pitcher attempted a pickoff to first; throw got away; runner advanced 1st → 3rd. The existing `pickoff` event type was hard-coded as an OUT only.
2. **Extra bases on a throw/error** — runner (or batter) advanced beyond the standard play because of a fielding/throwing error (e.g., single, batter takes 2nd on the throw).

The post-hit `RunnerAdvancementModal` already let users drag runners anywhere, so the _position_ was captured — but the _reason_ (throw/error) was lost, so reports couldn't surface "extra bases on errors" or distinguish a wild pickoff from a clean one.

## Decisions

- One new `BaserunnerEventType`: **`advance_on_throw`** (covers both pickoffs and other throwing errors).
- Per-runner toggle in the post-hit advancement modal — no fielder picker for v1.
- Batter can be tagged too. Origin stored as `runner_base = 'home'` (RunnerBase widened to allow `'home'`).

## What shipped

### Shared types (`packages/shared/src/index.ts`)

- Added `'advance_on_throw'` to `BaserunnerEventType`.
- Widened `BaserunnerEvent.runner_base` to `RunnerBase | 'home'` for batter-origin events.
- `getSuggestedAdvancement` (in `utils/atBatHelpers.ts`) handles the new event with a one-base advance suggestion.

### API

- New migration `packages/api/src/migrations/032_advance_on_throw.sql`
    - Re-creates `event_type` CHECK to include `'advance_on_throw'`.
    - Re-creates `runner_base` CHECK to allow `'home'`.
- `services/baserunnerEvent.service.ts`: `'advance_on_throw'` is classified as an advancement (no out increment); `runner_base = 'home'` keeps `currentRunners` unchanged.

### Mobile

- `RunnerEventModal`: 5th advancement chip "Advance on Throw / Error" (short: TE).
- `RunnerAdvancementModal` (post-hit): new "Advances on throw/error" toggle list. The modal diffs `newRunners` vs `getSuggestedAdvancement` plus the batter's expected base, and surfaces every advancement that exceeded the algorithm's suggestion. Confirm callback signature extended:
    ```ts
    onConfirm(newRunners, runsScored, throwouts, errorAdvancements);
    ```
- `app/game/[id]/live.tsx`: post-hit consumer iterates `errorAdvancements` and posts one `baserunner_events` row per flagged movement, passing `new_base_runners` to keep the service from re-deriving runner state.

### Web

- Mirrored `RunnerEventModal` chip and `RunnerAdvancementModal` per-advancement toggle.
- `useLiveGameActions.ts` updated with the same iteration pattern.

## Verification / migration

1. Run migration `032_advance_on_throw.sql` on the prod DB.
2. Mobile: with a runner on 1st, open the standalone Runner Adv modal → Advance tab → "TE" chip → confirm 1→3. Verify a `baserunner_events` row with `event_type='advance_on_throw'`, `runner_base='first'`, `runner_to_base='third'`, `out_recorded=false`.
3. Mobile: log a single with a runner on 2nd. In the post-hit modal drag the batter to 2nd and the runner from 2nd to home. Toggle both "advance on throw/error" rows. Confirm — verify two new `advance_on_throw` rows.
4. Web: repeat both flows.

## Out of scope

- Fielder attribution on the error.
- Retroactive editing of `advance_on_throw` events (delete + re-add as workaround).
- Reporting changes ("extra bases on errors" stat) — separate task.
