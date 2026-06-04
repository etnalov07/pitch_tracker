# Roster "Profile" Button Available for All Players (web)

- **Date:** 2026-06-04
- **Type:** `fix`
- **Commit:** `6cdc7ac`
- **Versions:** `web` 1.35.0 → 1.36.0

## Context

On the web roster page (TeamDetail), the **Profile** button — which opens a player's pitcher
profile (where pitch types are configured and the report is reached) — only appeared for
players whose primary or secondary position was `P`. Coaches routinely put position players
on the mound, so a shortstop/center-fielder who pitches had no way to reach their pitcher
profile from the roster. The button needs to be available for every player.

## Plan (Decisions)

- **Always show Profile for every roster player**, rather than broadening the gate to e.g.
  `P || has_pitches`. The `has_pitches` route is already covered by the separate **Report**
  button; the Profile page is the *setup* surface, needed *before* a player has thrown a pitch
  in the app, so gating it on position or pitch history would still exclude the exact case
  reported (a non-`P` player a coach wants to start charting as a pitcher).
- **Web only.** The mobile roster (`PlayerListItem.tsx`) has no Profile button at all (only
  Report/Edit/Delete), so there is no parity gap to close.
- Left the LHP/RHP handedness label and the Pos column untouched — those legitimately reflect
  the position fields and weren't part of the report.

## What shipped

**web** (`packages/web`)

- `pages/TeamDetail/RosterTable.tsx`: removed the
  `player.primary_position === 'P' || player.secondary_position === 'P'` guard around the
  `ProfileButton` so it renders for every player. Added a comment explaining why it's
  unconditional. (`primary_position`/`secondary_position` are still used for the handedness
  label and the Pos column.)
- `package.json`: 1.35.0 → 1.36.0.

No `shared`/`api`/`mobile` change.

## Verification

- `cd packages/web && npx tsc --noEmit` clean; `npx eslint src/pages/TeamDetail/RosterTable.tsx` → 0 warnings; prettier clean.
- **Manual:** open a team's roster with a non-pitcher (e.g. primary `SS`, no `P` secondary) →
  the **Profile** button now appears on that row → clicking it opens `/teams/:teamId/pitcher/:playerId`.
  Players already at `P` are unaffected (still show Profile + Report as before).

## Out of scope (deferred)

- Mobile — no Profile affordance exists on the mobile roster to bring to parity; adding one
  would be a separate feature.
- Changing the **Report** button gate (`has_pitches`) — unchanged; a report still requires
  logged pitches to be meaningful.
