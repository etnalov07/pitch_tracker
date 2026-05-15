# Live game header — score labels, stats modal data, pitch count placement

- **Date:** 2026-05-14
- **Type:** fix
- **Commit:** _backfill on commit_
- **Versions:** mobile `1.99.0` → `2.0.0`, web `1.4.0` → `1.5.0`

## Context

Three live-game header issues reported together:

1. **Score reversed in Charter view (mobile)** — for visitor (away) games, the `YOU` / `OPP` labels on the GameHeader were swapped relative to the actual score values. Same bug existed silently on web for the same case.
2. **Pitcher Stats modal showed empty** — the modal was passed the current at-bat's `pitches` (Redux), so the moment a new at-bat started (or a pitching change) it had nothing to render.
3. **Pitch count next to pitcher name was unreliable + cut off** — a `(N)` suffix on the name overflowed the small header, and the user wanted that data in the stats modal anyway.

## Decisions

### Score labels (#1)

Root cause: the client scoring convention is **"user runs always go to `home_score`, opponent runs always go to `away_score`"** (see `useLiveGameActions.updateScoreForRuns` and the `// User's runs go to home_score (user is always home_score)` comment in web). But the GameHeader/LiveGame labels branched on `is_home_game`, swapping `YOU` / `OPP` for visitor games — which broke the label/value pairing.

Fix: drop the `is_home_game` branch in the non-scouting label. Left column is always opponent (`OPP` on mobile / `opponent_name` on web), right column is always user (`YOU` on mobile / `home_team_name` on web). Scouting branch unchanged — it correctly uses `opponent_name` / `scouting_home_team` since the user isn't either team.

### Stats modal data (#2)

Made `PitcherStatsModal` self-fetching: pass `gameId` + `pitcherId`, fetch `gamesApi.getGamePitches(gameId)` on each `visible` rising edge, filter by pitcher, hand to `PitcherStats`. Kept the modal isolated from the parent's at-bat pitch state.

### Pitch count placement (#3)

Removed the `pitchCount` prop and the `(N)` suffix from `GameHeader`'s pitcher name. The modal's `PitcherStats` already shows total/strike/ball counts and a per-pitch-type breakdown — and with #2 fixed, it's accurate end-to-end. Also dropped the now-unused `currentPitcherPitchCount` state and its `getPitcherGameStats` polling effect from `live.tsx`.

No new abstractions, no compatibility shims for the dropped prop — only one caller existed.

## What shipped

### Mobile

- `packages/mobile/src/components/live/GameHeader/GameHeader.tsx` — score labels simplified; `pitchCount` prop removed; pitcher name no longer carries a count suffix.
- `packages/mobile/src/components/live/PitcherStatsModal/PitcherStatsModal.tsx` — replaces `pitches` prop with `gameId`; fetches its own data on open.
- `packages/mobile/app/game/[id]/live.tsx` — drops `currentPitcherPitchCount` state + the `getPitcherGameStats` effect; updates the GameHeader and PitcherStatsModal call sites.

### Web

- `packages/web/src/pages/LiveGame/LiveGame.tsx` — same `is_home_game` label branch removed for parity. Web stats modal flow already pulls full-game pitches, so #2/#3 don't need a web change.

### Versions

- `packages/mobile/package.json`: 1.99.0 → 2.0.0
- `packages/web/package.json`: 1.4.0 → 1.5.0

## Verification

1. **Score labels** (mobile + web): start a charter session in a visitor (away) game. Score a run for your team. Confirm the `YOU` (mobile) / your-team (web) column increments — not the opponent column. Repeat for a home game.
2. **Stats modal** (mobile): with at least one pitch logged in the current and a previous at-bat, tap the `Stats` pill in the GameHeader. Modal should show the full-game count for the current pitcher (not just the active at-bat). Close + reopen — data refetches.
3. **Pitch count placement** (mobile): GameHeader pitcher row shows just `F. Last`, no truncated `(N)` suffix.

## Out of scope (deferred)

- Renaming `home_score`/`away_score` columns — the API still treats them as actual home/away (and `addHomeRuns`/`addAwayRuns` mirror that). Reconciling the client's "user-always-home" convention with the DB-side semantic is its own project; this fix only repairs the label/value pairing.
- A WebSocket push for the pitcher pitch count (was driven by `statsRefreshTrigger` re-fetching `getPitcherGameStats`). With the count moved into the modal, real-time pushes only matter when the modal is open — and the modal already refetches on open.
- Web parity for the stats modal — its existing data flow is fine; touched only the score-label branch.
