# Manual Velocity Entry for a Completed Game (web)

- **Date:** 2026-06-04
- **Type:** `feat`
- **Commit:** `e61a48c`
- **Versions:** `api` 1.26.0 → 1.27.0 · `web` 1.34.0 → 1.35.0
- **Plan:** `~/.claude/plans/greedy-launching-wolf.md` (approved this session).

## Context

A coach finishes a game with velocities written down on paper, by pitcher, one per pitch in
throw order. The app stores `pitches.velocity` per pitch and surfaces top/avg velocity in
postgame stats, but there was no way to **enter** velocities after the fact — velocity was
only ever populated live (manual field or radar). This adds a web-only flow to backfill
per-pitch velocities on a **completed** game, per pitcher, so the existing PitcherStats /
PitcherReport / Replay views populate with real velocity data.

## Plan (Decisions)

- **Dedicated entry page** (vs. a postgame tab or inline-in-Replay) — best for fast bulk data
  entry; reached from the completed-game view.
- **One velocity per pitch, in throw order** — a type-down velocity column plus an optional
  "paste a list" that fills sequentially into the pitcher's pitches.
- **Own-team pitchers only** — opponents are charted via a separate mechanism (deferred).
- **Separate API path, not an extension of `PATCH /pitches/:id`** — that endpoint
  (`updatePitchResult`) is deliberately latest-pitch-only with at-bat-boundary guards;
  velocity backfill edits any pitch and never touches the count.
- **Invalidate the stats cache** — top/avg velocity are cache-aside in `performance_summaries`;
  the backfill clears the cached game rows so they recompute (mirrors `game.service.deleteGame`).
- **One Save persists the whole game** (minor simplification over per-pitcher save): drafts
  persist across pitcher-tab switches, and Save sends every changed row in one request — no
  data loss on switch, no warn-on-switch needed.

## What shipped

**api** (`packages/api`)

- `routes/pitch.routes.ts`: registered `PATCH /pitches/velocities` **before** the parameterized
  `PATCH /:id` so it isn't captured by `/:id` (per `.claude/rules/api.md`).
- `controllers/pitch.controller.ts`: added `updatePitchVelocities` — validates `game_id`,
  non-empty `updates[]`, and that each `velocity` is `null` (clear) or a number in 20–130;
  400 on bad input; maps service `status`/`code` (e.g. 404 `PITCH_NOT_IN_GAME`) to the response.
- `services/pitch.service.ts`: added `updatePitchVelocities(gameId, updates)` — a transaction
  that runs `UPDATE pitches SET velocity=$1 WHERE id=$2 AND game_id=$3` per row (the `game_id`
  guard scopes the write and detects a stray pitch via `rowCount === 0` → 404), then
  `DELETE FROM performance_summaries WHERE source_type='game' AND source_id=$gameId`. Returns
  the updated count.
- `__tests__/pitchVelocity.routes.test.ts` (new): 9 tests — 401 unauth; rejects missing
  game_id / empty updates / out-of-range / non-numeric / missing pitch_id; accepts `null` to
  clear; bulk-updates with scoped params + asserts the cache-invalidation DELETE; 404 +
  `PITCH_NOT_IN_GAME` when a pitch isn't in the game.
- `package.json`: 1.26.0 → 1.27.0.

**web** (`packages/web`)

- `state/games/api/gamesApi.ts`: added `updatePitchVelocities(gameId, updates)` →
  `PATCH /pitches/velocities`.
- `pages/VelocityEntry/` (new — `VelocityEntry.tsx` + `styles.ts` + `index.ts`): loads game +
  pitchers + pitches; pitcher tabs; per-pitch table (#, type, result, count) with an editable
  velocity input seeded from the stored value; Enter advances to the next row; a paste-a-list
  "Fill ↓" helper that maps numbers to the pitcher's pitches in order; a sticky Save bar
  showing the unsaved-change count and per-pitcher progress; dirty inputs highlighted; Save
  validates client-side and persists all changed rows for the game.
- `App.tsx`: added route `/game/:gameId/velocities` → `VelocityEntry` (ProtectedRoute).
- `pages/LiveGame/ViewerDashboard.tsx`: added an **✎ Enter Velocities** link beside ▶ Replay,
  gated on `game.status === 'completed'`.
- `package.json`: 1.34.0 → 1.35.0.

No `packages/shared` change — `Pitch.velocity` already exists; payload types are inlined.

## Verification

- **Automated (run here):**
  - `cd packages/api && npx tsc --noEmit` clean; `npx jest pitchVelocity` → 9/9.
  - `cd packages/web && npx tsc --noEmit` clean; `npx eslint src/ --ext .ts,.tsx` → 0 warnings.
  - Prettier on all changed files → no diff.
- **End-to-end (local, `npm run dev:api` + `dev:web`):**
  1. Open a completed game → ViewerDashboard → **✎ Enter Velocities**.
  2. Pick a pitcher; their pitches show in throw order with type/result/count context.
  3. Type velocities down the column (or paste `78 79 77 80` and Fill ↓); Save.
  4. Reload → values persist; **Pitcher Stats** now shows top/avg velocity (cache cleared);
     **Replay** shows each pitch's mph.
  5. Re-save (update-by-id) → no duplicates; values update; a velocity cleared to blank → null.

## Out of scope (deferred)

- Opponent pitchers' velocities (separate opposing-pitcher charting).
- Mobile parity — web-only postgame tool; mobile already captures velocity live.
- Editing velocity on an in-progress game — the live form already handles in-game entry; this
  flow targets completed games.
- Per-game ownership enforcement — no pitch/game mutation route enforces it today; matched the
  existing `authenticateToken`-only pattern rather than introducing a one-off check.
