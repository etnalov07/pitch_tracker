# Auth Security Hardening — Password Reset, Lockout, Auth Log, Session Invalidation

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `782e93b`
- **Version bumps:** `@pitch-tracker/api` 1.12.0 → 1.13.0, `@pitch-tracker/web` 1.13.0 → 1.14.0. Shared not bumped (pinned at 1.0.0 per CI constraint).

## Context

Four auth-security additions, scoped for an app that stores no PII or financial
data: password reset (Super-User-triggered + self-service), brute-force account
lockout, an auth-event log, and session invalidation on password change.
Baseline was already reasonable — `helmet()`, IP rate-limiting on
`/auth/login` + `/auth/register`, and generic "Invalid email or password"
errors — so this layers account-level protection on top.

## Plan (Decisions)

- **Password reset mirrors the email-verification machinery.** A
  `password_resets` token table (token, user_id, expires_at, used_at);
  short-lived **1-hour, single-use** tokens; consuming a token burns every
  other outstanding token for that user. The reset link points at the **web
  app** `/reset-password` page (a form), unlike the verify-email link which
  hits the API directly.
- **Self-service + Super-User both ship.** A public `request-password-reset`
  endpoint (anti-enumeration — always 200) backs a "Forgot password?" flow on
  the login page; a Super User can also trigger a reset from the Admin user row.
- **`resetPassword` does NOT auto-login.** It stamps `password_changed_at` and
  sends the user to `/login`. Keeping token issuance separate from the
  password-change timestamp avoids a same-second race with session invalidation.
- **Lockout: 7 fails → 15-minute cooldown.** `users.failed_login_count`
  increments on each failed login, resets to 0 on success; at 7 the account is
  locked via `locked_until`. The lock auto-clears once `locked_until` passes
  (the next attempt gets a fresh batch); a Super User can also unlock
  immediately. A locked account is rejected before the password is even checked.
- **Auth events get their own table.** `admin_audit` requires a `NOT NULL`
  actor and a restricted `actor_role`, which can't represent a failed login for
  an unknown email — so a dedicated `auth_events` table logs `login_failed`,
  `login_blocked_locked`, `account_locked`, `password_reset_requested`, and
  `password_reset_completed`, viewable in a new Admin "Auth Events" tab.
- **Session invalidation via `password_changed_at`.** `authenticateToken`
  becomes async and reads `users.password_changed_at`, rejecting any JWT whose
  `iat` predates it (with a 5-second grace for `iat` second-rounding). This
  adds **one DB read per authenticated request** — an accepted cost; it also
  means a deleted user's token now stops working immediately.
- **`password_changed_at` is set only on reset** (NULL otherwise = no check),
  so registration and normal logins are never affected.

## What shipped

### `packages/shared` (no version bump — pinned at 1.0.0)

- `JWTPayload` += `iat?: number`; `AdminUserListItem` += `locked_until`; new
  `AdminAuthEventEntry` type.

### `packages/api` (1.12.0 → 1.13.0)

- **Migration `042_auth_security.sql`** — `password_resets` + `auth_events`
  tables; `users` += `failed_login_count`, `locked_until`, `password_changed_at`.
- `services/auth.service.ts` — `login` lockout logic + auth-event logging
  (now takes `ip`); `issueAndSendPasswordReset`, `requestPasswordReset`
  (anti-enumeration), `resetPassword`; private `logAuthEvent` helper.
- `services/email.service.ts` — `sendPasswordResetEmail`.
- `services/admin.service.ts` — `sendPasswordReset`, `unlockUser`,
  `listAuthEvents`; `listUsers` now returns `locked_until`.
- `controllers/auth.controller.ts` — public `requestPasswordReset` /
  `resetPassword`; `login` forwards `req.ip`.
- `controllers/admin.controller.ts` — `sendPasswordReset` + `unlockUser` (both
  audited), `listAuthEvents`.
- `routes/auth.routes.ts` — public `POST /auth/request-password-reset`,
  `POST /auth/reset-password` (rate-limited).
- `routes/admin.routes.ts` — `POST /admin/users/:id/send-password-reset`,
  `POST /admin/users/:id/unlock`, `GET /admin/auth-events`.
- `middleware/auth.ts` — `authenticateToken` async; rejects tokens predating
  `password_changed_at` and tokens for deleted users.
- `__tests__/helpers/setup.ts` — route tests mock `query` with exact
  call-sequences, so the test harness now substitutes a DB-free
  `authenticateToken` (JWT-verify only) — `requireSuperAdmin` stays real.

### `packages/web` (1.13.0 → 1.14.0)

- New `pages/ResetPassword/` — public `/reset-password` page (route added in
  `App.tsx`); reads `?token=`, new-password + confirm, posts to the API.
- `pages/Login/Login.tsx` — "Forgot password?" link → inline email form →
  `requestPasswordReset`, with an anti-enumeration confirmation.
- `pages/Admin/Admin.tsx` — Users rows gain "Send reset" (always) and "Unlock"
  (only when locked); new "Auth Events" tab.
- `services/authService.ts` — `requestPasswordReset`, `resetPassword`.
- `services/adminService.ts` — `sendPasswordReset`, `unlockUser`, `listAuthEvents`.

## Verification

### Local setup

1. Run migration `042_auth_security.sql`.
2. Rebuild shared (`cd packages/shared && npm run build`); start api + web.
3. `RESEND_API_KEY` must be set for emails to actually send.

### Password reset — self-service

1. Login page → "Forgot password?" → enter email → confirmation shown.
2. Open the emailed link → `/reset-password` → set a new password → "Password updated".
3. Sign in with the new password.

### Password reset — Super User

1. `/admin` → Users tab → "Send reset" on a row → "Password reset email sent"; `admin.users.send_password_reset` audited.

### Lockout

1. Fail login 7× for one account → 7th response: "Account temporarily locked…".
2. A correct password during the lock window is still rejected.
3. After 15 min it unlocks; or `/admin` → Users → "Unlock" clears it immediately (`admin.users.unlock` audited).
4. Admin "Auth Events" tab shows the `login_failed` / `account_locked` rows.

### Session invalidation

1. Sign in (browser A). Reset that account's password (reset flow).
2. Browser A's next request → 403 "Session expired — please sign in again."

### Production deploy

- Run migration 042 on the prod DB. No backfill — existing rows get
  `failed_login_count=0`, `locked_until=NULL`, `password_changed_at=NULL`.

## Out of scope (deferred)

- MFA, CAPTCHA, password-complexity rules beyond the 8-char minimum, JWT
  refresh-token rotation — disproportionate at this app's stakes.
- Pruning old `auth_events` / `password_resets` rows (no retention job yet).
- Per-account (vs per-IP) rate limiting on the reset-request endpoint beyond
  the shared `authLimiter` window.

## Known pre-existing gaps (unchanged)

- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test fails on a clean checkout (needs a live DB).
