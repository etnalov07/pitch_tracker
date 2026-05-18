# Super Admin Delete — Users, Teams, Organizations

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** _pending — backfilled after commit_
- **Version bumps:** `@pitch-tracker/api` 1.11.0 → 1.12.0, `@pitch-tracker/web` 1.12.0 → 1.13.0.

## Context

The Super Admin page could list users, teams, organizations, and games but
not remove any of them. This adds delete actions for **users, teams, and
organizations**, each writing an `admin_audit` row.

Games were intentionally excluded: `DELETE /games/:id` is already open to any
authenticated user and the Game History page already exposes a delete button —
a coach can remove a rained-out / cancelled game without super-admin rights.

## Plan (Decisions)

- **New super-admin-gated endpoints** under `/bt-api/admin/*`. The per-domain
  delete endpoints (`DELETE /teams/:id`, `/games/:id`) are gated by team/org
  role and bake in access checks a super admin wouldn't pass, so they can't be
  reused directly.
- **Hard delete.** Rows are physically removed; dependent data cascades via
  existing FKs. No `deleted_at` soft-delete (that would need a migration plus
  filtering every read app-wide — out of proportion to "remove test accounts").
- **User deletion is guarded.** A user who still owns teams (`teams.owner_id`)
  or organizations (`organizations.created_by`) is **blocked** with a clear
  message — those are also the `NOT NULL` foreign keys that would otherwise
  abort the delete, and removing a user shouldn't silently orphan that data.
  The guard makes test/spam-account cleanup safe without enabling one click to
  wipe an org. In-transaction, the user's sent invites are deleted and
  `invites.accepted_by` / `join_requests.reviewed_by` back-references are
  nulled. Any remaining FK violation rolls back and returns a friendly 409
  rather than a 500.
- **Teams / orgs delete straight through.** Team delete is a plain
  `DELETE FROM teams` (children cascade); org delete reuses
  `organizationService.deleteOrganization` (unlinks teams, keeps them, deletes
  the org). A leftover FK violation is caught and reported as a 409.
- **Every deletion is audited.** Each handler writes an `admin_audit` row
  (`actor_role: 'super'`, `action: admin.{users,teams,organizations}.delete`)
  with a payload snapshot (email/name) so the audit trail is meaningful after
  the row is gone.
- **UI: destructive-mode gated + confirm.** The Delete buttons only appear
  when the existing 15-minute "destructive mode" toggle is on, and each fires a
  `window.confirm`. A blocked delete surfaces the server's reason via alert.

## What shipped

### `packages/api` (1.11.0 → 1.12.0)

- `src/services/admin.service.ts`: `deleteUser` (guarded, transactional
  back-reference cleanup, FK-violation → friendly reason), `deleteTeam`,
  `deleteOrganization`. Each returns a snapshot for the audit payload.
- `src/controllers/admin.controller.ts`: `deleteUser` / `deleteTeam` /
  `deleteOrganization` handlers — 404 when missing, 409 when blocked, and an
  `admin_audit` write on success.
- `src/routes/admin.routes.ts`: `DELETE /admin/users/:id`,
  `DELETE /admin/teams/:id`, `DELETE /admin/organizations/:id` (all under the
  existing `authenticateToken` + `requireSuperAdmin` guard).

### `packages/web` (1.12.0 → 1.13.0)

- `src/services/adminService.ts`: `deleteUser`, `deleteTeam`, `deleteOrganization`.
- `src/pages/Admin/Admin.tsx`: Delete buttons on the Users, Teams, and
  Organizations tab rows — shown only in destructive mode, each behind a
  confirm dialog, blocked-delete reasons shown via alert. `OrgsTab` and
  `TeamsTab` now receive `destructiveActive` and gained an Actions column.

## Verification

### Local setup

1. Start api + web; sign in as a super admin.
2. Open `/admin`, enable "destructive mode".

### Delete a user

1. Users tab → a test account with no owned teams/orgs → Delete → confirm.
2. Row disappears; Audit Log shows `admin.users.delete` with the email snapshot.
3. Try deleting a user who owns a team → blocked with "User still owns N team(s) — delete those first."

### Delete a team / organization

1. Teams tab → Delete a team → row gone, `admin.teams.delete` audited.
2. Organizations tab → Delete an org → row gone, its teams survive (unlinked),
   `admin.organizations.delete` audited.

### Authorization

- All three `DELETE /admin/*` routes require a super-admin token (`requireSuperAdmin`).

## Out of scope (deferred)

- **Games in Super Admin** — already coach-deletable via `DELETE /games/:id` +
  the Game History delete button; not duplicated here.
- **Soft delete / restore.** Deletions are permanent.
- **Bulk delete.** One row at a time.
- **Cascade-delete a user's teams/orgs in one action.** Deliberately blocked —
  the owner must clear those first.
