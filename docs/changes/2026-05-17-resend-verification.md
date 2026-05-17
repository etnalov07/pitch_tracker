# Resend Verification Email — Three Surfaces

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `5d44a2d`
- **Version bumps:** `@pitch-tracker/api` 1.10.0 → 1.11.0, `@pitch-tracker/web` 1.11.0 → 1.12.0. Shared not bumped (pinned at 1.0.0 per CI constraint).

## Context

Follow-up to the verify-email fix (`0775d3d`). With the verification flow now
functional, users still needed a way to **request a fresh verification email**
when the original link expired. Added that in the three places it makes sense:

1. The public `/verify-email` failure page (the link the user just clicked).
2. The Super User Admin page, per user row.
3. The Org Admin OrgDashboard Members tab, per member.

## Plan (Decisions)

- **Three surfaces, three callers, two new endpoints + one un-gate.**
    - Super User: a Resend button **already existed** on the user row
      (`adminService.resendVerification` → `POST /admin/users/:id/resend-verification`,
      shipped in slice 1) — but it was hidden behind the 15-minute "destructive
      mode" toggle. Resending an email is benign, not destructive, so the
      button was simply **un-gated** (still shown only for unverified users).
      No new endpoint.
    - Verify-email failure page: the user may not be logged in, so the existing
      authenticated `POST /auth/resend-verification` can't serve it. Added a
      **public** `POST /auth/resend-verification-by-email` taking `{ email }`.
    - Org Admin: needs an org-scoped caller — added
      `POST /organizations/:org_id/members/:member_id/resend-verification`,
      gated by `requireOrgRole('owner','admin')`.
- **Anti-enumeration on the public endpoint.** `resend-verification-by-email`
  always responds 200 regardless of whether the address has an account or is
  already verified — it never reveals which emails are registered. Rate-limited
  via the existing `authLimiter`.
- **Org members carry verification status.** `getMembers` now selects
  `email_verified`; `OrganizationMember` gained `user_email_verified?`. The
  Members tab shows a Resend button only for unverified members.
- **Org-scoped, not arbitrary.** `resendMemberVerification` resolves the user
  via a join that requires `member_id` to belong to `org_id`, so an owner/admin
  can only ever trigger it for a member of an org they manage.
- **No audit row for the org resend** — consistent with Slice 3, which already
  deferred audit logging for org-scoped mutations. The Super User resend keeps
  its existing `admin_audit` entry.
- **Reuses `authService.issueAndSendVerification`** for all paths — one token
  issuer, one email template.

## What shipped

### `packages/shared` (no version bump — pinned at 1.0.0)

- `src/index.ts`: `OrganizationMember.user_email_verified?: boolean`.

### `packages/api` (1.10.0 → 1.11.0)

- `src/controllers/auth.controller.ts`: new public `resendVerificationByEmail`
  handler — looks up the address, re-issues only if it exists and is
  unverified, always responds 200.
- `src/routes/auth.routes.ts`: new public route
  `POST /auth/resend-verification-by-email` (rate-limited, email-validated).
- `src/services/organization.service.ts`: `getMembers` now selects
  `email_verified` as `user_email_verified`; new `resendMemberVerification(orgId, memberId)`
  — org-scoped lookup, no-op-with-reason if already verified.
- `src/controllers/organization.controller.ts`: new `resendMemberVerification` handler.
- `src/routes/organization.routes.ts`: new route
  `POST /:org_id/members/:member_id/resend-verification`, `requireOrgRole('owner','admin')`.

### `packages/web` (1.11.0 → 1.12.0)

- `src/services/authService.ts`: new `resendVerificationByEmail(email)`.
- `src/services/organizationService.ts`: new `resendMemberVerification(orgId, memberId)`.
- `src/pages/VerifyEmail/VerifyEmail.tsx`: the failure state now offers an
  email input + "Resend email"; on submit shows a neutral
  "a new link is on its way" confirmation.
- `src/pages/Admin/Admin.tsx`: the per-user Resend button is no longer gated by
  destructive mode — always available for unverified users.
- `src/pages/OrgDashboard/OrgDashboard.tsx` + `styles.ts`: the Members tab
  shows a "Resend verification" button for unverified members (owner/admin),
  an "Unverified" tag otherwise, and "Verification sent" after a resend. New
  `ResendButton` / `MemberStatus` styled components.

## Verification

### Local setup

1. `RESEND_API_KEY` must be set for emails to actually send.
2. Rebuild shared: `cd packages/shared && npm run build`.
3. Start api + web.

### Verify-email failure page

1. Open `/verify-email?status=invalid` → failure card shows an email field.
2. Enter an address → "Resend email" → confirmation message appears.
3. Unverified account at that address receives a fresh verification email.

### Super User

1. Sign in as a super admin → `/admin` → Users tab.
2. An unverified user's row shows a **Resend** button **without** enabling
   destructive mode. Click → "Verification email sent."

### Org Admin

1. Sign in as an org owner/admin → OrgDashboard → Members tab.
2. An unverified member's row shows "Resend verification". Click → button
   becomes "Verification sent"; the member gets a new email.
3. A verified member shows neither button nor tag.

### Authorization

- `POST /auth/resend-verification-by-email` with a non-existent email → still 200.
- `POST /organizations/:org_id/members/:member_id/resend-verification` as a
  non-member → 403; with a `member_id` from a different org → 404.

## Out of scope (deferred)

- **Audit logging for the org-scoped resend** — org-mutation auditing remains
  deferred (Slice 3).
- **Players in the org.** The OrgDashboard Members tab covers
  `organization_members` (coaches/admins) only. Players live in `team_members`
  and have no org-level list view; resending for a player is done per-team or
  via the Super User page.
- **Throttling per-address resends** beyond the shared `authLimiter` window.
