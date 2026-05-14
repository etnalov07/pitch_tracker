# Super User (Part A) + Invite Authz (Part C1) — Slice 1

- **Date:** 2026-05-13
- **Type:** `feat`
- **Commit SHA:** _backfill on commit_
- **Version bumps:** `@pitch-tracker/api` 1.6.1 → 1.7.0, `@pitch-tracker/web` 1.1.0 → 1.2.0. Shared not bumped (pinned at 1.0.0 per CI constraint).
- **Plan reference:** [docs/plans/2026-05-10-super-user-and-signup-modes.md](../plans/2026-05-10-super-user-and-signup-modes.md)

## Context

Plan called for a Super User (Part A) plus invite-authz (Part C1) as the first
shippable slice. Two motivations:

1. **Super User gives us a debug tool** for everything we build after this —
   list/search users, see which teams/orgs/games exist, force-verify a stuck
   email, resend verification. Hidden behind an env-var allowlist; no DB column,
   no migration on `users`. The day we need a second admin or want to grant it
   via UI, we add `users.is_super_admin`.
2. **`POST /invites`, `POST /players`, `PUT /join-requests/:id/approve` accepted any authenticated caller** — a real security hole. Slice 1 closes it.

## Plan (Decisions)

- **Marker:** Env-var allowlist `SUPER_ADMIN_EMAILS=brian.volante@bvolante.com` (comma-separated, case-insensitive), read once at boot. Membership check exposed via `isSuperAdminEmail(email)` so `/auth/profile` can decorate the user response.
- **Audit log shape:** New `admin_audit` table designed to be shared between Super User and future org-scoped privileged mutations. `actor_role` column ∈ `super | org_owner | org_admin`. Append-only — `GRANT SELECT, INSERT` only. Best-effort write: failures log and swallow so the originating request never breaks because audit didn't write.
- **Endpoint scope trimmed from the plan's 10 → 8.** Deferred: `set-registration-type` (waits on Phase 2's column), `regenerate-narrative` (needs pipeline re-invocation wiring), `soft-delete` (needs `deleted_at` + filtering of every game read). Each gets its own follow-up.
- **Migration renumber.** Plan said `036_admin_audit.sql`; 036 and 037 were both taken by already-shipped invalidate-summary migrations. Renumbered to **040**. Plan doc updated in a standalone commit before code landed.
- **Destructive-mode toggle is purely cosmetic.** The four mutating endpoints are always live to super-admins; the 15-minute client timer just hides the buttons. Server doesn't trust it.
- **Mobile: not built.** Super-user is web-only for v1.
- **C1 — new middleware variants** rather than retrofitting `requireTeamRole`. Body-driven endpoints (`POST /invites`, `POST /players`) read team_id from `req.body.team_id`; join-request approval/deny derive team_id from the join_request row at `req.params.id`. Forward-compat: org owners/admins on org-linked teams are also allowed (no-op today, sets up Phase 3).

## What shipped

### `packages/shared` (no version bump — pinned at 1.0.0)

- `src/index.ts`: added `is_super_admin?: boolean` to `User` (derived server-side; present on every user response).
- `src/index.ts`: added new Admin types section — `AdminActorRole`, `AdminUserListItem`, `AdminUserDetail`, `AdminOrgListItem`, `AdminTeamListItem`, `AdminGameListItem`, `AdminAuditEntry`, `AdminListResponse<T>`.

### `packages/api` (1.6.1 → 1.7.0)

- **Migration:** Added `src/migrations/040_admin_audit.sql` — `admin_audit` table with `actor_role` check constraint, three indexes (org+time, actor+time, time), `GRANT SELECT, INSERT` only.
- **Config:** Added `config.superAdmin.emails: string[]` parsed from `SUPER_ADMIN_EMAILS` env var (`src/config/env.ts`).
- **Middleware:** Added `requireSuperAdmin` middleware and `isSuperAdminEmail(email)` helper to `src/middleware/auth.ts`.
- **Middleware:** Added two new middleware factories to `src/middleware/roles.ts` — `requireTeamRoleFromBody(...roles)` (team_id from `req.body.team_id`, plus legacy owner_id and org-owner/admin fallback) and `requireTeamRoleFromJoinRequest(...roles)` (team_id derived from the join_request row).
- **Audit service:** New `src/services/audit.service.ts` with `auditService.write({...})` — append-only, swallow-and-log on failure.
- **Admin service:** New `src/services/admin.service.ts` — `listUsers`, `getUserDetail`, `listOrgs`, `listTeams`, `listGames`, `listAudit`, `forceVerifyEmail`, `resendVerification`. Paginated lists default to 50, max 200.
- **Admin controller:** New `src/controllers/admin.controller.ts` — 8 endpoints; writes audit entries on every mutation and on user-list reads of 50+ rows.
- **Admin routes:** New `src/routes/admin.routes.ts` — gated by `authenticateToken` + `requireSuperAdmin` on every route. Registered at `/bt-api/admin` in `src/app.ts`.
- **Auth response:** `auth.service.ts` `getUserById`, `login`, and `register` now include `is_super_admin` on the returned user (derived from the env allowlist). `UserResponse` type widened in `src/types/index.ts` to allow the field.
- **C1 wiring:**
    - `src/routes/invite.routes.ts`: `POST /` now gated by `requireTeamRoleFromBody('owner', 'coach')`. Also tightened `GET /team/:team_id` to require team owner/coach. `PUT /:id/revoke` deferred (needs lookup-by-invite middleware).
    - `src/routes/player.routes.ts`: `POST /` now gated by `requireTeamRoleFromBody('owner', 'coach')`.
    - `src/routes/joinRequest.routes.ts`: `PUT /:id/approve` and `PUT /:id/deny` now gated by `requireTeamRoleFromJoinRequest('owner', 'coach')`.
- **Tests:** Updated 7 route-test mock objects (`invite`, `joinRequest`, `opponentTeam`, `organization`, `player`, `team`, `teamMember`) to stub the two new middleware exports — without these, `jest.mock('../middleware/roles', ...)` left them undefined and any test importing `app.ts` failed at route-registration time.

### `packages/web` (1.1.0 → 1.2.0)

- New page `src/pages/Admin/Admin.tsx` mounted at `/admin` in `App.tsx`. Five tabs in one component: Users, Organizations, Teams, Games, Audit Log. Each tab gets paginated lists via a shared `usePagedList` hook. Users tab supports search and (when destructive mode is on) force-verify + resend-verification per row.
- New `src/pages/Admin/styles.ts` + `index.ts` barrel.
- New `src/services/adminService.ts` — typed HTTP wrappers for the 8 admin endpoints.
- `src/pages/Dashboard/Dashboard.tsx`: added a discreet `★` button in the header (next to settings) that's only rendered when `user.is_super_admin` is true.
- `src/App.tsx`: registered `/admin` route under `<ProtectedRoute>`.

### `docs`

- Standalone commit ahead of code: renumbered plan doc's migration references (036→040, 037→041) to avoid collision with shipped 036/037 migrations.
- This change doc + README index update.

## Verification

### Local setup

1. Add to `.env`: `SUPER_ADMIN_EMAILS=brian.volante@bvolante.com` (or whatever email you log in as).
2. Run `npm run db:setup` — picks up `040_admin_audit.sql`.
3. Rebuild shared: `cd packages/shared && npm run build`.
4. Start api and web: `npm run dev:api`, `npm run dev:web`.

### Smoke test

1. Log in as the allowlisted email. Click the `★` button in the dashboard header — should land on `/admin`.
2. Log in as a non-allowlisted user. The `★` button should NOT render. Hitting `/admin` directly should bounce you back to `/`.
3. Hit `GET /bt-api/admin/users` directly without a super-admin token → 403.
4. From the Users tab, find a non-verified user. Toggle "Enable destructive mode for 15 minutes". Click "Force verify" → confirm dialog → user's `email_verified` flips to `TRUE` and a row appears in the Audit Log tab.
5. Click "Resend" on a non-verified user — verification email goes out.
6. Try `POST /bt-api/invites { team_id: <foreign team> }` as a user with no role on that team — should 403. Same for `POST /bt-api/players` and `PUT /bt-api/join-requests/:id/approve`.

### Production deploy

- Set `SUPER_ADMIN_EMAILS=brian.volante@bvolante.com` on the API host's env config.
- Run migration `040_admin_audit.sql` on the prod DB.
- No data backfill required.

## Out of scope (deferred)

These were in the plan but consciously punted from Slice 1:

- **`POST /admin/users/:id/set-registration-type`** — needs `users.registration_type` column from Phase 2 (`041_users_registration_type.sql`).
- **`POST /admin/games/:id/regenerate-narrative`** — needs the AI narrative pipeline to be re-invocable from outside the game-end trigger. Standalone follow-up.
- **`POST /admin/games/:id/soft-delete`** — needs `deleted_at` column on `games` AND every game read query updated to filter `WHERE deleted_at IS NULL`. Halfway implementation (column-only) would be a no-op visible-feature. Defer until both pieces land together.
- **`PUT /invites/:id/revoke` authz** — needs a lookup-by-invite-id middleware variant. Today the controller still enforces nothing on this endpoint; close in a follow-up.
- **Impersonation, password reset/read, mobile super-user view, bulk mutations, billing/error-rate dashboards** — explicit Part-A non-goals.
- **Org-admin parallel pathway through the audit log** — the table is built for it but no org-side privileged mutations exist yet. Phase 3.

## Known pre-existing gaps surfaced (not fixed in slice 1)

- `packages/api/src/utils/__tests__/jwt.test.ts` fails on a clean checkout because it sets `JWT_SECRET` but not `DB_NAME`/`DB_USER`/`DB_PASSWORD`, and imports `jwt.ts` which loads `config/env.ts`. The test passes in environments where those env vars happen to be set. Pre-existing; affects 1 suite / 0 tests.
- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` is an integration test that needs a real Postgres but is not excluded from the default `npm test` run (only the integration jest config). Pre-existing.
- `packages/mobile/app/(tabs)/index.tsx` references a removed `deleteGame` export from `src/state` — pre-existing mobile-side typecheck error on `main`, unrelated to slice 1.
