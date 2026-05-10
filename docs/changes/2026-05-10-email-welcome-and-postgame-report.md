# Welcome email on registration + Email Postgame Report

- **Date:** 2026-05-10
- **Type:** feat
- **Commit:** `6a2c7dd`
- **Versions:** web `0.96.0` → `0.97.0`, mobile `1.92.0` → `1.93.0`

## Context

Resend was already wired in (used by team invites today). Two missing flows:

1. **Registration sent nothing.** Users got a JWT and that was it. Coaches wanted at minimum a welcome email; security-minded users wanted the option to verify their email so future password-reset flows have something to anchor to.
2. **No way to email a postgame report.** The Summary tab on the game viewer shows opponent attack plan + pitcher summaries, but there was no path to share it with parents/players/assistants without copy-pasting URLs or screenshots.

## Decisions

- **Welcome + optional verify CTA**: send a welcome email immediately on register. Account works without verifying; the email includes a one-tap "Verify your email" button. Adds `email_verified` column + `email_verifications` table (migration 034), but doesn't gate any flow on verification today — leaves room for password reset to require it later.
- **HTML body + deep link for postgame reports**: no PDF, no chart attachments. The email shows the scoreline, top pitch-mix, hit/walk/K/IP-out totals, the AI narrative if cached, and per-pitcher rollups — plus a "View full report" button linking back to `/game/<id>`. Cheapest to ship, looks good in any client, and the recipient gets value at-a-glance without needing to log in.
- **Manual recipient entry**: a small modal with a textarea (comma / newline / semicolon separated). No new schema; no roster-driven picker yet. Capped at 25 recipients per send.
- **Best-effort delivery**: welcome email is fire-and-forget after register so a Resend hiccup never fails a signup. Report email returns 502 if Resend can't send so the user sees a real error.

## What shipped

### API

- **Migration `034_email_verification.sql`** — `users.email_verified BOOLEAN` + `email_verified_at TIMESTAMPTZ`; new `email_verifications(id, user_id, token, expires_at, used_at, created_at)` table with indexes on `token` and `user_id`.
- **`services/email.service.ts`** — added `sendWelcomeEmail`, `sendVerificationEmail`, `sendPostGameReport` methods. Shared `baseShell()` + `escapeHtml()` helpers; templates use the same blue-header / white-body style as the existing invite email.
- **`services/auth.service.ts`** — `register()` fires `issueAndSendWelcome` after creating the user (fire-and-forget). New `issueAndSendWelcome`, `issueAndSendVerification`, `verifyEmail` methods. Tokens are 32-byte hex (`crypto.randomBytes`), 7-day TTL.
- **`controllers/auth.controller.ts` + `routes/auth.routes.ts`**:
    - `GET /auth/verify-email?token=...` (public) — redirects to `${APP_BASE_URL}/verify-email?status=ok|invalid` so the SPA can show a toast.
    - `POST /auth/resend-verification` (auth required) — issues a new token and emails it.
- **`services/performanceSummary.service.ts`** — new `emailPostGameReport(gameId, recipients)`. Builds summary lines from `getOpponentAttackSummary` (pitch mix, outcome totals, narrative) and `getAllGamePitcherSummaries` (per-pitcher strike%, hits, runs). Calls `emailService.sendPostGameReport`.
- **`controllers/performanceSummary.controller.ts` + `routes/performanceSummary.routes.ts`** — `POST /performance-summaries/game/:gameId/email-report` validates emails (regex + dedupe + 25 cap), 400s on empty/invalid, 502 on Resend failure.

### Web

- New `components/performanceSummary/EmailReportModal/` (component + barrel). Textarea + Cancel/Send + success/error states. Validates client-side before posting.
- `services/performanceSummaryService.ts` — `emailPostGameReport(gameId, emails)`.
- `pages/LiveGame/ViewerDashboard.tsx` — "📧 Email report" button in a new `SummaryToolbar` above the OpponentAttackSummary card; renders the modal.

### Mobile

- New `components/performanceSummary/EmailReportModal.tsx` (Paper `Modal` + `TextInput` multiline + buttons).
- `state/performanceSummary/api/performanceSummaryApi.ts` — `emailPostGameReport(gameId, emails)`.
- `app/game/[id]/viewer.tsx` — "Email report" outlined button (top-right of Summary tab) + modal wired in.

## Verification / migration

1. Apply migration `034_email_verification.sql` on prod DB.
2. Confirm `RESEND_API_KEY` is set (already used for invites).
3. **Welcome flow**: register a new user. Confirm they receive a welcome email within seconds. Click "Verify your email" — should redirect to `<APP_BASE_URL>/verify-email?status=ok`. Verify `users.email_verified = TRUE` in DB.
4. **Verify resend**: authenticated user hits `POST /auth/resend-verification`. New email arrives. Old token still works only if not used; new token also works.
5. **Postgame report**: open a completed game's Summary tab on web. Tap "📧 Email report" → enter a real address → Send. Email arrives with scoreline, top stats, narrative if cached, and a working "View full report" link.
6. **Mobile**: same flow on mobile viewer Summary tab.
7. Tests: API 490/490 pass, mobile 5/5 pass, web typecheck + lint clean.

## Out of scope (deferred)

- "Verify your email" banner on the profile/settings page (welcome email's CTA still works; banner is polish).
- Player roster email picker (no `players.email` column today).
- PDF / chart attachments on the report email.
- Verified-email-gated features (password reset etc.).
- Rate limiting on the report endpoint beyond the 25-recipient cap.
