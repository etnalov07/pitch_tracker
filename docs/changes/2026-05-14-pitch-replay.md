# Pitch-by-pitch game replay (mobile + web)

- **Date:** 2026-05-14
- **Type:** feat
- **Commit:** _backfill on commit_
- **Versions:** mobile `2.0.0` → `2.1.0`, web `1.5.0` → `1.6.0`

## Context

After a game finishes the user wanted to coach off the data: pick a batter, then scrub through that at-bat one pitch at a time and see the **target location** vs the **actual location** on the strike zone, plus pitch type / velocity / result and the count before the pitch. The data model already captured everything (`Pitch.target_zone`, `location_x/y`, `balls_before/strikes_before`, `team_side`); just no UI surfaced it that way. Scope is restricted to **the user's own pitcher** (`team_side === 'our_team'`) — opponent pitchers are filtered out.

## Decisions

- **Pure replay-shaping helpers in shared.** `replayBuilder.ts` filters to our-team pitches, groups by AB, sorts within each AB by `pitch_number` then `created_at`, and orders ABs chronologically. Six unit tests guard the rules. Both platforms call the same builder so there's one source of truth.
- **No new mobile dependency.** Built a tiny tap-to-position `PitchScrubber` (~80 lines, `Pressable` + measured `View`) instead of pulling in `@react-native-community/slider`. ABs run 3–8 pitches; tap-to-position is plenty and avoids any iOS 26.2 beta package risk noted in CLAUDE.md.
- **New `Replay` screen on each platform** rather than a tab inside the existing viewer or another branch in `live.tsx`. Read-only, no overlap with the live charting flow, easy to evolve.
- **Reuse mobile `StrikeZone` as-is.** Pass `targetZone={currentPitch.target_zone}` and `previousPitches={[currentPitch]}` — the existing component renders the dashed amber target marker AND the single result-colored dot together with no changes.
- **Web has no `StrikeZone`** today, so built `MiniStrikeZone` — a small static SVG (3×3 grid, target dashed crosshair, single colored dot). Same coordinate convention as mobile (zone rect at `x=105 y=100 w=90 h=132` inside a `300x300` viewbox), so the visuals match across platforms.
- **Batter naming**: `Pitch` doesn't declare `batter_first_name/last_name`, but the API joins them on. `replayBuilder` defensively reads them via an unknown-cast and falls back to `"Batter"`. No new shared types needed.

## What shipped

### Shared

- `packages/shared/src/utils/replayBuilder.ts` — `filterUserPitcherPitches`, `groupPitchesByAtBat`, `buildReplaySequence`, `ReplayAtBat` type.
- `packages/shared/src/utils/__tests__/replayBuilder.test.ts` — 6 cases (filtering, grouping/sort, AB chronological order, AB skip when no our-team pitches, batter-name extraction, fallback name).
- `packages/shared/src/index.ts` — exports the new helpers + type.

### Mobile

- `packages/mobile/src/state/games/api/gamesApi.ts` — added `getAtBatsByGame(gameId)` calling `GET /at-bats/game/:gameId`.
- `packages/mobile/src/components/replay/BatterStrip/` — horizontal Chip strip, one per AB, with selection state.
- `packages/mobile/src/components/replay/PitchScrubber/` — tap-to-position track + ◀/▶ buttons + `n / total` counter, no external dep.
- `packages/mobile/app/game/[id]/replay.tsx` — the screen. Loads game/pitches/at-bats, runs `buildReplaySequence`, reuses `StrikeZone` for the visual, shows pitch type/velocity/result + count and outs.
- `packages/mobile/app/game/[id]/index.tsx` — added a "Replay Game" button to the completed-game CTA stack.

### Web

- `packages/web/src/state/games/api/gamesApi.ts` — added `getAtBatsByGame` and `getGamePitches` (web didn't have either).
- `packages/web/src/pages/Replay/` — `Replay.tsx`, `MiniStrikeZone.tsx`, `styles.ts`, `index.ts`. Native `<input type="range">` slider with theme accent color + ◀/▶ buttons.
- `packages/web/src/App.tsx` — registered `/game/:gameId/replay`.
- `packages/web/src/pages/LiveGame/ViewerDashboard.tsx` — added a "▶ Replay" link in the dashboard header for completed games.

### Versions

- `packages/mobile/package.json`: 2.0.0 → 2.1.0
- `packages/web/package.json`: 1.5.0 → 1.6.0

## Verification

1. **Unit:** `cd packages/shared && npm test` — 157 tests, including the 6 new `replayBuilder` cases.
2. **Mobile manual:** open a finished game where you charted your own pitcher → tap **Replay Game** → pick a batter → use the slider / step buttons → strike zone shows the dashed target + the single actual-location dot per pitch → info row updates with type/velocity/result and the count before the pitch.
3. **Web manual:** load a finished game in the browser → ViewerDashboard → **▶ Replay** → same end-to-end behavior at `/game/:id/replay`.
4. **Edge cases:** AB with one pitch (slider disabled, just shows that pitch), pitch missing `target_zone` (only the actual dot renders), opp-pitcher-only game (the "No pitches from your pitcher in this game." empty state).

## Out of scope (deferred)

- **Runners-on per pitch.** No per-pitch base-runner snapshot in the schema; reconstructing requires replaying `baserunner_events` + at-bat results in order. Worth a v2 — would need either a snapshot column on `pitches` or a server-side rebuilder.
- **Mid-AB outs change** (caught stealing during an AB etc.). v1 displays `atBat.outs_before` for every pitch in the AB — accurate at the AB's start, which covers the common case.
- **Auto-play / "play" button.** Manual scrubbing only in v1.
- **Batter handedness mirroring on the web `MiniStrikeZone`.** Mobile's `StrikeZone` flips for LHH via `getZoneCoords`; the web mini view shows the canonical orientation. Easy follow-up if the user wants it.
- **WebSocket-driven live updates** to a Replay-in-progress game. Replay is read-only and intended for completed games.
