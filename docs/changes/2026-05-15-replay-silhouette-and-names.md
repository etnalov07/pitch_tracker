# Replay: batter silhouette + batter/pitcher names + handedness lookup

- **Date:** 2026-05-15
- **Type:** feat
- **Commit:** `eda26e9`
- **Versions:** mobile `2.1.2` → `2.2.0`, web `1.6.2` → `1.7.0`

## Context

Three follow-ups from the user after using the [pitch replay](2026-05-14-pitch-replay.md):

1. **Add the batter silhouette** so it's clear whether the batter was left- or right-handed (mirrors the live charting view).
2. **Show the batter's name** in the header (already partially there) and **add the pitcher's name**.
3. The previous fix (color-coded dot) is still rendering correctly — but bringing in the silhouette + handedness context makes the strike-zone read at a glance.

`Pitch` carries `pitcher_id` and `opponent_batter_id` but not handedness. The handedness comes from the **OpponentLineup** (`bats`) and **GamePitchers** (`player.throws`) endpoints — both already exposed on each platform's `gamesApi`.

## Decisions

- **Fetch lineup + game pitchers alongside pitches/at-bats.** No new API endpoints; just two extra parallel calls in the existing `Promise.all`. Both calls are wrapped in `.catch(() => [])` so a missing lineup/roster degrades gracefully (silhouette just doesn't render).
- **Reuse the mobile `StrikeZone`'s built-in silhouette.** Already supports `batterSide` + `pitcherThrows` props (handles `'S'` switch-hitter via the pitcher's hand). Just pass them through.
- **Web `MiniStrikeZone` gets a small inline SVG silhouette** — head/body/legs/bat angled toward the strike zone — sized to match the mini canvas. Mirrors L/R based on the same effective-side rule as mobile.
- **Pitcher name lives in `replayBuilder`** alongside `batterDisplayName`. Refactored the joined-name extraction into a small `pickJoinedName(pitch, firstKey, lastKey, fallbackKey, fallback)` helper so both fields go through one path. `ReplayAtBat` now also has `pitcherDisplayName`.
- **Header layout**: top line is the batter (`#3 Smith (RHH)`), second line is `P: F. Last (RHP) · AB result: …`. Compact, both names visible, handedness annotated with the standard `RHH`/`LHH`/`RHP`/`LHP` shorthand.

## What shipped

### Shared

- `packages/shared/src/utils/replayBuilder.ts` — `ReplayAtBat` adds `pitcherDisplayName`. New `pickJoinedName` helper; `pickBatterName` and `pickPitcherName` both go through it. Reads `pitcher_first_name`/`pitcher_last_name`/`pitcher_name` API-joined fields the same way batter names already are.
- `packages/shared/src/utils/__tests__/replayBuilder.test.ts` — extends the joined-name tests to cover both batter + pitcher (modern joined names + the legacy fallback).

### Mobile

- `packages/mobile/app/game/[id]/replay.tsx` — fetches `getOpponentLineup` + `getGamePitchers` alongside the existing data load. Maps `opponent_batter_id → bats` and `pitcher_id → throws`. Passes `batterSide` + `pitcherThrows` to the existing `StrikeZone` (silhouette renders for free) and surfaces `(RHH)`/`(LHP)` annotations next to the names in the header.

### Web

- `packages/web/src/pages/Replay/Replay.tsx` — same data fetches + lookup maps as mobile. Passes `batterSide` + `pitcherThrows` to `MiniStrikeZone`. Header shows pitcher name.
- `packages/web/src/pages/Replay/MiniStrikeZone.tsx` — accepts `batterSide` + `pitcherThrows`. Resolves switch-hitters against `pitcherThrows` (matching mobile). Inline SVG batter silhouette rendered on the appropriate side with a bat angled toward the zone.

### Versions

- `packages/mobile/package.json`: 2.1.2 → 2.2.0 (minor — visible feature add)
- `packages/web/package.json`: 1.6.2 → 1.7.0 (minor — visible feature add)

## Verification

1. `cd packages/shared && npm test` — 158 tests pass, including the updated joined-name case covering both batter + pitcher.
2. **Mobile manual**: open replay on a finished game → confirm the batter silhouette renders on the correct side (RHH on the right, LHH on the left, switch-hitter resolves against the pitcher's throws). Confirm header shows `#3 Smith (RHH)` on the top line and `P: F. Last (RHP) · AB result: …` below.
3. **Web manual**: same end-to-end at `/game/:id/replay`. Inline silhouette matches the encoding.
4. **Edge cases**: a batter with no `bats` field on the lineup row (silhouette suppressed, no `(RHH)` annotation); switch-hitter (resolves against pitcher's throws); a pitcher missing from `gamePitchers` (no `(RHP)` annotation, silhouette still renders against the batter's literal `bats`).

## Out of scope (deferred)

- A "switch hand" toggle for switch-hitters (we resolve via the pitcher's throws automatically; manual override isn't needed yet).
- Catcher silhouette behind the plate. Cosmetic; live view doesn't have it either.
- Scrolling-game-context legend (color → pitch type). Info card already names the type.
