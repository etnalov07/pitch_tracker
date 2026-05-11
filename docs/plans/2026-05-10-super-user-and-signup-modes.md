# Super User + Three Signup Modes (Coach / Player / Org Admin)

> **Status:** Draft. Approach is sketched end-to-end, but the Open Questions
> section lists real design forks that need explicit sign-off before slice 1
> ships.

## Decisions Confirmed (2026-05-10)

- **Build order:** Super User first (slice 1), with the small invite-authz fix bundled into the same slice. Then `registration_type` wiring + Player mode (slice 2). Then Org Admin mode + org-aware team list (slice 3, only when first travel-ball customer is on deck).
- **Org Admin onboarding:** Two-step. Signup creates the user only; they land on a separate "Name your organization" page. Drop-off after step one is acceptable.
- **Direct Player signup:** Lands on "Waiting for invite" screen with a single field to paste an invite link. Most players will arrive via invite-with-signup and skip this entirely.

## Context

Today the signup form on web and mobile asks "I am a..." with three options (Coach / Player / Org Admin), but the backend silently drops the choice — every user lands as an undifferentiated "coach" on the same dashboard. There is no Super User, no player-facing UI, and no org-aware admin view. The travel-ball use case (`Org Admin → Coaches → Players`) needs the org plumbing wired up; the HS/college use case (solo coach creates own team) must keep working unchanged.

**Hard constraint: zero impact on existing users.** Existing coaches, their orphaned teams, their rosters, their games must all behave exactly as they do today. Every change here is additive.

## Part A — Super User

### Marker

Env var allowlist: `SUPER_ADMIN_EMAILS=brian.volante@bvolante.com` (comma-separated). Read once at app boot. No DB column, no migration. Day we need a second super-admin or want the UI to grant it, we promote to a `users.is_super_admin` column.

### Backend

- New middleware `requireSuperAdmin` in `packages/api/src/middleware/auth.ts` (or sibling file): reads `req.user.email`, checks against the allowlist, 403s otherwise.
- New route namespace `app.use('/bt-api/admin', adminRoutes)` in `app.ts`.
- New `admin.routes.ts` / `admin.controller.ts` / `admin.service.ts`. Every route gated by `authenticateToken` + `requireSuperAdmin`.
- Endpoints (v1, all read-only except the four targeted actions):
    - `GET /admin/users` — list/search users (paginated)
    - `GET /admin/users/:id` — full user detail incl. team/org memberships, recent games
    - `GET /admin/orgs` — list organizations + member count + team count
    - `GET /admin/teams` — list all teams (orphaned + org-linked), filter by org
    - `GET /admin/games?team_id=&date_range=` — recent games across all teams
    - `POST /admin/users/:id/force-verify-email` — set `email_verified=true`
    - `POST /admin/users/:id/resend-verification` — re-issue token + send email
    - `POST /admin/games/:id/regenerate-narrative` — re-trigger narrative pipeline
    - `POST /admin/games/:id/soft-delete` — soft-delete a game (set `deleted_at`)

### Audit log

New migration `036_super_admin_audit.sql`:

```sql
CREATE TABLE super_admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    target_table VARCHAR(64),
    target_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT ON super_admin_audit TO bvolante_pitch_tracker;
```

Every mutation in `/admin/*` writes one row. Every read view that lists 50+ rows writes one row (so we know what was browsed).

### Frontend

- New page `packages/web/src/pages/Admin/Admin.tsx` at route `/admin`.
- Tabs: **Users**, **Organizations**, **Teams**, **Games**, **Audit Log**.
- Hidden from main nav unless `user.is_super_admin === true` (the `/auth/profile` response gets a new boolean derived from the env-var check on the server).
- **Read-only by default.** A "Enable destructive mode for 15 minutes" toggle at the top unlocks the four POST actions. Toggle expires client-side and the server doesn't trust it — the four endpoints just work, but the UI hides the buttons.
- Mobile: not built. Super-user is web-only.

### Out of scope for v1

Impersonation, password reads/resets, mass mutations, billing/usage dashboards, error-rate dashboards, mobile super-user view.

---

## Part B — Three Signup Modes Wired Through

### Coach mode (default — existing behavior, no change)

- Signup form → `POST /auth/register` with `registration_type='coach'` (or omitted for backwards compat).
- Backend creates `users` row only. No org, no team. Same as today.
- Lands on `/` → existing Dashboard with the "Create New Team" empty state, untouched.
- All existing users without a stored `registration_type` are treated as coaches at the dashboard layer. **Zero impact on existing accounts.**

### Player mode (new)

- Signup form → `POST /auth/register` with `registration_type='player'`.
- Backend creates `users` row + sets `users.registration_type = 'player'`.
- Lands on a new screen `pages/Onboarding/PlayerWaiting.tsx`: "Waiting for your coach to add you to a team. If you have an invite link, paste it here." Single text box that accepts an invite token URL.
- Once linked to a team (via invite acceptance OR coach manually setting `players.user_id`), Dashboard branches to a new `PlayerDashboard.tsx`:
    - Header: their team name + jersey number.
    - One section: "My Stats" — pitching stats if they're a pitcher, batting stats if they're a hitter, both if both. All scoped server-side to `WHERE player_id = (SELECT id FROM players WHERE user_id = $me)`.
    - No "Create Team", no "Email Report", no team-management affordances.
- Most players will arrive via the invite-with-signup flow (Part C below) and skip the waiting screen entirely.

### Org Admin mode (new)

- Signup form → `POST /auth/register` with `registration_type='org_admin'`.
- Backend creates `users` row + sets `users.registration_type = 'org_admin'`.
- Lands on a new screen `pages/Onboarding/OrgCreate.tsx`: "What's your organization called?" Single field. On submit:
    - Creates `organizations` row.
    - Creates `organization_members` row with `role='owner'`.
- Then redirects to `/org` → new `OrgDashboard.tsx`:
    - List of teams in this org (calls new `GET /organizations/:id/teams`).
    - "Create Team" button → posts to `POST /teams` with `organization_id` pre-filled from the active org.
    - Per-team: "Invite coach" button (uses existing `POST /invites` with `role='coach'`).
    - "Org settings" tab to add a second admin, rename, etc.
- An org admin can ALSO be added as a coach on individual teams if they want to chart games personally — the two role dimensions stay independent.

### Wiring `registration_type` through

The field is already sent by both clients (`Login.tsx:71`, `register.tsx:45`) and shapes are in shared. Backend changes:

1. `packages/shared/src/index.ts` — `RegistrationType = 'coach' | 'player' | 'org_admin'` (already present at line 47).
2. Migration `037_users_registration_type.sql`:
    ```sql
    ALTER TABLE users ADD COLUMN registration_type VARCHAR(16);
    -- nullable; existing users stay NULL = treated as 'coach' by the dashboard
    ```
3. `auth.routes.ts` register validation — accept optional `registration_type`.
4. `auth.service.ts` `register()` — destructure + insert `registration_type`. Return it on the user response. **No org or team rows created here.** The org-admin onboarding happens client-side in step two of the flow (the `OrgCreate` page) so a user can drop off and we don't have an orphaned org.
5. `getUserById` already returns memberships — add `registration_type` to the response shape.
6. New `pages/Onboarding/PlayerWaiting.tsx` and `pages/Onboarding/OrgCreate.tsx`.
7. App-level routing: after login, if `registration_type === 'player'` and no `team_members` row → `/onboarding/player`. If `registration_type === 'org_admin'` and no `organization_members` row → `/onboarding/org`. Otherwise → `/` (existing behavior).
8. Dashboard branching: a thin `Dashboard.tsx` shell that picks `<CoachDashboard/>` (existing component, renamed but unchanged), `<PlayerDashboard/>`, or `<OrgDashboard/>` based on `user.registration_type` + role memberships. Default to `<CoachDashboard/>` when ambiguous → preserves existing behavior.

---

## Part C — Three Cross-Cutting Gaps to Close

These were identified in earlier analysis. They're orthogonal to the three modes but block the end-to-end story.

### C1. Invite authorization (security, do first)

`POST /invites` today accepts any authenticated caller. Add `requireTeamRole('owner','coach')` (and accept `requireOrgRole('owner','admin')` if the inviter is acting on a team in their org). Same for `POST /players` (roster add) and `POST /join-requests/:id/approve` (player join approval).

### C2. Player-invite-with-signup

Today `acceptInvite` requires `authenticateToken`, so an invited player must already have an account. New flow:

- `pages/InviteAccept.tsx`: when unauthenticated, show two CTAs side-by-side: "Sign in to accept" (existing) and "Create account from this invite" (new).
- "Create account from this invite" → form prefilled with the invited email; collects first name, last name, password.
- New endpoint `POST /invites/token/:token/register` — single transaction: create `users` row, accept invite (writes `team_members` + links `players.user_id`), return JWT. `registration_type` is auto-set to match the invite role (`'player'` → player mode, `'coach'` → coach mode).

### C3. Org-aware team list

Today `GET /teams` returns teams where `user_id IN team_members OR user_id = teams.owner_id`. Solo coaches see exactly what they see today. Add a SECOND endpoint `GET /organizations/:id/teams` that returns every team in the org, gated by `requireOrgRole('owner','admin')`. The OrgDashboard uses the new endpoint; the existing CoachDashboard keeps using the old one. **Existing endpoint is not touched.**

---

## Backwards-Compatibility Guarantees (the "no impact" contract)

For each existing user, by category:

| Existing entity                                        | Today                         | After changes                                                                                 |
| ------------------------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| `users.registration_type = NULL` (every existing user) | Lands on coach Dashboard      | Lands on coach Dashboard (NULL → treated as 'coach')                                          |
| `users.is_super_admin` (no column)                     | n/a                           | Allowlist is env-var only; no user is implicitly elevated                                     |
| Orphaned team (`organization_id IS NULL`)              | Visible via `getTeamsByOwner` | Visible via `getTeamsByOwner` (untouched)                                                     |
| Org-linked team                                        | n/a (no orgs exist yet)       | Also visible via new `GET /organizations/:id/teams`                                           |
| Existing invite tokens in flight                       | Accepted via existing flow    | Accepted via existing flow (the new register-from-invite endpoint is additive)                |
| Existing `team_members` rows                           | Honored by `requireTeamRole`  | Honored by `requireTeamRole` (new authz on `POST /invites` doesn't touch existing acceptance) |
| Mobile app                                             | No role branching             | No role branching (mobile is untouched in this sketch — phase later)                          |

**Migrations are additive only**: one nullable column on `users` (037), one new table for audit (036), no ALTERs that change types or add NOT NULL constraints to populated columns.

---

## Recommended Build Order

1. **Super User (Part A)** — gives you a tool to debug everything you build after this.
2. **Wire `registration_type` through + Player mode (Part B coach + player + Part C2)** — closes the lying-picker gap and the player-invite-with-signup gap together. Org Admin button stays on the form but routes to a "Coming soon" stub.
3. **Org Admin mode (Part B org_admin + Part C3)** — only when you have a real travel-ball customer to onboard. Until then there's no point.
4. **Invite authz (Part C1)** — small, self-contained, drop in any time. Honestly should probably move to slot 1.5 since it's a real security hole.

## Open Questions (raised in discussion, not yet decided)

These are real design forks worth nailing down before slice 1 ships. Listed here so they don't get lost; each has a recommended starting position but needs explicit user sign-off.

1. **Coach is two flows under one role.** Solo HS/college coach (orphaned team, today's behavior) vs. travel-ball coach (invited into someone else's org, never creates their own teams). Same `registration_type='coach'`, but the UX differs — solo coach sees "Create Team" prominently; travel-ball coach probably should not (or should see "Create Team in <Org Name>" only). Open: does the dashboard infer from `organization_members` row presence, or do we add a sub-marker?

2. **Org Admin who's also a coach on a team.** Schema supports it (independent role dimensions). UI question: one merged dashboard, two switchable dashboards, or a sidebar toggle between "org view" and "team view"?

3. **What does "Player sees their team" mean exactly?** Just their own stats, or also teammates' game results / final scores / tendencies? A 14-year-old browsing the team's full scouting report is probably not what the coach wants. Recommended starting point: scoreboard + their own line, nothing else.

4. **Invite-with-signup role inheritance.** If an Org Admin invites Joe as a coach via email and Joe signs up via the invite link, Joe gets `registration_type='coach'`. But he's a _travel-ball_ coach, not a solo coach (see #1). The marker doesn't capture that distinction.

5. **Multi-team players.** A kid plays HS and travel ball — two `team_members` rows with `role='player'`. Does PlayerDashboard show a team-switcher at the top? One merged view? What if the HS coach and travel coach both want to see only "their" stats?

6. **Role drift over time.** A player graduates and becomes a college coach. `registration_type` was set at signup and frozen. Do we offer an in-app "I'm now a coach" upgrade, or do they create a new account?

7. **Mutating power for Org Admin.** The sketch gives Super User soft-delete but doesn't say what mutating power Org Admin has. Should they be able to soft-delete a team in their own org? Remove a coach? Reset narratives on their org's games?

## Out of Scope (Deferred)

- Impersonation in the Super User view.
- Password reset / read by Super User.
- Mobile player/org-admin dashboards (phase after web is proven).
- Multi-org membership UX (one user, two orgs) — schema supports it; no UI yet.
- Player → Coach role upgrade UX (see Open Question #6).
- Public org pages / scouting reports across an org.
- Billing / per-org metering.
