# Super User + Three Signup Modes (Coach / Player / Org Admin)

> **Status:** Approved (2026-05-11). All seven open questions resolved; ready
> to slice into shippable work. Slice 1 is Super User (Part A) bundled with the
> small invite-authz fix from Part C1.

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
- Endpoints (v1, all read-only except the targeted mutating actions):
    - `GET /admin/users` — list/search users (paginated)
    - `GET /admin/users/:id` — full user detail incl. team/org memberships, recent games
    - `GET /admin/orgs` — list organizations + member count + team count
    - `GET /admin/teams` — list all teams (orphaned + org-linked), filter by org
    - `GET /admin/games?team_id=&date_range=` — recent games across all teams
    - `POST /admin/users/:id/force-verify-email` — set `email_verified=true`
    - `POST /admin/users/:id/resend-verification` — re-issue token + send email
    - `POST /admin/users/:id/set-registration-type` — change `registration_type` (handles role drift per Open Question #6)
    - `POST /admin/games/:id/regenerate-narrative` — re-trigger narrative pipeline
    - `POST /admin/games/:id/soft-delete` — soft-delete a game (set `deleted_at`)

### Audit log

New migration `036_admin_audit.sql`. Per Open Question #7, the table is shared
between Super User and org-level (owner/admin) privileged mutations — `actor_role`
distinguishes them.

```sql
CREATE TABLE admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    actor_role VARCHAR(16) NOT NULL CHECK (actor_role IN ('super', 'org_owner', 'org_admin')),
    organization_id UUID REFERENCES organizations(id),  -- null for super-user actions
    action VARCHAR(64) NOT NULL,
    target_table VARCHAR(64),
    target_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT ON admin_audit TO bvolante_pitch_tracker;
CREATE INDEX idx_admin_audit_org ON admin_audit(organization_id, created_at DESC);
CREATE INDEX idx_admin_audit_actor ON admin_audit(actor_user_id, created_at DESC);
```

Every mutation in `/admin/*` and every org-scoped privileged mutation in `/teams/*`, `/invites/*`, `/games/*` (when the caller's authority comes from `requireOrgRole`) writes one row. Every Super User read view that lists 50+ rows also writes one row.

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

## Open Questions (all resolved 2026-05-10/11)

Status legend: ✅ Resolved · 🟡 Open. All ✅ as of 2026-05-11.

1. ✅ **Coach is two flows under one role.** Solo HS/college coach (orphaned team, today's behavior) vs. travel-ball coach (invited into someone else's org, never creates their own teams). Same `registration_type='coach'`, but the UX differs — solo coach sees "Create Team" prominently; travel-ball coach shouldn't be making free-floating teams in someone else's account.

    **Decision (2026-05-10):** Infer from membership — no new column. The `CoachDashboard` checks `organization_members` rows and `team_members.team.organization_id` for the logged-in user.
    - **Solo coach** (no `organization_members` row, no team with `organization_id`): "Create Team" button visible; team is created orphaned (`organization_id IS NULL`). Today's behavior preserved exactly.
    - **Travel-ball coach** (rostered on at least one org-linked team via `team_members`, but NOT an `organization_members` owner/admin): no "Create Team" button. They see only the teams they coach within the org. Team creation is an org-admin function.
    - **Hybrid** (user is both an org admin AND coaches in another solo context): both affordances visible, scoped per team.

    Tradeoff accepted: zero migration cost, but the inference logic lives in dashboard code (must be kept consistent with backend authz). If the rule grows complex, revisit by adding `users.coach_type`.

2. ✅ **Org Admin who's also a coach on a team.** A user can hold both roles independently — own/admin an org AND be rostered on a team's coach line.

    **Decision:** Default to org view + drill in. The user lands on `/org` (`OrgDashboard`). Clicking a team in the org list opens that team's existing coach view (roster, games, charting flows). The team-level pages already exist and don't need a separate "as a coach" mode — the org admin gets the same affordances as any team coach when they enter a team.

    No top-bar toggle, no merged dashboard. If the user is rostered on a team in a _different_ org (or an orphaned team), that team still shows up under "My Teams" in the standard `CoachDashboard` accessible at `/`. The two routes coexist; `/org` is the default landing for `registration_type='org_admin'`.

3. ✅ **What does "Player sees their team" mean exactly?** A 14-year-old browsing the full team scouting report is probably not what the coach wants; pure-stats-only is too sparse.

    **Decision:** Personal stats + scoreboard. PlayerDashboard contains:
    - **Header:** Team name + jersey number.
    - **My Stats:** pitching stats if pitcher, batting stats if hitter, both if both. Server-side scoping: `WHERE player_id = (SELECT id FROM players WHERE user_id = $me LIMIT 1)`.
    - **Game results (scoreboard):** list of games the player appeared in, with date, opponent, final score, and the player's own line (e.g. "2-for-3, 1 RBI" or "5 IP, 2 ER"). No per-teammate breakdowns, no team-wide tendencies, no opponent scouting.

    What is **not** exposed: teammate stats, full team batting/pitching tables, team scouting reports, opposing-pitcher tendencies, charting tools, roster management. If a player wants the full team view, they can ask their coach for a screen-share — that boundary stays firm.

    Server enforcement: a new `requirePlayerSelf` middleware (or extend `requirePlayerTeamRole`) on the player-stats endpoints. The dashboard never asks for team-wide data; the API would refuse it anyway.

4. ✅ **Invite-with-signup role inheritance.** When someone signs up via an invite link (Part C2), what `registration_type` do they get?

    **Decision:** Match invite role + rely on Q1 inference. Mapping in `POST /invites/token/:token/register`:
    - Invite role `'player'` → `registration_type = 'player'`.
    - Invite role `'coach' | 'assistant' | 'owner'` → `registration_type = 'coach'`.
    - The solo vs travel-ball distinction is **not** baked into the marker. Q1's membership-based inference handles it: a user invited into an org-linked team automatically reads as travel-ball when the dashboard checks `organization_members` / `team_members.team.organization_id`.

    No new marker values. No new column. Same single registration_type column proposed in Part B handles every signup path (direct + invite-with-signup) consistently.

5. ✅ **Multi-team players.** A kid plays HS and travel ball — two `team_members` rows with `role='player'`. Coaches are naturally scoped to their own team via the existing `requireTeamRole` middleware, so cross-pollination isn't a concern there; the question is purely the player's own view.

    **Decision:** Team switcher at the top of `PlayerDashboard`. Dropdown in the header lists every team where the user has `team_members.role='player'`. Selecting a team scopes all stats and the scoreboard to that team. Defaults to the most-recently-active team (heuristic: most recent game appearance via `ORDER BY games.game_date DESC LIMIT 1`).

    Per-team scoping is enforced server-side: a new query parameter (`?team_id=`) on the player-stats endpoint, validated against the user's `team_members` rows. If a player tries to query a team they're not on, return 403 — same shape as `requireTeamRole`.

6. ✅ **Role drift over time.** A player graduates and becomes a college coach. `registration_type` was set at signup.

    **Decision:** Defer. Don't build the in-app upgrade. Rare case for a v1. The user emails support, the Super User flips `registration_type` (this becomes a fifth mutating action in the Super User toolbox: `POST /admin/users/:id/set-registration-type`), and the dashboard re-routes on next login. Their player stats stay in the DB and remain visible to the player view if we ever add a downgrade path; for now, one-way is fine.

    Stays listed in "Out of Scope (Deferred)" as the in-app self-service upgrade. Add the Super User action to Part A's endpoint list.

7. ✅ **Mutating power for Org Admin (and Owner).** What can org-level roles do within their own org?

    **Decision:** Owner and admin share **full local power** within the org. Schema already supports many `organization_members` rows per org (`role ∈ owner | admin | coach`), so larger orgs can have multiple admins as needed.

    **Owner-only actions** (the "self-destruct" set):
    - Add or remove another admin (`organization_members.role` mutations).
    - Transfer ownership to another member.
    - Soft-delete the organization itself.
    - Rename the organization (debatable; can be relaxed to admins later if it's a friction point).

    **Owner + admin actions** (full local power):
    - Create / rename / soft-delete teams in the org.
    - Invite / remove team members (coaches, assistants, players) on any team in the org.
    - Approve / deny join requests for any team in the org.
    - Regenerate AI narratives on any game in the org.
    - Force-verify email for any user who is a member of a team in the org.
    - Soft-delete games on org teams.

    **Coach (org-level role)** stays unused in the sketch for v1 — defer until a real use case shows up. If we need a "view-only org observer" later, that's where it lives.

    **Server enforcement:** new `requireOrgRole('owner')` for the self-destruct set; `requireOrgRole('owner','admin')` for the rest. Org-scoped mutations need a parameter that resolves to an org_id (e.g. `team_id` → look up `teams.organization_id`) and the middleware checks the requester's `organization_members` row for that org.

    **Audit log shared with Super User:** the `super_admin_audit` table proposed in Part A becomes more general — rename to `admin_audit` with `actor_role` column ∈ `super | org_owner | org_admin`. Same table catches every privileged mutation.

## Out of Scope (Deferred)

- Impersonation in the Super User view.
- Password reset / read by Super User.
- Mobile player/org-admin dashboards (phase after web is proven).
- Multi-org membership UX (one user, two orgs) — schema supports it; no UI yet.
- Player → Coach role upgrade UX (see Open Question #6).
- Public org pages / scouting reports across an org.
- Billing / per-org metering.
