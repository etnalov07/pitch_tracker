# Org Admin Mode + Org-Aware Team List — Slice 3

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `3ebdb93`
- **Version bumps:** `@pitch-tracker/web` 1.8.0 → 1.9.0. Shared, API, mobile not bumped (no changes).
- **Plan reference:** [docs/plans/2026-05-10-super-user-and-signup-modes.md](../plans/2026-05-10-super-user-and-signup-modes.md)

## Context

Slice 1 shipped Super User; slice 2 wired `registration_type` and Player mode,
landing direct `org_admin` signups on a "coming soon" stub. Slice 3 closes that
gap: it builds the real Org Admin experience — org creation onboarding, an
OrgDashboard for managing teams and members, and the travel-ball coach
inference from Open Question #1.

The slice was gated in the plan on "first travel-ball customer on deck." It is
being built now to retire the stub and complete the three-signup-modes story.

## Plan (Decisions)

- **Backend was already done.** The organization routes, controller, service,
  `requireOrgRole` / `requireOrgMember` middleware, the `organizations` /
  `organization_members` tables, and `GET /organizations/:org_id/teams` all
  shipped in earlier work (migration `002_roles_orgs_invites.sql`). Org
  creation already auto-inserts the creator's `owner` membership row, and
  `POST /teams` already accepts `organization_id`. **Slice 3 is web-only** — no
  shared, API, or mobile changes.
- **Deviation from the plan's C3 gate.** The plan specified
  `GET /organizations/:id/teams` gated by `requireOrgRole('owner','admin')`.
  The existing endpoint is gated by `requireOrgMember` (any member). Since the
  org `coach` role is unused in v1 (per Open Question #7), every member is in
  practice an owner/admin — functionally identical. Left as-is rather than
  touching the API package.
- **No separate `/org` route.** The plan sketched `/onboarding/org` + a
  distinct `/org` route. Mirroring slice 2's Player-mode pattern, the Dashboard
  switcher renders `<OrgDashboard/>` directly for `registration_type ==='org_admin'`.
  `OrgDashboard` handles the "no org yet" state with an empty-state CTA to
  `/onboarding/org`, so the org admin never needs a router-enforced redirect.
- **Travel-ball inference (Open Question #1) is membership-based, no new column.**
  `CoachDashboard` fetches the user's org memberships and hides the "New Team"
  quick action when the coach is rostered on an org-linked team but is not an
  owner/admin of any org. Solo coaches and hybrids keep the affordance.
- **OrgDashboard scope.** Three tabs — Teams (list + create into the org),
  Members (list / add by email / remove), Settings (rename). Owner-only
  self-destruct actions (transfer ownership, delete org, demote admins) are
  deferred; the server already blocks removing the last owner.
- **Audit logging on org mutations deferred.** The plan's shared `admin_audit`
  table is wired for Super User actions only. Org-scoped mutation auditing is
  left for a follow-up to keep this slice web-only.

## What shipped

### `packages/shared`, `packages/api`, `packages/mobile`

- No changes. All org backend plumbing pre-existed.

### `packages/web` (1.8.0 → 1.9.0)

- **New `src/services/organizationService.ts`** — wraps the existing org
  endpoints: `listMine` (`GET /organizations`), `create` (`POST /organizations`),
  `getWithTeams`, `getTeams` (`GET /organizations/:id/teams`), `getMembers`,
  `addMember`, `removeMember`, `rename` (`PUT /organizations/:id`). Exports
  `MyOrganization` (org + caller `user_role`) and `OrgTeam` (team + `player_count`).
- **New `src/pages/Onboarding/OrgCreate.tsx`** — single-field "Name your
  organization" page. Submits to `organizationService.create`, redirects to `/`
  on success. `src/pages/Onboarding/index.ts` updated to export it.
- **New `src/pages/OrgDashboard/`** (`OrgDashboard.tsx`, `styles.ts`, `index.ts`):
    - Loads the user's orgs on mount; empty → empty-state CTA to `/onboarding/org`.
    - Multi-org switcher in the header when the user belongs to more than one org.
    - Teams tab: grid of org teams (each links to the existing team detail page),
      plus a create-team inline form posting to `POST /teams` with the org id.
    - Members tab: member list with role badges; add-member-by-email form with
      an admin/coach role select; remove-member action. The current user's own
      row has no remove button.
    - Settings tab: organization rename.
    - Mutating affordances are gated client-side on `canManage` (owner/admin);
      the API enforces authority regardless.
- **`src/pages/Dashboard/Dashboard.tsx`** — switcher now renders the real
  `OrgDashboard` for `registration_type === 'org_admin'`; the `OrgAdminStub`
  placeholder was removed.
- **`src/pages/Dashboard/CoachDashboard.tsx`** — fetches org memberships on
  mount; derives `canCreateTeam` (false only for a travel-ball coach: rostered
  on an org-linked team and not an org owner/admin) and conditionally renders
  the "New Team" quick action.
- **`src/App.tsx`** — new `/onboarding/org` protected route → `OrgCreate`.

### `docs`

- This change doc + README index row.

## Verification

### Local setup

1. No migration needed — `002_roles_orgs_invites.sql` already created the org tables.
2. Rebuild shared if it has stale `dist/` (`cd packages/shared && npm run build`).
3. Start api + web.

### Smoke test — org creation

1. Sign up with "Org Admin" selected. Land on the OrgDashboard "No organization yet" empty state.
2. Click "Create Organization" → `/onboarding/org`, enter a name, submit.
3. Land back on `/` → OrgDashboard renders with the org name in the header.

### Smoke test — teams

1. On the Teams tab, create a team. It appears in the grid with a 0-player count.
2. Click the team card → existing team detail page opens; roster management works.

### Smoke test — members

1. On the Members tab, add an existing user by email as `admin`. Row appears with an ADMIN badge.
2. Remove that member → row disappears. Removing the last owner is rejected by the server.

### Smoke test — settings

1. On the Settings tab, rename the org → header updates.

### Smoke test — travel-ball coach inference

1. As an org admin, create a team in the org and invite a coach (new or existing) onto it.
2. Sign in as that coach: their dashboard is the CoachDashboard, and the "New Team" quick action is hidden (rostered on an org-linked team, not an org owner/admin).
3. A solo coach (no org-linked team) and a hybrid (org owner/admin) still see "New Team".

## Out of scope (deferred)

- **Owner-only self-destruct actions** — transfer ownership, delete organization,
  demote/promote admins. The Settings tab ships rename only.
- **Audit logging for org-scoped mutations** — `admin_audit` currently captures
  Super User actions only; org owner/admin mutations are not yet recorded.
- **Mobile org-admin dashboard** — plan defers mobile to a later phase.
- **Tightening `GET /organizations/:id/teams` to `requireOrgRole('owner','admin')`** —
  left at `requireOrgMember`; equivalent in v1 since the org `coach` role is unused.
- **Org-scoped invite flows** — inviting coaches is done today via the existing
  per-team invite UI reached by drilling into a team; no org-level invite screen.
- **Sub-varsity / program grouping for solo coaches.** A solo HS or college
  coach (`registration_type='coach'`, no org above them) who runs multiple
  levels — Varsity / JV / Freshman, or a college Developmental squad — has
  those modeled as **flat sibling teams**: separate `teams` rows sharing an
  `owner_id`, all with `organization_id IS NULL`. There is no hierarchy
  primitive (no program/parent-team). The only grouping mechanism is an
  organization, and that is only reachable by signing up as `org_admin`; per
  Open Question #1 the plan deliberately did not force HS/college coaches into
  the org model. The gap: a solo coach has no in-app path to _opt into_
  grouping their existing teams under an umbrella (e.g. a "convert my teams to
  a program/organization" flow) without re-registering. Deferred to a future
  slice if sub-varsity grouping becomes a real customer ask.

## Known pre-existing gaps (unchanged from earlier slices)

- `packages/api/src/utils/__tests__/jwt.test.ts` — fails on clean checkout (missing DB env vars).
- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test surfaces in default `npm test`.
