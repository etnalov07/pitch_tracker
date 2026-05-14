# `registration_type` Wired Through + Player Mode + C2 Invite-with-Signup — Slice 2

- **Date:** 2026-05-13
- **Type:** `feat`
- **Commit SHA:** `a2976b3`
- **Version bumps:** `@pitch-tracker/api` 1.7.0 → 1.8.0, `@pitch-tracker/web` 1.2.0 → 1.3.0. Shared not bumped.
- **Plan reference:** [docs/plans/2026-05-10-super-user-and-signup-modes.md](../plans/2026-05-10-super-user-and-signup-modes.md)

## Context

Slice 1 shipped Super User; this slice closes the "lying-picker" gap (signup form
sent `registration_type` but the backend silently dropped it) and ships the
end-to-end Player mode — including the C2 invite-with-signup path so a player
who's never had an account can land on `/invite/:token`, click "Create account
from this invite", and arrive on their PlayerDashboard in one flow. Org Admin
mode stays on the signup form but lands on a coming-soon stub for now (full
build in Phase 3).

Now that the column exists, the deferred `POST /admin/users/:id/set-registration-type`
admin endpoint from slice 1 is also unblocked and shipped here.

## Plan (Decisions)

- **Migration is additive only.** `users.registration_type` is a nullable
  `VARCHAR(16)`. NULL = treated as 'coach' by the dashboard branching shell.
  Validation lives at the route layer (express-validator), not a DB CHECK —
  evolving the set later doesn't require another migration.
- **Dashboard branching is a thin shell.** Rather than reshuffle hook order in
  the existing Dashboard.tsx with conditional rendering, extract the entire
  current Dashboard into `CoachDashboard.tsx` and replace `Dashboard.tsx` with
  a tiny switcher. No conditional-hooks risk, no behavior change for coaches.
- **PlayerDashboard ships as a shell.** Header (team name + jersey + position)
  and team-switcher dropdown for multi-team players are live. Stats and
  scoreboard sections are placeholders — the per-player stats endpoint with
  `requirePlayerSelf` authz is deferred to a dedicated follow-up so this slice
  stays scoped to mode-routing + signup.
- **C2 single-transaction endpoint.** `POST /invites/token/:token/register`
  creates the user row, the team_members row, links `players.user_id` if the
  invite carried a player, and marks the invite accepted in one DB transaction.
  registration_type is inferred from the invite role (`player` → 'player', any
  coach-side role → 'coach'). Email is taken from the invite (`invited_email`)
  to prevent a different email creating accounts off the link.
- **OrgAdmin → stub.** Direct org-admin signup lands on a "Coming soon" page
  served by the same Dashboard switcher. The plan's `/onboarding/org` route +
  full OrgDashboard come with Phase 3.
- **`/onboarding/player` route ships** but isn't router-enforced. The
  PlayerDashboard's own empty state already says "Waiting for your coach" with
  a "Paste invite link" CTA that navigates there. A direct player signup
  (rare — most arrive via invite-with-signup) lands on PlayerDashboard → sees
  the empty state → clicks the CTA → lands on `/onboarding/player`.

## What shipped

### `packages/shared` (no version bump — pinned at 1.0.0)

- `src/index.ts`: new `RegistrationType` exported type alias (`'coach' | 'player' | 'org_admin'`).
- `src/index.ts`: `User.registration_type?: RegistrationType | null` added (NULL ⇒ legacy coach).
- `src/index.ts`: `RegisterData.registration_type` re-typed to use the new alias.

### `packages/api` (1.7.0 → 1.8.0)

- **Migration:** Added `src/migrations/041_users_registration_type.sql` — nullable column + partial index where NOT NULL.
- **Auth route validation:** `src/routes/auth.routes.ts` now validates `registration_type` via `body(...).optional().isIn(['coach','player','org_admin'])`.
- **Auth service:** `register()` destructures and INSERTs `registration_type` (NULL if omitted). `getUserById` reads and returns it.
- **Types:** `UserResponse.registration_type` added in `src/types/index.ts`.
- **Player service/controller/routes:**
    - New `playerService.getPlayersForUser(userId)` — returns every player row linked via `team_members.role='player'`, joined with `teams.name`. Rows where the team_member has no linked player are filtered out.
    - New `playerController.getMyPlayers` handler.
    - New route `GET /bt-api/players/me` (auth-only, no team role gate — user fetching their own data). Mounted before `/:id` to avoid pattern collision.
- **Invite service/controller/routes:**
    - New `inviteService.registerFromInvite(token, { password, first_name, last_name })` — single transaction creating the user, team_member, linking `players.user_id`, marking invite accepted. Returns `{ user, token, team_id }`. registration_type inferred from invite role.
    - Validation: invite must be `pending`, not expired, must carry `invited_email`, and no existing user may share that email.
    - New controller method `registerFromInvite`.
    - New public route `POST /bt-api/invites/token/:token/register` (no auth — that's the whole point).
- **Admin set-registration-type:**
    - `adminService.setRegistrationType(userId, value)` — UPDATE `users.registration_type`; accepts null to clear.
    - `adminController.setRegistrationType` writes an audit entry on success.
    - New route `POST /bt-api/admin/users/:id/set-registration-type`.

### `packages/web` (1.2.0 → 1.3.0)

- **Dashboard branching:** `src/pages/Dashboard/Dashboard.tsx` rewritten as a thin switcher. Current dashboard implementation moved verbatim to `src/pages/Dashboard/CoachDashboard.tsx`. New `OrgAdminStub` lives inline in Dashboard.tsx as the org_admin landing page.
- **PlayerDashboard:** New `src/pages/PlayerDashboard/` (Tsx + styles + index). Fetches `/players/me` on mount, shows team header + jersey + position, multi-team switcher dropdown when applicable, and `Section` placeholders for Stats and Recent Games. Empty state ("Waiting for your coach") with a CTA to `/onboarding/player`.
- **PlayerWaiting:** New `src/pages/Onboarding/PlayerWaiting.tsx` + `index.ts` — paste invite link or token, accepts either the raw token or a full `/invite/:token` URL, navigates to the existing `/invite/:token` page.
- **Player service:** New `src/services/playerService.ts` wrapping `GET /players/me` with a `MyPlayerRecord` typed return.
- **InviteAccept:** Added a "Create account from this invite" CTA on the unauthenticated path. Reveals an inline form (first name, last name, password). Submits to `POST /invites/token/:token/register`; on success dispatches `setCredentials` and shows the existing "You're In!" success view. Email is implicit (from invite); shown as read-only context to the user.
- **App routing:** New `/onboarding/player` route under `<ProtectedRoute>`. Imports `PlayerWaiting` from the onboarding barrel.

### `docs`

- This change doc + README index update.

## Verification

### Local setup

1. Run migration `041_users_registration_type.sql` (`npm run db:setup` picks it up).
2. Rebuild shared: `cd packages/shared && npm run build`.
3. Start api + web.

### Smoke test — registration_type wiring

1. Sign up with "Player" selected. Verify `users.registration_type='player'` in the DB.
2. Log in — Dashboard renders PlayerDashboard with the "Waiting for your coach" empty state.
3. Click "Paste invite link" → lands on `/onboarding/player`.

### Smoke test — invite-with-signup (C2)

1. As a coach, create a team and invite a NEW email address with role `player`.
2. Copy the invite link from the email (or DB) and open it in a private window.
3. Click "Create account from this invite" → fill first/last/password → submit.
4. Should land directly on PlayerDashboard with the team header populated. `users.registration_type='player'`, `team_members` row exists, `invites.status='accepted'`.

### Smoke test — multi-team player

1. As two different coaches, invite the same player email to two teams.
2. After accepting both, PlayerDashboard shows a team-switcher dropdown. Switching updates the header.

### Smoke test — Org Admin stub

1. Sign up with "Org Admin" selected.
2. Lands on the "Org Admin — coming soon" page. Sign-out works.

### Smoke test — admin set-registration-type

1. As super admin, hit `POST /bt-api/admin/users/:id/set-registration-type` with `{ "registration_type": "player" }`.
2. User row updates; audit log shows `admin.users.set_registration_type` with the payload.

### Production deploy

- Run migration 041 on the prod DB.
- No data backfill required — existing rows stay NULL and continue rendering CoachDashboard.

## Out of scope (deferred)

- **Per-player stats endpoint with `requirePlayerSelf`.** The PlayerDashboard
  currently shows two placeholder sections. The follow-up adds `GET /players/me/stats?team_id=`
  (or extends existing endpoints with a self-mode) and the matching UI.
- **`/onboarding/org` + full OrgDashboard.** Org Admin lands on a stub for now;
  Phase 3 builds the full org-creation flow + team list.
- **Player-side game scoreboard.** Tied to the stats endpoint above.
- **Login.tsx redirect after register.** The user lands on `/`, which the
  Dashboard switcher then resolves correctly. No need for a special post-register redirect.
- **App-level "force redirect" to `/onboarding/player`.** PlayerDashboard's
  empty state already handles this with a CTA — building the redirect at the
  router layer adds little value when there's no team_members yet anyway.

## Known pre-existing gaps (unchanged from slice 1)

- `packages/api/src/utils/__tests__/jwt.test.ts` — fails on clean checkout (missing DB env vars).
- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test surfaces in default `npm test`.
- `packages/mobile/app/(tabs)/index.tsx` — pre-existing `deleteGame` import error on main.
