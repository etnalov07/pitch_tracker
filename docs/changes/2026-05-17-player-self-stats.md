# Player Self-Stats Endpoint + PlayerDashboard Wire-Up

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `5150d80`
- **Version bumps:** `@pitch-tracker/api` 1.8.0 → 1.9.0, `@pitch-tracker/web` 1.9.0 → 1.10.0. Shared not bumped (pinned at 1.0.0 per CI constraint).
- **Plan reference:** [docs/plans/2026-05-10-super-user-and-signup-modes.md](../plans/2026-05-10-super-user-and-signup-modes.md) (Open Question #3 / Slice 2 deferred follow-up)

## Context

Slice 2 shipped Player mode but left the PlayerDashboard's "My Stats" and
"Recent Games" sections as placeholders — the plan explicitly deferred the
per-player stats endpoint to a dedicated follow-up. This change builds that
endpoint and wires the dashboard to real data, completing the Player mode
story end-to-end.

Per the plan's Open Question #3, a player sees only their **own** line:
personal batting and pitching aggregates plus a game-results scoreboard. No
teammate stats, no team-wide tables, no scouting.

## Plan (Decisions)

- **`GET /players/me/stats?team_id=` — self-scoping by construction.** The
  endpoint takes no `player_id` in the path; it resolves the `players` row
  from `req.user.id` via `team_members.role='player'`. A player can only ever
  retrieve their own line.
- **No `requirePlayerSelf` middleware.** The plan named one, but with no
  `player_id` path param there is nothing for a `:id`-guarding middleware to
  guard. The `?team_id=` param is validated inside the resolution query
  (`WHERE user_id = $me AND team_id = $teamId`) — a team the user isn't a
  player on yields no row → the controller returns 403. Adding a no-op
  middleware was rejected as ceremony.
- **Multi-team players pass `?team_id=`.** The resolution query validates it;
  with no `team_id` it falls back to the user's alphabetically-first player
  team. The web client always supplies `team_id` (the PlayerDashboard already
  tracks the active team), so the fallback is a safety net only.
- **Reuse the app's existing batting convention.** Batting average is
  `hits / at_bats` where `at_bats` counts every `at_bats` row (walks included),
  matching the existing `playerService.getPlayerStats()` used on team pages —
  so a player sees the same average their coach sees.
- **Strike classification mirrors `getPitcherGameStats`** — any `pitches` row
  whose `pitch_result` is not `'ball'` counts as a strike.
- **Scoreboard caps at 30 games**, newest first, built from the union of games
  where the player has an `at_bats` (as batter) or `pitches` (as pitcher) row.
- **Web only.** The mobile player dashboard stays deferred per the plan.

## What shipped

### `packages/shared` (no version bump — pinned at 1.0.0)

- `src/index.ts`: new "Player Self-Stats" type section — `MyPlayerBatting`,
  `MyPlayerPitching`, `PlayerStatGame`, `MyPlayerStats`.

### `packages/api` (1.8.0 → 1.9.0)

- **`src/services/player.service.ts`** — new `getMyStats(userId, teamId?)`:
    - Resolves the player via `team_members` (validates `team_id`; returns
      `null` if the user isn't a player on the requested team).
    - Aggregates batting per game from `at_bats` (AB, H, K, BB, RBI, R) and
      pitching per game from `pitches` (pitches, balls → strikes) plus
      batters-faced from `at_bats` where `pitcher_id` matches.
    - Returns `null` batting/pitching blocks when the player has no rows of
      that kind, and a per-game scoreboard with W/L/T derived from
      `is_home_game` + scores and a human-readable batting/pitching line.
- **`src/controllers/player.controller.ts`** — new `getMyStats` handler;
  reads optional `team_id` query param, 403s when the service returns `null`.
- **`src/routes/player.routes.ts`** — new `GET /me/stats` route, registered
  immediately after `/me` and before `/:id` to avoid pattern collision.

### `packages/web` (1.9.0 → 1.10.0)

- **`src/services/playerService.ts`** — new `getMyStats(teamId)` wrapping
  `GET /players/me/stats?team_id=`, typed to `MyPlayerStats`.
- **`src/pages/PlayerDashboard/PlayerDashboard.tsx`** — fetches stats whenever
  the active team changes; "My Stats" renders Batting and/or Pitching stat
  grids (or a placeholder when nothing is charted yet); "Recent Games" renders
  a scoreboard row per game with date, opponent, the player's line(s), and a
  colored W/L/T result.
- **`src/pages/PlayerDashboard/styles.ts`** — new styled components for the
  stat grid (`StatBlock`, `StatGrid`, `StatItem`, …) and the game scoreboard
  (`GameList`, `GameRow`, `GameResult`, …).

### `docs`

- This change doc + README index update.

## Verification

### Local setup

1. No migration — the feature reads existing `at_bats` / `pitches` / `games` tables.
2. Rebuild shared: `cd packages/shared && npm run build`.
3. Start api + web.

### Smoke test — player with stats

1. As a coach, chart a game with one of your rostered players batting and/or pitching.
2. Link that player to a user (invite-with-signup, or set `players.user_id`).
3. Sign in as that player → PlayerDashboard "My Stats" shows Batting/Pitching grids; "Recent Games" lists the charted game with the player's line.

### Smoke test — player with no stats

1. Sign in as a freshly-rostered player who hasn't appeared in a game.
2. "My Stats" shows the "No game stats recorded yet" placeholder; "Recent Games" shows "No games played yet."

### Smoke test — multi-team player

1. Roster the same user as a player on two teams, with games on each.
2. Switching the header team dropdown re-fetches and shows that team's stats only.

### Smoke test — authorization

1. Call `GET /bt-api/players/me/stats?team_id=<a team you are not a player on>` → expect 403.

## Out of scope (deferred)

- **Mobile player dashboard** — plan defers all mobile role-branching.
- **Per-pitch-type pitching breakdown** — the dashboard shows aggregate
  pitching only; the richer `PitcherProfile` per-pitch-type view stays on the
  coach-facing pitcher profile page.
- **Innings pitched / ERA** — not tracked in the schema; pitching lines use
  pitch count, strike %, and batters faced.
- **Pagination of the scoreboard** — capped at the 30 most recent games.

## Known pre-existing gaps (unchanged from earlier slices)

- `packages/api/src/utils/__tests__/jwt.test.ts` — fails on clean checkout (missing DB env vars).
- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test surfaces in default `npm test`.
