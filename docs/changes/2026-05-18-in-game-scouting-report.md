# In-Game Scouting Report for the Current Hitter

- **Date:** 2026-05-18
- **Type:** `feat`
- **Commit SHA:** _pending_
- **Version bumps:** `@pitch-tracker/web` 1.17.0 → 1.18.0, `mobile` 2.6.0 → 2.7.0 (`app.json` expo.version 1.98.0 → 1.99.0).

## Context

The coach wanted, during pitch calling, a quick way to pull up the scouting
report for the current hitter — and asked whether opponent rosters could be
imported from Perfect Game or GameChanger to build those reports.

**External integration is a dead end.** Neither service offers a usable API:
GameChanger has no public API (only CSV/PDF export of _your own_ team's data);
Perfect Game has no developer API. So scouting reports stay manually entered.

**The in-game feature was almost entirely already built:**

- Mobile already had a "Hitter" button opening `HitterTendenciesModal` (scouting
  report + live tendencies).
- Web's `HitterTendenciesPanel` was a complete component — but **no button ever
  opened it** (`setShowHitterTendencies(true)` was never called).

**Critical finding.** Both `getLiveMatch` and `getByGameId` resolve the report
with `WHERE scouting_reports.game_id = $1`, but the report-editor UI only set
`opponent_name` / `game_date` — **nothing ever set `game_id`**. So the in-game
scouting section was _always empty_: wiring the web button alone would surface
nothing. The report-to-game link had to be fixed for the feature to work at all.

## Plan (Decisions)

- **Part A — wire the web button.** Add a button to open the already-built
  `HitterTendenciesPanel` during a live game. No new component needed.
- **Part B — mobile parity.** Add the pre-game `zone_weakness` display to mobile's
  `HitterTendenciesModal`, matching the compact summary web already renders.
- **Part C — entry-flow fix (makes A & B actually work).**
    - C1: a "Linked game" picker in the scouting-report editor (web + mobile)
      that sets `scouting_reports.game_id` via the existing `update` endpoint.
    - C2: wire the already-built but UI-less `import-lineup` endpoint so a coach
      can bulk-pull a prior game's starting opponent lineup into a report.
- **No API or shared changes** — `getLiveMatch`, `update` (accepts `game_id`),
  and `importFromGameLineup` all already existed.
- Deferred (reviewed, out of scope): custom pitch vulnerabilities, zone-weakness
  editor redesign, opponent-roster reuse/pre-fill, discoverability.

## What shipped

### `packages/web` (1.17.0 → 1.18.0)

- `pages/LiveGame/LiveGame.tsx` — added a "🎯 Hitter" `SwapButton` in the TopBar
  (next to "🪧 Batter Breakdown"), gated on `gameId && currentBatter`, opening
  the existing `HitterTendenciesPanel` via `setShowHitterTendencies(true)`.
- `state/games/api/gamesApi.ts` — added `getGamesByTeam(teamId)` →
  `GET /games/team/:teamId`.
- `pages/ScoutingReport/ScoutingReport.tsx` — loads the team's games; added a
  **Linked game** `<Select>` in Report Details (saves `game_id` with the
  existing "Save details"); added an **Import batters from a past game** control
  (game `<select>` + button) calling `scoutingReportService.importLineup`.

### `packages/mobile` (2.6.0 → 2.7.0)

- `src/components/live/TendenciesModals/HitterTendenciesModal.tsx` — the scouting
  box now also renders the pre-game `zone_weakness` summary (parity with web).
- `src/state/games/api/gamesApi.ts` — added `getGamesByTeam(teamId)`.
- `src/state/scouting/api/scoutingReportsApi.ts` — added the `importLineup`
  client method (web already had it).
- `app/team/[id]/scouting/[reportId].tsx` — loads the team's games; added a
  **Linked game** `Menu` picker in Report details (saves `game_id`); added an
  **Import batters from a past game** `Menu` in the batters card.

### `packages/shared` / `packages/api`

- No changes.

## Verification

- **Pre-commit gate:** prettier, ESLint (web) clean, `tsc` green web + mobile,
  mobile jest 12/12.
- **End-to-end:**
    1. Open a scouting report → set a **Linked game** → Save details.
    2. **Import batters from a past game** → that game's starters appear.
    3. Give a batter (whose name matches a hitter in the linked game's opponent
       lineup) notes / pitch vulnerabilities / zone weaknesses.
    4. Start the linked game; select that batter as the current hitter.
    5. **Web:** the "🎯 Hitter" button opens `HitterTendenciesPanel`; the
       "📋 Scouting Report" section shows the batter's intel.
    6. **Mobile:** the "Hitter" button opens the modal; the scouting box now
       also shows the zone-weakness summary.
    7. Negative: a game with no linked report → modal opens, scouting section
       absent, live-tendencies section still works.

## Out of scope (deferred)

- **External PG / GameChanger import** — not feasible (no public API).
- **Custom pitch vulnerabilities** — only 8 hardcoded tags today.
- **Zone-weakness editor** — 9 individual click-cycles per batter, no preview.
- **Opponent-roster reuse** — the report flow doesn't pre-fill batters from the
  separate `batter_scouting_profiles` opponent roster.
- **Discoverability** — scouting reports remain reachable only from the
  team-detail header.
