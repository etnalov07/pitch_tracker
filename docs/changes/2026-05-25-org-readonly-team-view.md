# Org-scoped read-only team view · 2026-05-25

**Type:** `feat`
**Commit:** _(pending)_
**Versions:** `shared@1.0.0 (unchanged)` · `api@1.18.3 → 1.19.0` · `web@1.25.3 → 1.26.0` · `mobile@2.21.2 → 2.22.0`

## Context

Coaches who belong to an organization should be able to see other teams in that same org — read-only. They can browse rosters, view per-player Performance Reports, etc., but can't add/edit/delete players or change team settings. Before this commit:

- The `organizations` + `organization_members` + `teams.organization_id` tables already existed.
- The existing `GET /organizations/:org_id/teams` endpoint already listed all teams in an org (gated by `requireOrgMember`).
- `OrgDashboard` (web) already rendered all org teams with `canManage` gating writes for non-owner/admin roles.
- **But** team-scoped READ endpoints (`GET /teams/:id`, `GET /teams/:id/players`) had no auth gate at all, and the UI had no way of telling whether the calling user was a team member or "just" an org sibling — so writes weren't gated at the UI level.

## Plan (Decisions)

User confirmed:
1. **Full read** — everything but writes (rosters, downstream pitcher reports). Live charting / bullpens / scouting deferred.
2. **Hidden behind an org switcher** — dedicated `/organization` page lists all teams in the org; click a team for read-only detail.

Approach:

- New `TeamAccessLevel` ('owner' / 'member' / 'org_view' / 'none') tells the UI how to render.
- New `requireTeamReadAccess` middleware on team-scoped READ endpoints: passes for team members AND org members; rejects everyone else.
- `GET /teams/:id` and `GET /teams/:id/players` now echo back `access_level` so the client can gate write affordances.
- Write endpoints (PUT/DELETE team, PUT colors, etc.) are untouched — still locked to team members. Org coach hitting a write would 403 even if they bypassed the UI.
- `/organization` route on web reuses the existing `OrgDashboard` — any org member can hit it now, not just users registered as `org_admin`.

## What shipped

### packages/shared (no version bump — pinned at 1.0.0)

- `src/index.ts`: new exports `TeamAccessLevel` and `TeamAccessEnvelope`.

### packages/api (v1.19.0)

- `src/types/index.ts`: `RoleAwareRequest.teamAccessLevel?: TeamAccessLevel` so controllers can echo the level.
- `src/middleware/roles.ts`:
  - **NEW** `getTeamAccessLevel(userId, teamId, req?)` — resolves owner / member / org_view / none. Uses preloaded roles when present; falls back to direct DB lookups otherwise.
  - **NEW** `requireTeamReadAccess` middleware — passes for team members OR org members; sets `req.teamAccessLevel` for the downstream controller.
- `src/routes/team.routes.ts`: gate `GET /:id` and `GET /:id/players` with `requireTeamReadAccess` (closes prior backdoor where any authenticated user could read any team's data).
- `src/controllers/team.controller.ts`: `getTeamById` and `getTeamWithPlayers` echo `access_level` on the response.

### packages/web (v1.26.0)

- `src/services/teamService.ts`: `getTeamById` unwraps the new `{ team, access_level }` shape; added `getTeamWithAccess` for direct level access.
- `src/state/teams/api/teamsApi.ts`: same shape change for the Redux thunk's API layer.
- `src/state/teams/teamsSlice.ts`: new `selectedTeamAccessLevel: TeamAccessLevel | null` field on the slice; populated by `fetchTeamById.fulfilled`; cleared by `clearSelectedTeam`.
- `src/pages/TeamDetail/useTeamDetail.ts`: derives `readOnly = selectedTeamAccessLevel === 'org_view'`; exported.
- `src/pages/TeamDetail/TeamDetail.tsx`: read-only banner above the content; Settings / Invite / Import Roster / Add Player buttons hidden in read-only mode; `JoinRequestsPanel` + `PlayerForm` hidden too. Bullpen / Opponents / Scouting buttons stay (read entry points).
- `src/pages/TeamDetail/RosterTable.tsx`: new `readOnly?` prop; hides Edit + Remove + empty-state Add CTA. Profile + Report buttons unchanged.
- `src/pages/Teams/Teams.tsx`: fires `organizationService.listMine()` on mount; shows a "View Organization →" button in the header when the user belongs to any org.
- `src/App.tsx`: new route `/organization` rendering the existing `OrgDashboard` (any authenticated user with an org membership).

### packages/mobile (v2.22.0)

- `src/state/teams/api/teamsApi.ts`: same `{ team, access_level }` unwrap on `getTeamById`.
- `src/state/teams/teamsSlice.ts`: same `selectedTeamAccessLevel` field + reducer wiring.
- `app/team/[id]/index.tsx`: derives `readOnly`; renders a view-only banner card; hides the FAB ("Add Player") and the empty-state Add Player CTA in read-only mode.
- `src/components/team/PlayerListItem.tsx`: new `readOnly?` prop; hides Edit + Delete icon buttons. Performance Report icon still shows for players with pitch data.

### docs/changes

- This doc + index row in `docs/changes/README.md`.

## Verification

1. **Migration**: none — schema unchanged.
2. **Shared rebuild**: `cd packages/shared && npm run build` clean.
3. **Type checks**: `tsc --noEmit` clean in api / web / mobile.
4. **Web ESLint**: clean.
5. **Mobile Jest**: 12/12 pass.
6. **End-to-end (web)**:
   - Sign in as a user who's an org member but NOT on team X. From `/teams`, click "View Organization →" to land on `/organization`, see team X listed, click it.
   - Confirm `/teams/X` shows the view-only banner; Settings / Invite / Import / Add Player are hidden; roster Edit / Remove are hidden; Profile + Report buttons still work.
   - Try a write directly (e.g., hand-craft a `PUT /teams/X`) → 403.
7. **End-to-end (mobile)**: navigate to the same team on mobile — banner appears, FAB is hidden, PlayerListItem shows no edit/delete icons. Performance Report icon still navigates correctly.
8. **Regression**: own teams (access_level='owner' or 'member') still show all write affordances; non-org / non-member users get 403 on `GET /teams/:id` (previously 200 — small surface tighten worth flagging).

## Out of scope (deferred)

- **Mobile `/organization` entry point** — no dedicated screen yet; mobile read-only mode triggers only when an org-scoped link is followed (e.g. deep link, web→mobile handoff). Build the mobile screen mirroring `OrgDashboard` when needed.
- **Live charting / bullpen / scouting read access** — those routes have their own auth surfaces and weren't part of v1. Org members can navigate to the read entry points but the underlying screens may still apply tighter gates.
- **Per-game read access** — `GET /games/:id` and `/analytics/...` weren't gated on `requireTeamReadAccess`. Many were wide-open pre-existing; this commit doesn't close those gaps. Future audit.
- **Read-only PitcherProfile / PitcherReport** — those pages don't write today, so they already function for org viewers. No extra gating needed.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
