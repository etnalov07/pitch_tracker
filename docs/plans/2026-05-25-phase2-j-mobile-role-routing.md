# Plan — Phase 2 J: Mobile role routing

**Status:** Shipped
**Phase:** UX Audit Phase 2 — Item J
**Findings addressed:** `UX-DB-10`
**Change doc:** [`docs/changes/2026-05-25-phase2-j-mobile-role-routing.md`](../changes/2026-05-25-phase2-j-mobile-role-routing.md)

## Context

Web has a `Dashboard` shell at `packages/web/src/pages/Dashboard/Dashboard.tsx` that picks `PlayerDashboard` / `OrgDashboard` / `CoachDashboard` based on `user.registration_type`. Mobile's `app/(tabs)/index.tsx` skipped that branch entirely — every user, including players, saw the coach-shaped game-management dashboard (games list, FAB to start a new game, etc.) which they have no use for.

Audit finding `UX-DB-10`: "Player-role mobile users see a coach-shaped dashboard."

## Approach

Mirror web's router pattern in mobile's `(tabs)/index.tsx`. When `user.registration_type === 'player'`, render a new `<PlayerDashboardScreen>` (port of the web `PlayerDashboard`). Everything else (`coach`, `org_admin`, NULL) falls through to the existing coach-shaped dashboard so no existing user is disturbed.

`org_admin` could also benefit from a dedicated dashboard view, but mobile has no `OrgDashboard` screen yet (deferred from the org-readonly batch). Falling through to coach view is the safe default; the existing `View Organization` entry (when that ships) reaches the org tools.

## Scope — files touched

### packages/mobile (v2.22.1 → v2.23.0)

- **NEW** `src/state/players/api/playersApi.ts` — wraps `GET /players/me` and `GET /players/me/stats?team_id=...`. Mirrors `packages/web/src/services/playerService.ts` shape. Exports `MyPlayerRecord = Player & { team_name? }`.
- **NEW** `src/components/playerDashboard/PlayerDashboardScreen.tsx` — port of web `PlayerDashboard`. Team-chip switcher when the user is on multiple teams, batting + pitching aggregate cards, recent-games rows. Pull-to-refresh.
- **NEW** `src/components/playerDashboard/index.ts` — barrel export.
- **MODIFIED** `app/(tabs)/index.tsx` — when `user.registration_type === 'player'`, return `<PlayerDashboardScreen />`. Otherwise existing flow.

### packages/api / packages/web / packages/shared

No changes. The API endpoints `GET /players/me` and `GET /players/me/stats` already exist (used by the web player dashboard).

## Verification

- `cd packages/mobile && npx tsc --noEmit` clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Manual: sign in as a user with `registration_type='player'` → mobile dashboard renders team chips, batting/pitching aggregates, recent games. No game-management FAB. Sign in as a coach (or NULL) → unchanged coach view.

## Out of scope (deferred)

- Mobile `OrgDashboard` screen — `org_admin` users still see the coach view on mobile. Worth a dedicated screen + route in a follow-up, with the read-only team-view entry alongside it.
- Player-side actions on mobile (request team invite, paste invite link) — the "no team yet" empty state links to `/join-team` which already exists.
- Tab-bar pruning for players (the existing tabs include team-management surfaces players shouldn't need). Defer; player can ignore those tabs without harm.
- Bumping `packages/shared`'s version (per memory: never bump shared).
