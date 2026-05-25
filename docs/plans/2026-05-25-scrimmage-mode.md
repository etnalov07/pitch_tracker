# Plan — Scrimmage Game Mode

**Status:** Shipped · `f67c45c` · 2026-05-25
**Change doc:** [`docs/changes/2026-05-25-scrimmage-mode.md`](../changes/2026-05-25-scrimmage-mode.md)

## Context

Coaches want a "Scrimmage" mode for intrasquad / informal practice games. Unlike a real game:

- **Innings don't end on 3 outs** — pitchers in scrimmages are usually limited by pitch count or batters faced, so the coach needs to manually end the half-inning when ready.
- **Score doesn't matter** — coach can drop it from the UI entirely.
- **Only OUR pitcher is being charted** — opponent batters are just whoever steps in; no lineup setup ceremony.
- Otherwise behaves like a normal charting session (StrikeZone, ResultButtons, pitch types, BLE radar, optional pitch calling, etc.).

Today's mode menu has `our_pitcher` / `opp_pitcher` / `both` / `scouting`. Scrimmage is a fifth `charting_mode` value that mostly mimics `our_pitcher` for UI gating, plus three deltas: no auto-inning-end on 3 outs, a persistent "End Half Inning" button, and hidden score.

User confirmed (planning session):
1. **End Half advances to next inning, skipping bottom** — top of N → top of N+1, outs reset to 0, `gameMode` stays `'our_pitcher'` for the whole game. Web's `our_pitcher` already has this "skip the user's batting half" double-`advanceInning()` pattern at `packages/web/src/pages/LiveGame/useLiveGameActions.ts:219` — reuse it.
2. **Opponent name optional, defaults to "Scrimmage"** — form leaves the field editable so the coach can name the squad ("Red squad") but auto-fills the string `"Scrimmage"` if blank.

---

## Approach

Single-string enum extension. No new tables, no new endpoints. Reuses the existing `advanceInning()` flow for manual end-half. Hides the score branch in GameHeader when `charting_mode === 'scrimmage'`. Suppresses the existing 3-out auto-inning-change handler. Treats scrimmage as `'our_pitcher'`-equivalent for everything else (gameMode, lineup gating, batter source).

---

## Files modified

### packages/shared (rebuild required — do NOT bump version)

- **`src/index.ts`** — extend the `ChartingMode` union (~line 291) to add `'scrimmage'`:
  ```ts
  export type ChartingMode = 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting' | 'scrimmage';
  ```
  No change to `GameMode` (it stays `'our_pitcher' | 'opp_pitcher'` — derived). No change to `deriveGameMode` (`packages/shared/src/utils/gameMode.ts`); scrimmage games are created with `is_home_game=true` and live in `inning_half='top'` so `deriveGameMode` returns `'our_pitcher'` every time.

### packages/api

- **NEW `src/migrations/044_scrimmage_mode.sql`** — modeled after `025_scouting_mode.sql`:
  ```sql
  ALTER TABLE games DROP CONSTRAINT IF EXISTS games_charting_mode_check;
  ALTER TABLE games ADD CONSTRAINT games_charting_mode_check
      CHECK (charting_mode IN ('our_pitcher', 'opp_pitcher', 'both', 'scouting', 'scrimmage'));
  GRANT SELECT, INSERT, UPDATE, DELETE ON games TO bvolante_pitch_tracker;
  ```
- `src/schema/dump.sql` is data-only (40 COPY statements, no DDL) — no schema update needed.
- No change to `services/game.service.ts`, `controllers/game.controller.ts`, or `routes/game.routes.ts` — the mode is just a string flowing through.

### packages/mobile

- **`app/game/new.tsx`** — added `'scrimmage'` to the `chartingMode` state type union and the SegmentedButtons. When scrimmage selected: hide scouting-only fields, hide Home/Away picker (force `is_home_game = true`), allow blank opponent (default to `"Scrimmage"` on submit), route straight to `/live` (skip my-lineup), button copy becomes `Start Scrimmage`.
- **`app/game/[id]/useLiveGameController.ts`** — derive + export `isScrimmageMode = game?.charting_mode === 'scrimmage'`.
- **`app/game/[id]/useLiveGameActions.ts`** — short-circuit the three auto-inning-end branches (`handleEndAtBat`, `handleRunnerAdvancementConfirm` throwouts, `handleRecordBaserunnerOut`) on `!isScrimmageMode`. New `handleEndHalfScrimmage` action that calls `gamesApi.advanceInning(id)` TWICE (top → bottom → top of next), clears bases, zeroes outs, refreshes. Bypasses `advanceInningWithRuns` so scrimmages don't trigger score updates or endGame logic at `total_innings`.
- **`app/game/[id]/LiveGameRenderHelpers.tsx`** — new `<EndHalfScrimmageButton />` component, gated on `isScrimmageMode && game.status === 'in_progress'`.
- **`app/game/[id]/LiveGamePhone.tsx` + `LiveGameTablet.tsx`** — render `<EndHalfScrimmageButton />` below `<AtBatControls />`.
- **`src/components/live/GameHeader/GameHeader.tsx`** — both score cells render `'—'` instead of numbers when `charting_mode === 'scrimmage'`.

### packages/web

- **`src/pages/GameSetup/GameSetup.tsx`** — added 5th `ModeCard` for `'scrimmage'`. `step0Valid` allows blank opponent. Submit defaults `opponent_name` to `'Scrimmage'`, forces `is_home_game=true`, routes to `/game/:id` (skip my-lineup).
- **`src/pages/LiveGame/useLiveGameState.ts`** — derive + export `isScrimmageMode`.
- **`src/pages/LiveGame/useLiveGameActions.ts`** — same three auto-end short-circuits + new `handleEndHalfScrimmage` (mirrors mobile shape: two `advanceInning` calls, clear bases, zero outs, refresh).
- **`src/pages/LiveGame/LiveGame.tsx`** — destructure `isScrimmageMode`; both `<Score>` cells render `'—'`; new always-visible **End Half Inning →** button below the main pitch form.

### docs/changes

- `docs/changes/2026-05-25-scrimmage-mode.md` — change doc with full per-package bullet list.
- `docs/changes/README.md` — index row added.

---

## Key existing code reused

- `ChartingMode` enum: `packages/shared/src/index.ts:291`
- `deriveGameMode`: `packages/shared/src/utils/gameMode.ts:10-13` (unchanged)
- 3-out auto-end branches (web): `packages/web/src/pages/LiveGame/useLiveGameActions.ts:340, 700, 759` — short-circuited via `!isScrimmageMode`
- `handleSkipHalf` pattern (scouting's existing manual half-end): `packages/web/src/pages/LiveGame/useLiveGameActions.ts:958-961`
- Backend `advanceInning()`: `packages/api/src/services/game.service.ts:236-278` — atomic increment, no FK headaches, called repeatedly
- Web mode picker shape: `packages/web/src/pages/GameSetup/GameSetup.tsx:64-88` (`CHARTING_MODES` + `ModeCard`)
- Mobile new-game state shape: `packages/mobile/app/game/new.tsx:30-44`

---

## Verification

1. **Migration**: apply `044_scrimmage_mode.sql` to local DB; `\d games` shows the updated CHECK constraint.
2. **Shared rebuild**: `cd packages/shared && npm run build` succeeds.
3. **Type checks**: `npx tsc --noEmit` clean in `api`, `web`, `mobile`.
4. **Web ESLint**: clean.
5. **Mobile Jest**: 12/12 pass.
6. **Mobile new-game flow**: create a game, pick "Scrimmage", leave opponent blank → game saves with `opponent_name='Scrimmage'`, `charting_mode='scrimmage'`, `is_home_game=true`. Scouting fields hidden.
7. **Web parity**: same flow.
8. **Live screen — auto-end disabled**: open a fresh scrimmage. Log 3 outs in a row. The `InningChangeModal` does NOT appear.
9. **Manual End Half**: tap "End Half Inning". UI shows top of next inning, outs back to 0, no runs-scored prompt.
10. **Score hidden**: GameHeader on both platforms shows `—` for scores when scrimmage.
11. **Other modes unaffected**: open an existing `our_pitcher` / `scouting` / `opp_pitcher` / `both` game → auto-end on 3 outs still fires, score visible.

---

## Out of scope (deferred)

- Pitch-count limits per pitcher (could show a "max X pitches" badge in a follow-up).
- Auto-prompt to swap pitcher after N pitches.
- Optional scoreboard toggle for scrimmage (intentionally hidden; switch to `our_pitcher` mode if you want a scoreboard).
- Tracking scrimmage games in the per-pitcher cumulative stats differently from real games (treat them the same for now — coach can filter post-hoc).
- A separate "scrimmage" report layout in post-game summary screens.
- Bumping `packages/shared`'s version (per memory: never bump shared; api/web pin at 1.0.0).
