# Fix: Verify-Email Link Was Dead — Wrong Target + Missing Page

- **Date:** 2026-05-17
- **Type:** `fix`
- **Commit SHA:** `0775d3d`
- **Version bumps:** `@pitch-tracker/api` 1.9.0 → 1.10.0, `@pitch-tracker/web` 1.10.0 → 1.11.0.

## Context

The "Verify your email" button in the welcome / verification emails was dead.
Two independent breaks:

1. **Wrong link target.** `authService.issueAndSendWelcome` /
   `issueAndSendVerification` built `verifyUrl` as
   `${config.invite.baseUrl}/verify-email?token=…`. `config.invite.baseUrl` is
   the **web app** URL (`APP_BASE_URL`, default `http://localhost:3000`), so the
   link pointed at the SPA — not the API. The actual verification endpoint,
   `GET /bt-api/auth/verify-email`, was never hit and `users.email_verified`
   never flipped.
2. **Missing landing page.** Even the API's own post-verify redirect targets a
   web route `/verify-email` (with a `?status=` query param) that did not
   exist — no route in `App.tsx`, no page component. An unmatched SPA route
   renders a blank screen.

Net effect: clicking the button loaded a blank page and verified nothing. The
Super User `force-verify-email` action was the only thing that actually set
`email_verified`.

## Plan (Decisions)

- **Two-part fix, as scoped.**
    1. Point `verifyUrl` at the API endpoint so the token reaches the
       verification logic.
    2. Add the missing web `/verify-email` page so the API's `?status=`
       redirect lands somewhere.
- **New `config.api.baseUrl`.** The API needs its own absolute public URL to
  link back to itself. Added `API_BASE_URL` env var (default
  `http://localhost:5000/bt-api`) rather than reusing the web-oriented
  `APP_BASE_URL`. `verifyUrl` is now `${config.api.baseUrl}/auth/verify-email?token=`.
- **The verify-email page is a pure status display.** Verification already
  happened server-side before the redirect; the page only reads `?status=`
  and shows success/failure. It is a **public** route — a user clicking from
  an email may not be authenticated.
- **No change to the API redirect.** `auth.controller.verifyEmail` already
  redirects to `${config.invite.baseUrl}/verify-email?status=ok|invalid` (the
  web app) — correct once the page exists.

## What shipped

### `packages/api` (1.9.0 → 1.10.0)

- `src/config/env.ts`: new `api.baseUrl` config, read from `API_BASE_URL`
  (default `http://localhost:5000/bt-api`).
- `src/services/auth.service.ts`: both `verifyUrl` constructions now point at
  `${config.api.baseUrl}/auth/verify-email?token=` instead of the web app.

### `packages/web` (1.10.0 → 1.11.0)

- New `src/pages/VerifyEmail/VerifyEmail.tsx` + `index.ts` — reads `?status=`,
  renders a verified ✓ / failed ✕ card with a "Go to sign in" link.
- `src/App.tsx`: new **public** route `/verify-email` → `<VerifyEmail />`
  (alongside `/login`, `/invite/:token`, `/report/:gameId`).

## Verification

### Local

1. Set `RESEND_API_KEY` (email sends are skipped without it) and ensure
   `API_BASE_URL` resolves to the running API (default `http://localhost:5000/bt-api`).
2. Register a new user → welcome email arrives with a "Verify your email" button.
3. Click it → browser hits `GET /bt-api/auth/verify-email?token=…` → API sets
   `users.email_verified = TRUE` → redirects to `/verify-email?status=ok`.
4. The web page shows "Email verified ✓". Tampering with the token →
   `?status=invalid` → "Verification failed ✕".

### Production deploy step (required)

- **Set `API_BASE_URL`** in the API's production environment to the public API
  origin including the prefix, e.g. `https://bvolante.com/bt-api`. Without it,
  `verifyUrl` falls back to `http://localhost:5000/bt-api` and the email link
  breaks. (No regression risk — the link was already non-functional.)

## Out of scope (deferred)

- **Resend-from-the-failure-page.** The failure copy tells the user to request
  a new email from account settings; the page itself has no resend button
  (`/auth/resend-verification` requires auth).
- **Auto-login after verification.** The page links to `/login`; it does not
  establish a session.
