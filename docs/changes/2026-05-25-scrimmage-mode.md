# Scrimmage Game Mode · 2026-05-25

**Type:** `feat`
**Commit:** _(pending)_
**Versions:** `shared@1.0.0 (unchanged)` · `api@1.16.0 → 1.17.0` · `web@1.23.0 → 1.24.0` · `mobile@2.19.1 → 2.20.0`

## Context

Coaches want a new game mode for intrasquad / informal practice games where:

- Innings don't auto-end on 3 outs (pitchers are usually limited by pitch count or batters faced).
- Score doesn't matter.
- Only our team's pitcher is charted.
- Coach manually flips the half-inning when they're ready.

Today's mode list (`our_pitcher` / `opp_pitcher` / `both` / `scouting`) didn't have a slot for this. The new `scrimmage` mode reuses every existing flow except: (1) the 3-out auto-inning-end is suppressed, (2) a dedicated "End Half Inning" button advances top → top of next inning in one tap, (3) the score numbers in the live header render as `—`.

## Plan (Decisions)

- **End Half advances to next inning (skip bottom).** Each tap calls `gamesApi.advanceInning` twice so we go top → bottom → top of next; `gameMode` stays `'our_pitcher'` because `is_home_game=true` + `inning_half='top'`. (User decision in plan session.)
- **Opponent name optional, defaults to `"Scrimmage"`** on submit. Coach can override with e.g. "Red squad".
- **Score replaced with `—`** in GameHeader rather than hiding the column — preserves layout, signals "no score tracked".
- **Treated as `our_pitcher`-equivalent** for everything else (gameMode, lineup gating, batter source). Skips `my-lineup` setup on new-game submit and lands straight on `/live`.
- **No new backend endpoints.** Reuses existing `POST /games` + `gamesApi.advanceInning`. Only DB delta is widening the CHECK constraint.

Full plan: see the approved plan file (referenced via this commit's diff).

## What shipped

### packages/shared (no version bump — pinned at 1.0.0)

- `src/index.ts`: extended `ChartingMode` union to add `'scrimmage'`.

### packages/api (v1.17.0)

- **NEW** `src/migrations/044_scrimmage_mode.sql`: drops + recreates `games_charting_mode_check` with `'scrimmage'` included; re-grants `bvolante_pitch_tracker`.
- No service / controller / route changes — the mode is just a string passed through.

### packages/mobile (v2.20.0)

- `app/game/new.tsx`:
  - Extended the `chartingMode` state type union.
  - Added a 5th `SegmentedButtons` option labeled `Scrim`.
  - When scrimmage selected: hides the Home/Away picker (force `is_home_game=true` on submit), shows a small italic hint about no-fixed-innings/no-score/manual-end-half.
  - Opponent input is optional + placeholder reads `e.g., Red squad (defaults to "Scrimmage")`.
  - Submit defaults `opponent_name` to `'Scrimmage'` if blank; routes straight to `/game/[id]/live` (skips `my-lineup` setup).
  - Create-button copy switches to `Start Scrimmage`.
- `app/game/[id]/useLiveGameController.ts`:
  - Derives `isScrimmageMode = game?.charting_mode === 'scrimmage'`; exported in the flat return.
- `app/game/[id]/useLiveGameActions.ts`:
  - Destructures `isScrimmageMode` from the controller bag.
  - Short-circuits the three auto-inning-end branches when in scrimmage (`handleEndAtBat` 3-out branch, `handleRunnerAdvancementConfirm` throwout branch, `handleRecordBaserunnerOut`). Outs keep accumulating; the `InningChangeModal` never opens.
  - **NEW** `handleEndHalfScrimmage`: calls `gamesApi.advanceInning` twice (top → bottom → top of next), clears bases, zeroes outs, refreshes game + inning. Bypasses `advanceInningWithRuns` on purpose so scrimmages don't trigger score updates or end-game logic at `total_innings`.
  - Added the new handler to the return bag + `isScrimmageMode` to the relevant useCallback dep arrays.
- `app/game/[id]/LiveGameRenderHelpers.tsx`:
  - **NEW** `<EndHalfScrimmageButton />` component, gated on `isScrimmageMode && game.status === 'in_progress'`. Outlined button with `skip-next` icon, top-aligned.
- `app/game/[id]/LiveGamePhone.tsx` + `LiveGameTablet.tsx`:
  - Render `<EndHalfScrimmageButton />` below `<AtBatControls />` in both layouts.
- `src/components/live/GameHeader/GameHeader.tsx`:
  - Both `<Score>` cells show `'—'` instead of the numeric score when `game.charting_mode === 'scrimmage'`.

### packages/web (v1.24.0)

- `src/pages/GameSetup/GameSetup.tsx`:
  - Extended `ChartingMode` union; added a 5th `ModeCard` for Scrimmage.
  - `step0Valid` allows blank opponent in scrimmage.
  - Submit defaults `opponent_name` to `'Scrimmage'` if blank, forces `is_home_game=true`, routes straight to `/game/[id]` (skips `my-lineup`).
- `src/pages/LiveGame/useLiveGameState.ts`:
  - Derives `isScrimmageMode`; exported on the state bag.
- `src/pages/LiveGame/useLiveGameActions.ts`:
  - Derives `isScrimmageMode` locally (mirrors `isScoutingMode` pattern).
  - Short-circuits the three auto-inning-end branches when scrimmage.
  - **NEW** `handleEndHalfScrimmage`: same shape as mobile — two `advanceInning` calls, clear bases, zero outs, refresh.
  - Exposed on the actions return.
- `src/pages/LiveGame/LiveGame.tsx`:
  - Destructures `isScrimmageMode`.
  - Both header `<Score>` cells render `'—'` when scrimmage.
  - **NEW** `End Half Inning →` button (reuses `StartAtBatButton` style + `NoAtBatContainer`) rendered below the main pitch form, always visible during in-progress scrimmages.

### docs/changes

- This doc, plus an updated `docs/changes/README.md` table row.

## Verification

1. **Migration**: apply `044_scrimmage_mode.sql` locally. `\d games` shows the new CHECK constraint including `'scrimmage'`.
2. **Shared rebuild**: `cd packages/shared && npm run build` succeeds.
3. **Type checks**: `npx tsc --noEmit` clean in `packages/api`, `packages/web`, `packages/mobile`.
4. **Web ESLint**: `cd packages/web && npx eslint src/ --ext .ts,.tsx` clean.
5. **Mobile Jest**: `cd packages/mobile && npm test` — 12/12 pass.
6. **End-to-end (mobile)**: create a game → pick **Scrim** → leave opponent blank → submit. Game lands on `/live` with `opponent_name="Scrimmage"`, `charting_mode="scrimmage"`, `is_home_game=true`. GameHeader shows `—` for both scores. Log 3 outs → `InningChangeModal` does NOT appear. Tap **End Half Inning** → inning increments, outs reset to 0, no runs-scored prompt.
7. **End-to-end (web)**: same flow on `/games/new` → `Scrimmage` card.
8. **Regression**: open an existing `our_pitcher` / `scouting` / `opp_pitcher` / `both` game; auto-end on 3 outs still fires, score still visible, scouting "Skip to Next Half" still works.

## Out of scope (deferred)

- Pitch-count cap per pitcher (no badge / no auto-swap prompt yet).
- Auto-end after N pitches.
- Letting scrimmages keep score even if the coach wants to (intentionally hidden — switch to `our_pitcher` mode if you want a scoreboard).
- Distinguishing scrimmage games from real games in per-pitcher cumulative stats / post-game reports — they aggregate the same.
- Bumping `packages/shared` (intentionally pinned at 1.0.0 per memory).
