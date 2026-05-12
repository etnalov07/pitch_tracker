# Feat: Standalone opponent roster — add pitchers & batters without a game

| Date       | Type | Commit    | Versions                                                                |
| ---------- | ---- | --------- | ----------------------------------------------------------------------- |
| 2026-05-12 | feat | `d089a32` | api 1.5.1 → 1.6.0, web 1.0.1 → 1.1.0, mobile 1.95.0 → 1.96.0 + app.json |

## Context

Coaches need to populate an opponent's pitcher and batter roster **before**
any game has been charted against that opponent — for scouting prep next
week's matchup, building out the database after talking to a parent, or
just thinking out loud about a tendency. Today the only way to add a
pitcher or batter to `opponent_pitcher_profiles` / `batter_scouting_profiles`
is as a byproduct of charting a game or filing a scouting report. The web
and mobile OpponentDetail screens both said as much in their empty-state
copy: _"they appear automatically when you chart games."_

Forward-design doc: [docs/plans/2026-05-12-standalone-opponent-roster.md](../plans/2026-05-12-standalone-opponent-roster.md).

## Decisions

- **Roster CRUD is independent of games and scouting reports.** New service
  methods (`OpponentPitcherProfileService.create / update / delete` and a
  new `OpponentBatterProfileService`) accept an `opponent_team_id` and the
  minimal fields needed. The opponent team is looked up to derive
  `team_id` (and `opponent_team_name` for the legacy column on
  `batter_scouting_profiles`).
- **Duplicate guard returns 409 with the existing row** so the UI can offer
  "edit the existing one" instead of silently merging.
- **DELETE preserves historical data.** Pitcher delete nullifies
  `opposing_pitchers.profile_id` rather than cascading, so per-game pitch
  charts survive even if the profile is removed. Batter delete cascades
  through `batter_tendencies` and `opponent_lineup_profiles` per existing
  FK definitions.
- **Mobile uses inline collapsible forms** (matching the standalone-team
  flow already in `app/team/[id]/opponents/index.tsx`) plus an action sheet
  (iOS `ActionSheetIOS`, Android `Alert.alert`) on long-press / kebab for
  edit/delete. Web uses an inline form card + per-row ✎/✕ icons.
- **No new `/teams/:teamId/opponents/:opponentId/pitchers` namespace.**
  Followed the existing flat pattern `/bt-api/opponent-pitcher-profiles`
  (POST `/opponent-team/:opponentTeamId`, PATCH `/:id`, DELETE `/:id`) and
  mirrored it at `/bt-api/opponent-batter-profiles`. Keeps wiring simple
  and consistent with the existing GET endpoints.

## What shipped

### packages/shared

- `src/index.ts` — added `CreateOpponentPitcherProfileParams`,
  `UpdateOpponentPitcherProfileParams`, `CreateBatterScoutingProfileParams`,
  `UpdateBatterScoutingProfileParams`. Added `jersey_number?: number | null`
  to `BatterScoutingProfile`.
- Built with `npm run build`.

### packages/api

- `src/services/opponentPitcherProfile.service.ts` — new `create()`,
  `update()`, `delete()` methods. Existing `findOrCreate()` (game-scoped
  path) unchanged so opposing-pitcher-link flow keeps working.
- `src/services/opponentBatterProfile.service.ts` — new file. Mirrors the
  pitcher service: `getByOpponentTeam`, `getById`, `create`, `update`,
  `delete`.
- `src/controllers/opponentPitcherProfile.controller.ts` — new `create`,
  `update`, `delete` handlers with 400/404/409 mapping.
- `src/controllers/opponentBatterProfile.controller.ts` — new file.
- `src/routes/opponentPitcherProfile.routes.ts` — added
  `POST /opponent-team/:opponentTeamId`, `PATCH /:id`, `DELETE /:id`.
- `src/routes/opponentBatterProfile.routes.ts` — new file. Same shape.
- `src/app.ts` — mounted `/bt-api/opponent-batter-profiles` and imported
  the new routes.
- `src/migrations/038_add_jersey_to_batter_scouting_profiles.sql` — new
  migration. Adds `jersey_number INTEGER` column + partial index
  `(opponent_team_id, jersey_number) WHERE jersey_number IS NOT NULL`.
- `src/services/__tests__/opponentPitcherProfile.service.test.ts` —
  10 new tests covering all branches of create / update / delete.
- `src/services/__tests__/opponentBatterProfile.service.test.ts` —
  9 new tests covering same surface for batters.
- `package.json` — 1.5.1 → 1.6.0 (minor — new endpoints).

### packages/web

- `src/services/opponentTeamService.ts` — added `create`, `update`, `delete`
  on `opponentPitcherProfileService` and a new
  `opponentBatterProfileService` named export.
- `src/pages/OpponentDetail/OpponentDetail.tsx` — major rewrite. Added
  per-section "+ Add Pitcher" / "+ Add Batter" buttons, inline form card
  (name, throws/bats radio, jersey number), per-row ✎/✕ icons,
  optimistic state updates with 409 handling. Empty-state copy updated to
  reflect that the roster can be populated manually.
- `src/pages/OpponentDetail/styles.ts` — new styled-components for the
  form, action icons, radio group, and section title row.
- `package.json` — 1.0.1 → 1.1.0 (minor — user-visible new affordances).

### packages/mobile

- `src/state/opponents/api/opponentsApi.ts` — added `createPitcher`,
  `updatePitcher`, `deletePitcher`, `createBatter`, `updateBatter`,
  `deleteBatter`.
- `src/state/opponents/opponentsSlice.ts` — added six thunks
  (`addOpponentPitcher`, `updateOpponentPitcher`, `deleteOpponentPitcher`,
  and batter equivalents). Reducer mutates `state.selectedOpponent.pitchers`
  /`.batters` on each fulfilled action, kept alphabetically sorted.
- `src/state/index.ts` — re-exported the new thunks.
- `app/team/[id]/opponents/[opponentId].tsx` — rewrote to mirror the web
  UX: section header with "+ Add" tonal button, inline `Card`-based form
  with `SegmentedButtons` for handedness, long-press / kebab → action
  sheet for edit/delete. Empty-state copy updated to match.
- `package.json` + `app.json` — both 1.95.0 → 1.96.0 (synced).

## Verification

### Pre-ship (all green)

- [x] `packages/shared` `npm run build` clean.
- [x] `packages/shared` jest: **148/148 pass**.
- [x] `packages/api` `tsc --noEmit` clean. Full jest: **521/521 pass**
      (19 new tests).
- [x] `packages/web` `tsc --noEmit` clean. ESLint clean.
- [x] `packages/mobile` `tsc --noEmit` clean. Jest: **5/5 pass**.
- [x] Prettier: all changed files conformant.

### Post-deploy

- [ ] Run migration 038 on dev / prod (adds `jersey_number` column +
      partial index; idempotent).
- [ ] On web, navigate to `/teams/<tId>/opponents/<oId>` and add a pitcher
      from scratch without any game. Reload — row persists.
- [ ] Edit + delete the pitcher; both round-trip cleanly. Delete leaves
      any existing `opposing_pitchers` row's pitch chart intact.
- [ ] Try to add a second pitcher with the same name → see 409 banner.
- [ ] Repeat the three flows for batters.
- [ ] On mobile, same flows under `app/team/[id]/opponents/[opponentId].tsx`.
- [ ] Start a real game vs. that opponent, open opposing-pitcher modal —
      manually-added pitcher appears via the existing `findOrCreate` (it
      matches by normalized name on the same opponent team).

## Out of scope (deferred)

- Bulk roster paste / CSV upload.
- Pitcher arsenal pre-population (no schema today for arsenal independent
  of aggregated tendencies).
- Standalone batter zone-weakness entry independent of a scouting report
  (zone_weakness lives on `scouting_report_batters`).
- Roster history / "former players" view.
