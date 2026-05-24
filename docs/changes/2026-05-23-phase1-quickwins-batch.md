# Phase 1 Quick Wins · Batch 2 — escape modals, pitch count, web tendencies, selector parity · 2026-05-23

**Type:** `feat`
**Commit:** `9b2a8fd`
**Versions:** `mobile@2.8.0 → 2.9.0` · `web@1.19.0 → 1.20.0`

## Context

Second batch of UX-audit Phase 1 quick wins. After the Snackbar foundation landed (`2026-05-23-snackbar-foundation.md`), this PR knocks out four small items that don't need API or schema changes: fix two unescapable modals, surface pitch count on the live header (phone), wire up a dead-code Pitcher Tendencies button on web, and align mobile/web pitcher selectors.

Findings addressed: `UX-PB-01`, `UX-IP-01`, `UX-LG-13`, `UX-TD-01`, `UX-PB-02`.

Bigger Phase 1 items deferred to their own PRs: #2 Fix Last Pitch (needs `PATCH /pitches/:id`), #5 Smart defaults (needs new API query), #10 Date pickers (needs picker component), #9 Zone-tap cleanup (needs StrikeZone redesign discussion), #4 `is_home_game` recovery (needs score-flip semantics).

## Plan (Decisions)

- **TeamAtBatModal** — add `onDismiss` prop wired to `setShowTeamAtBat(false)`; render explicit "Cancel" button alongside "Continue". Auto-open useEffect re-fires next inning if user is still batting, so dismissing for the current half is safe.
- **InningChangeModal** — `onDismiss` calls `advanceInningWithRuns(0)`. The modal opens after `setCurrentOuts(0)` has already run locally; the server still has the old inning. Dismissing must keep state in sync, so it advances with 0 runs (the most-common case).
- **Pitcher Tendencies (web)** — the panel was rendered conditionally on `showPitcherTendencies` but no button set the state. Add a `📊 Pitcher` button next to `🎯 Hitter` in the TopBar; gate on `currentPitcher && !isScoutingMode && gameMode !== 'opp_pitcher'`.
- **Pitch count in live header** — fetch from existing `gamesApi.getPitcherGameStats(pitcherId, gameId)`; refresh on `statsRefreshTrigger` (bumped after each log). Render as a small pill `N PC` next to the "Stats" pill in `GameHeader.pitcherGroup`. Hidden in scouting / opp_pitcher modes.
- **Pitcher selector parity** — align both surfaces to "full team roster, sorted with pitchers (`primary_position === 'P'`) first, then alphabetical". Web previously filtered to position='P' only (blocked emergency-relief case). New `gamesApi.getTeamPlayers(teamId)` calls the existing `/players/team/:team_id` endpoint.

Plan doc: [`docs/plans/2026-05-23-phase1-quickwins-batch.md`](../plans/2026-05-23-phase1-quickwins-batch.md).

## What shipped

### packages/mobile (v2.9.0)

- MODIFIED `src/components/live/TeamAtBatModal/TeamAtBatModal.tsx` — new required `onDismiss` prop; new `buttonRow` style; Cancel + Continue rendered side-by-side.
- MODIFIED `src/components/live/InningChangeModal/InningChangeModal.tsx` — new required `onDismiss` prop wired into the Paper `Modal`'s own `onDismiss`.
- MODIFIED `src/components/live/GameHeader/GameHeader.tsx` — new `pitcherGamePitchCount?: number` prop; new `pitchCountPill` / `pitchCountValue` / `pitchCountLabel` styles; pill rendered only when current pitcher exists and prop is defined.
- MODIFIED `src/components/live/PitcherSelectorModal/PitcherSelectorModal.tsx` — sort `teamPlayers` so `primary_position === 'P'` is first, then alphabetical by last name. Position players still appear (emergency-relief case) but below pitchers.
- MODIFIED `app/game/[id]/live.tsx`:
  - `pitcherGamePitchCount` `useState` (declared early, populated by effect placed after `gameMode` is derived).
  - `useEffect` deps: `id`, `currentPitcher?.player_id`, `isScoutingMode`, `gameMode`, `statsRefreshTrigger`. Calls `gamesApi.getPitcherGameStats(...)`; resets to `undefined` in opp_pitcher / scouting modes.
  - `<TeamAtBatModal onDismiss={() => setShowTeamAtBat(false)} />`
  - `<InningChangeModal onDismiss={() => advanceInningWithRuns(0)} />`
  - `<GameHeader pitcherGamePitchCount={pitcherGamePitchCount} />`
- MODIFIED `package.json` — version 2.8.0 → 2.9.0.

### packages/web (v1.20.0)

- MODIFIED `src/state/games/api/gamesApi.ts` — new `getTeamPlayers(teamId)` method hitting `/players/team/:team_id`.
- MODIFIED `src/components/game/PitcherSelector/PitcherSelector.tsx` — swap `getTeamPitchers` for `getTeamPlayers`; new sort on `availablePitchers` keeping position players visible but below pitchers.
- MODIFIED `src/pages/LiveGame/LiveGame.tsx` — new `📊 Pitcher` `SwapButton` in the TopBar; gated on `currentPitcher && !isScoutingMode && gameMode !== 'opp_pitcher'`.
- MODIFIED `package.json` — version 1.19.0 → 1.20.0.

### packages/shared / packages/api

No changes — `/players/team/:team_id` already existed.

## Verification

**Type + lint + tests (passed):**

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/web && npx eslint ...` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- `npx prettier --write` on all touched files.

**Smoke (manual):**

- Mobile: trigger TeamAtBatModal (visitor game, user team batting) → tap outside → modal closes; re-opens next half.
- Mobile: record 3rd out → InningChangeModal pops → tap outside → inning advances with 0 runs (server + client stay consistent).
- Mobile: live game header shows `N PC` next to "Stats" pill; increments after each pitch logged. Disappears in `opp_pitcher` and scouting modes.
- Mobile: PitcherSelectorModal "Available Pitchers" section — pitchers grouped at top, position players below.
- Web: TopBar shows `📊 Pitcher` between `🎯 Hitter` and `⚙ Settings`. Click opens `PitcherTendenciesPanel`. Button hidden in scouting / opp_pitcher modes.
- Web: PitcherSelector — full roster visible; pitchers at top.

## Out of scope (deferred)

- Bigger Phase 1 items: #2 Fix Last Pitch, #5 Smart defaults, #4 home/away recovery, #9 Zone-tap UX, #10 Date pickers — each ships in its own PR.
- The tablet stats panel's misleading `Total Pitches: ${pitches.length}` line still shows per-at-bat count. Replacing it cleanly is part of the Phase 2 Live screen refactor (Theme C).
- Phase 1b — remaining ~50 `Alert.alert`/`alert()` callsites in secondary screens.
