# Phase 2 J — Mobile role routing · 2026-05-25

**Type:** `feat`
**Commit:** _(pending)_
**Versions:** `mobile@2.22.1 → 2.23.0`

## Context

Audit finding `UX-DB-10`: player-role mobile users were seeing the coach-shaped game-management dashboard (games list, FAB to start a new game, etc.) instead of a player-focused view. Web already routes on `user.registration_type` to `PlayerDashboard` / `OrgDashboard` / `CoachDashboard`; mobile's `(tabs)/index.tsx` skipped that branch entirely.

Full plan: [`docs/plans/2026-05-25-phase2-j-mobile-role-routing.md`](../plans/2026-05-25-phase2-j-mobile-role-routing.md).

## Plan (Decisions)

Mirror web's router pattern in mobile's `(tabs)/index.tsx`. When `user.registration_type === 'player'`, render the new `<PlayerDashboardScreen>`; otherwise fall through to the existing coach view (so `coach`, `org_admin`, and NULL all land where they did before).

`org_admin` will get a dedicated mobile view in a follow-up — mobile has no `OrgDashboard` screen yet.

## What shipped

### packages/mobile (v2.23.0)

- **NEW** `src/state/players/api/playersApi.ts` — `getMyPlayers()` + `getMyStats(teamId)` wrapping the existing API endpoints. Exports `MyPlayerRecord = Player & { team_name? }`. Shape mirrors web's `playerService` exactly.
- **NEW** `src/components/playerDashboard/PlayerDashboardScreen.tsx` — port of `packages/web/src/pages/PlayerDashboard/PlayerDashboard.tsx`:
  - Team chip-switcher when the user is on multiple teams.
  - Batting aggregate card (AVG / G / AB / H / RBI / R / BB / K).
  - Pitching aggregate card (K% / G / BF / P / Strikes / Balls).
  - Recent-games list with opponent, batting line, pitching line, result.
  - Pull-to-refresh.
  - Empty state when the user has no team yet — links to `/join-team`.
- **NEW** `src/components/playerDashboard/index.ts` — barrel export.
- **MODIFIED** `app/(tabs)/index.tsx` — single conditional at the top of `DashboardScreen`: if `user.registration_type === 'player'` return `<PlayerDashboardScreen />`, else continue to the existing coach-shaped view. Two lines added; zero behavior change for non-player users.
- **MODIFIED** `package.json` — version bump.

### packages/api / packages/web / packages/shared

No changes. The two API endpoints (`GET /players/me`, `GET /players/me/stats`) already exist — they back the web player dashboard.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Manual: sign in as a player → mobile dashboard renders the player view. Sign in as a coach or NULL registration_type → unchanged coach view.

## Out of scope (deferred)

- Mobile `OrgDashboard` screen — `org_admin` users still get the coach view on mobile.
- Player-side actions (request invite, etc.) beyond the existing `/join-team` link.
- Tab-bar pruning for players — the existing tabs include team-management surfaces players don't need; defer pruning until a player actually complains.
- Bumping `packages/shared`'s version (per memory: never bump shared).

## Phase 2 status after this batch

| Item | Title | Status |
|---|---|---|
| A | Design tokens | Shipped |
| B | Pitch calling consolidation | Pending (biggest) |
| C | Live screen refactor | Shipped |
| D | New Game flow alignment | Pending (needs user input) |
| E | In-play modal cleanup | Pending |
| F | Tendencies side-by-side (tablet) | Pending |
| G | Snackbar lib eval | Closed |
| H | Scoreboard aesthetic | Declined |
| I | Bullpen feature parity | Pending |
| **J** | **Mobile role routing** | **Shipped** |
| K | Heat-zone parity | Shipped |
