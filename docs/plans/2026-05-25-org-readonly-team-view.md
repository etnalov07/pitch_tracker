# Plan — Org-Scoped Read-Only Team View

**Status:** Shipped · `2ef584f` · 2026-05-25
**Change doc:** [`docs/changes/2026-05-25-org-readonly-team-view.md`](../changes/2026-05-25-org-readonly-team-view.md)

## Context

Coaches who belong to an organization should be able to see other teams in that same org — read-only. Until now:

- `organizations` + `organization_members` + `teams.organization_id` tables already existed.
- `GET /organizations/:org_id/teams` already listed all teams in an org (gated by `requireOrgMember`).
- Web `OrgDashboard` already rendered org teams with `canManage` gating writes for non-owner/admin.
- **But**: team-scoped READ endpoints (`GET /teams/:id`, `GET /teams/:id/players`) had no auth gate at all, and the UI couldn't tell whether the caller was a team member or an org sibling — so writes weren't gated at the UI level even though the data leaked.

User confirmed (planning session via AskUserQuestion):
1. **Full read** — everything but writes (rosters, performance reports, etc.). Live charting / bullpens / scouting deferred to follow-ups.
2. **Hidden behind an org switcher** — dedicated `/organization` page lists all teams in the org; click into any team for read-only detail.

## Approach

Introduce a `TeamAccessLevel` ('owner' | 'member' | 'org_view' | 'none') as the single source of truth for "how can this user interact with this team."

- New `requireTeamReadAccess` middleware on team-scoped READ endpoints: passes for team members AND org members; rejects everyone else (closes the prior backdoor as a side benefit).
- READ responses echo back `access_level` so the client can gate UI without a second round-trip.
- Write endpoints stay locked to team members via the existing `requireTeamRole` — org coach hitting a write 403s server-side even if the UI is bypassed.
- `/organization` route on web reuses the existing `OrgDashboard` — any org member can hit it now, not just users registered as `org_admin`.

## Files modified

### packages/shared (rebuild required — do NOT bump version)

- `src/index.ts`: new exports `TeamAccessLevel` and `TeamAccessEnvelope`.

### packages/api (v1.18.3 → v1.19.0)

- `src/types/index.ts`: `RoleAwareRequest.teamAccessLevel?: TeamAccessLevel`.
- `src/middleware/roles.ts`:
  - NEW `getTeamAccessLevel(userId, teamId, req?)` — resolves owner / member / org_view / none using preloaded roles when present, falling back to DB.
  - NEW `requireTeamReadAccess` middleware.
- `src/routes/team.routes.ts`: gate `GET /:id` and `GET /:id/players` with `requireTeamReadAccess`.
- `src/controllers/team.controller.ts`: `getTeamById` and `getTeamWithPlayers` echo `access_level` on the response.

### packages/web (v1.25.3 → v1.26.0)

- `src/services/teamService.ts` + `src/state/teams/api/teamsApi.ts`: unwrap `{ team, access_level }` shape; added `getTeamWithAccess` helper.
- `src/state/teams/teamsSlice.ts`: new `selectedTeamAccessLevel: TeamAccessLevel | null`; populated by `fetchTeamById.fulfilled`; cleared by `clearSelectedTeam`.
- `src/pages/TeamDetail/useTeamDetail.ts`: derives + exports `readOnly`.
- `src/pages/TeamDetail/TeamDetail.tsx`: view-only banner; Settings / Invite / Import Roster / Add Player / JoinRequestsPanel / PlayerForm hidden in read-only. Bullpen / Opponents / Scouting stay as read entry points.
- `src/pages/TeamDetail/RosterTable.tsx`: new `readOnly?` prop; hides Edit + Remove + empty-state Add CTA. Profile + Report buttons unchanged.
- `src/pages/Teams/Teams.tsx`: fires `organizationService.listMine()` on mount; "View Organization →" header button when user has any org membership.
- `src/App.tsx`: new route `/organization` rendering the existing `OrgDashboard`.

### packages/mobile (v2.21.2 → v2.22.0)

- `src/state/teams/api/teamsApi.ts` + `src/state/teams/teamsSlice.ts`: same `{ team, access_level }` unwrap + `selectedTeamAccessLevel` field.
- `app/team/[id]/index.tsx`: derives `readOnly`; renders a view-only banner card; hides the FAB + empty-state Add Player CTA.
- `src/components/team/PlayerListItem.tsx`: new `readOnly?` prop; hides Edit + Delete icons. Performance Report icon still shows for players with pitch data.

## Verification

1. No migration; schema unchanged.
2. Shared rebuild + api/web/mobile `tsc --noEmit` clean.
3. Web ESLint + mobile Jest 12/12 pass.
4. Sign in as an org member who's NOT on team X → `/teams` shows "View Organization →" → click → `/organization` → see team X listed → click → view-only banner, writes hidden, Profile + Report buttons still navigate correctly.
5. Direct write attempt (e.g. `PUT /teams/X` via curl as the org sibling user) → 403.
6. Own teams (`'owner'` or `'member'`) still show full write affordances — regression check.

## Out of scope (deferred)

- **Mobile `/organization` entry screen** — no list-of-teams screen on mobile yet; read-only TeamDetail works via deep link / web→mobile handoff but no entry button.
- **Live game / bullpen / scouting read-access gating** — those routes have their own auth surfaces and weren't part of v1.
- **Per-game / analytics read-access gating** — many of those endpoints are pre-existing wide-open; not closed in this commit. Worth a separate security audit.
- **Read-only PitcherProfile / PitcherReport** — those pages don't write today, so they already function for org viewers.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
