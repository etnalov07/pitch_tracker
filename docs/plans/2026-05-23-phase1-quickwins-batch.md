# Phase 1 Quick Wins — Batch 2 (escape modals, pitch count, web tendencies, pitcher selector parity)

**Status:** Approved · in progress
**Phase:** UX Audit Phase 1, items #3, #6, #7, #8
**Findings addressed:** `UX-LG-13`, `UX-PB-01`, `UX-IP-01`, `UX-TD-01`, `UX-PB-02`

---

## Context

After the Snackbar foundation (Phase 1 item #1) landed, the audit's "tight Phase 1 quick wins" bundle still has nine more items. This PR knocks out four S-effort items that don't need any API or schema changes — together they fix two known "stuck modal" bugs, plug a parity gap that hides a shipped feature on web, surface critical in-game info (pitch count) that's been missing on phone, and align mobile + web pitcher selection.

Bigger items in the bundle (#2 Fix Last Pitch, #5 smart defaults, #9 zone-tap cleanup, #10 date pickers, #4 home/away recovery) need their own focused PRs because they require new API endpoints, new components, or design decisions on score-flip semantics.

---

## Plan (Decisions)

### `UX-PB-01` · `TeamAtBatModal` escapable

Add an `onDismiss` prop wired to `setShowTeamAtBat(false)` and a "Cancel" button alongside "Continue". The auto-open `useEffect` re-fires only when inning state changes, so dismissing for the current half is safe — the modal will pop again next half if the user is still batting.

### `UX-IP-01` · `InningChangeModal` escapable

Trickier: this modal fires after the 3rd out is recorded, and `setCurrentOuts(0)` has already run locally. The server still has the old inning. If the user dismisses without confirming, the next pitch would log to the wrong inning.

**Decision:** dismissing the modal calls `advanceInningWithRuns(0)` — semantically "advance with 0 runs this half". This keeps client and server consistent and matches the most common case (no runs scored). The "Next Half Inning" button remains for when runs need to be entered. Backdrop-tap and Esc-gesture both advance with 0 runs.

### `UX-TD-01` · Web Pitcher Tendencies button

Web `LiveGame.tsx` already renders `<PitcherTendenciesPanel>` conditionally on `showPitcherTendencies`, but nothing sets it to true — dead-code path that hides a shipped feature from web coaches.

Add a `📊 Pitcher` `SwapButton` in the TopBar immediately after `🎯 Hitter`. Gate visibility the same way as the mobile button: only show when `currentPitcher` exists, scouting mode is off, and we're not in `opp_pitcher` charting mode. (Tendencies for the *opposing* pitcher would need a different data source; defer to a follow-up.)

### `UX-LG-13` · Pitch count in live header

Coaches need this for pitch-count rules. Currently the tablet has a `Total Pitches: ${pitches.length}` line in a stats panel, but it shows the per-at-bat count and the label lies. Phone has nothing.

**Decision:** show the cumulative game-pitch-count for the current pitcher in the `GameHeader` `pitcherGroup`, rendered as a small pill `47 PC` next to the existing "Stats" pill. Data source: `gamesApi.getPitcherGameStats(pitcherId, gameId)` — already exists. Refresh on `statsRefreshTrigger` (incremented after each logged pitch). Gate on `gameMode !== 'opp_pitcher'` and not scouting (we don't track own pitcher count in those modes).

This replaces the tablet stats panel's misleading `pitches.length` display as a side-effect — but leaving the tablet panel intact for now since rewriting it is its own item.

### `UX-PB-02` · Pitcher selector parity

Web filters roster to `position='P'` via `getTeamPitchers`; mobile shows the full team roster. The web filter blocks the emergency-relief case (a position player has to pitch); the mobile approach pollutes the list.

**Decision:** align both to "full roster, sorted with `primary_position === 'P'` first, then alphabetical by last name". Adds a new `gamesApi.getTeamPlayers(teamId)` method on web that calls the existing `/players/team/:team_id` endpoint (no new API surface needed — already in `player.routes.ts`).

---

## Scope — files touched

### packages/mobile (v2.8.0 → 2.9.0)

- MODIFIED: `src/components/live/TeamAtBatModal/TeamAtBatModal.tsx` — add `onDismiss` prop; render Cancel button in a button row.
- MODIFIED: `src/components/live/InningChangeModal/InningChangeModal.tsx` — add `onDismiss` prop wired to caller.
- MODIFIED: `src/components/live/GameHeader/GameHeader.tsx` — add `pitcherGamePitchCount` prop + pill rendering in `pitcherGroup`.
- MODIFIED: `src/components/live/PitcherSelectorModal/PitcherSelectorModal.tsx` — sort `teamPlayers` so `primary_position === 'P'` comes first, then alphabetical.
- MODIFIED: `app/game/[id]/live.tsx`:
  - Pass `onDismiss={() => setShowTeamAtBat(false)}` to `<TeamAtBatModal>`.
  - Pass `onDismiss={() => advanceInningWithRuns(0)}` to `<InningChangeModal>`.
  - New `pitcherGamePitchCount` state + `useEffect` that fetches via `gamesApi.getPitcherGameStats` on pitcher change / `statsRefreshTrigger`.
  - Pass `pitcherGamePitchCount` to `<GameHeader>`.
- MODIFIED: `package.json` — version bump.

### packages/web (v1.19.0 → 1.20.0)

- MODIFIED: `src/state/games/api/gamesApi.ts` — add `getTeamPlayers(teamId)` method.
- MODIFIED: `src/components/game/PitcherSelector/PitcherSelector.tsx` — switch from `getTeamPitchers` to `getTeamPlayers`; sort pitchers (primary_position='P') first.
- MODIFIED: `src/pages/LiveGame/LiveGame.tsx` — add `📊 Pitcher` button in TopBar.
- MODIFIED: `package.json` — version bump.

### packages/shared

No changes.

### packages/api

No changes — `/players/team/:team_id` already exists.

---

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/web && npx tsc --noEmit` — clean.
- `cd packages/web && npx eslint src/...` — clean.
- `cd packages/mobile && npm test` — all tests pass.
- Prettier on touched files.

**Smoke (manual):**
- Mobile: trigger TeamAtBatModal (user-team batting in visitor game) → tap outside modal → modal closes. Re-open works.
- Mobile: trigger InningChangeModal (record 3rd out) → tap outside → inning advances with 0 runs.
- Mobile: live game header shows `0 PC` initially, increments as pitches are logged. Disappears when switching to `opp_pitcher` mode.
- Mobile: Pitcher selector shows pitchers grouped at the top of "Available", position players below.
- Web: LiveGame TopBar shows `📊 Pitcher` button next to `🎯 Hitter` (when current pitcher exists in our_pitcher / both modes). Click opens `PitcherTendenciesPanel`.
- Web: PitcherSelector now lists all roster players, pitchers at top.

---

## Out of scope (deferred to later Phase 1 PRs)

- Item #2 (Fix Last Pitch — result-only edit) — needs new `PATCH /pitches/:id` API.
- Item #5 (Smart defaults from last game) — needs new API query for most-recent game.
- Item #10 (Real date/time pickers on mobile new-game) — needs new picker component.
- Item #9 (Zone-tap UX cleanup) — needs StrikeZone redesign discussion.
- Item #4 (`is_home_game` recoverable) — needs to think through score-flip semantics.
- Phase 1b — the remaining ~50 `Alert.alert`/`alert()` callsites in secondary screens.
