# One Charter Per Game

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `5ac6335`
- **Version bumps:** `@pitch-tracker/api` 1.14.0 → 1.15.0, `@pitch-tracker/web` 1.15.0 → 1.16.0, `mobile` 2.4.0 → 2.5.0 (`app.json` expo.version 1.96.0 → 1.97.0).

## Context

A live game could be charted by any number of users at once — nothing
restricted charting to a single person. Worse, the `game_roles` machinery was
half-built: `game_roles` (role ∈ `charter` | `viewer`) had only a
`UNIQUE(user_id, game_id)` constraint, and **neither web nor mobile ever
persisted the chosen role** — the role-select buttons set local state only.

This makes the live game single-charter: the first user to claim `charter`
gets it; anyone else who tries is dropped into read-only Viewer mode.

## Plan (Decisions)

- **Enforce at the DB.** New partial unique index
  `game_roles (game_id) WHERE role = 'charter'` — a hard guarantee of at most
  one charter per game, race-safe.
- **Claim-with-fallback semantics.** `claimRole` returns the role the caller
  _actually_ got: requesting `charter` when another user holds it (or losing
  the index race) returns `viewer`. The client uses the returned role.
- **Second user → Viewer mode**, not blocked — the existing Viewer dashboard
  (web) / viewer screen (mobile) already exists; nobody is locked out.
- **Persist the role on both platforms.** The clients now actually call the
  assign endpoint (they previously only set local state), so the server has a
  real record to enforce against.
- **API `assignRole` response unchanged in shape** — it already returned the
  `GameRoleRecord`; clients just need to read `.role` off it.

## What shipped

### `packages/api` (1.14.0 → 1.15.0)

- **Migration `043_game_one_charter.sql`** — demotes any pre-existing duplicate
  charters (keeps the earliest per game), then creates the partial unique index.
- `services/gameRole.service.ts` — `upsertRole` replaced by `claimRole`: for a
  `charter` request, checks for an existing charter held by another user and
  falls back to `viewer`; also catches the `23505` index race and falls back.
  `viewer` requests write straight through. Private `writeRole` holds the upsert.
- `controllers/gameRole.controller.ts` — `assignRole` calls `claimRole`.
- `__tests__/gameRole.routes.test.ts` — updated the charter test for the new
  two-query path; added a test for the viewer fallback.

### `packages/web` (1.15.0 → 1.16.0)

- `pages/LiveGame/useLiveGameState.ts` — new `chooseRole()` that calls
  `gameRoleService.assignRole` and sets `gameRole` to the **returned effective
  role**; alerts when a charter request came back as viewer.
- `pages/LiveGame/LiveGame.tsx` — the role-select modal buttons call
  `chooseRole` (previously `setGameRole`, local-only). A charter-taken user
  lands in `ViewerDashboard`.

### `packages/mobile` (2.4.0 → 2.5.0)

- `app/game/[id]/live.tsx` — the role-select buttons call
  `gamesApi.assignGameRole` and dispatch the returned role; a charter-taken
  user gets an alert and is routed to `/game/[id]/viewer`.

## Verification

### Local setup

1. Run migration `043_game_one_charter.sql`.
2. Start api + web (+ mobile).

### Smoke test

1. User A opens an in-progress game → picks **Charter** → charts normally.
2. User B opens the same game → picks **Charter** → gets an alert ("someone is
   already charting…") and lands in Viewer mode (web `ViewerDashboard` /
   mobile viewer screen).
3. User A re-opens the game and picks Charter again → still gets `charter`
   (claim is idempotent for the same user).
4. `GET /bt-api/game/:id/role` reflects each user's persisted role.

### Production deploy

- Run migration 043 on the prod DB. If any game already has multiple charter
  rows, all but the earliest are demoted to `viewer` before the index is added.

## Out of scope (deferred)

- **Charter release / hand-off.** Once a user holds `charter` for a game there
  is no way to release or transfer it — if that user disappears, nobody else
  can chart that game. A release/transfer flow (or an owner/coach override)
  would be a separate feature.
- **Live presence** — no "who is charting" indicator or real-time notification
  when a charter is claimed; the second user only finds out when they try.

## Known pre-existing gaps (unchanged)

- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test fails on a clean checkout (needs a live DB).
