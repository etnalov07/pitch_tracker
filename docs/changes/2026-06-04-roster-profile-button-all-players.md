# Roster "Profile" Button Available for All Players (web)

- **Date:** 2026-06-04
- **Type:** `fix`
- **Commit:** `6cdc7ac` → _(follow-up: dashboard surface)_
- **Versions:** `web` 1.35.0 → 1.37.0

## Context

The **Profile** button — which opens a player's pitcher profile (where pitch types are
configured and the report is reached) — only appeared for players listed at `P`. Coaches
routinely put position players on the mound, so a shortstop/center-fielder who pitches had no
way to reach their pitcher profile. The button needs to be available for every player. There
are **two** roster surfaces on web that render this button:

1. The **team roster** on the TeamDetail page (`RosterTable.tsx`) — gated on `primary === 'P' || secondary === 'P'`.
2. The **Teams Roster on the main dashboard** (`CoachDashboard.tsx`) — gated on `primary === 'P'` only (even narrower). _Missed in the first pass; fixed as a follow-up._

## Plan (Decisions)

- **Always show Profile for every roster player**, rather than broadening the gate to e.g.
  `P || has_pitches`. The `has_pitches` route is already covered by the separate **Report**
  button; the Profile page is the *setup* surface, needed *before* a player has thrown a pitch
  in the app, so gating it on position or pitch history would still exclude the exact case
  reported (a non-`P` player a coach wants to start charting as a pitcher).
- **Both web roster surfaces** must be fixed — the TeamDetail roster table and the dashboard's
  Teams Roster card. On the dashboard, the LHP/RHP handedness badge was bundled in the same
  `primary === 'P'` gate; it's split out so the badge still only shows for pitchers (now
  `primary || secondary === 'P'`, matching the roster table) while Profile is unconditional.
- **Web only.** The mobile roster (`PlayerListItem.tsx`) has no Profile button at all (only
  Report/Edit/Delete), so there is no parity gap to close.
- Left the LHP/RHP handedness label and the Pos column untouched — those legitimately reflect
  the position fields and weren't part of the report.

## What shipped

**web** (`packages/web`)

- `pages/TeamDetail/RosterTable.tsx` (`6cdc7ac`): removed the
  `player.primary_position === 'P' || player.secondary_position === 'P'` guard around the
  `ProfileButton` so it renders for every player. (`primary_position`/`secondary_position` are
  still used for the handedness label and the Pos column.)
- `pages/Dashboard/CoachDashboard.tsx` (follow-up): the dashboard Teams Roster card gated both
  the LHP/RHP badge and the Profile button under `primary_position === 'P'`. Split them — the
  handedness badge now shows for `primary || secondary === 'P'` (parity with the roster table),
  and the Profile button is unconditional.
- `package.json`: 1.35.0 → 1.37.0 (1.36.0 was the first commit; 1.37.0 the follow-up).

No `shared`/`api`/`mobile` change.

## Verification

- `cd packages/web && npx tsc --noEmit` clean; `npx eslint src/pages/TeamDetail/RosterTable.tsx` → 0 warnings; prettier clean.
- **Manual (both surfaces):** with a non-pitcher (e.g. primary `SS`, no `P` secondary):
  - TeamDetail roster table → the **Profile** button appears on that row.
  - Main dashboard → the team's **Teams Roster** card → the **Profile** button appears on that row.
  - Both open `/teams/:teamId/pitcher/:playerId`. Players at `P` are unaffected; on the dashboard
    the LHP/RHP badge still only shows for pitchers.

## Out of scope (deferred)

- Mobile — no Profile affordance exists on the mobile roster to bring to parity; adding one
  would be a separate feature.
- Changing the **Report** button gate (`has_pitches`) — unchanged; a report still requires
  logged pitches to be meaningful.
