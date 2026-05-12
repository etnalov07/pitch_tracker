# Standalone Opponent Roster — Add Pitchers & Batters Without a Game

| Field  | Value                         |
| ------ | ----------------------------- |
| Date   | 2026-05-12                    |
| Status | Approved (shipped 2026-05-12) |
| Owner  | brian.volante@bvolante.com    |

## Context

Today, opponent teams can be created standalone — both web
(`/teams/:teamId/opponents`) and mobile (`app/team/[id]/opponents/`) let
you add an opponent team without starting a game. \*\*But the roster (pitchers

- batters) only materializes as a byproduct of charting games or entering
  scouting lineups.\*\* Both the web `OpponentDetail` page and the mobile
  `[opponentId].tsx` screen are read-only for roster — the mobile empty-state
  literally says "Pitchers appear after charting games vs. this team."

This blocks the natural workflow:

1. Coach learns they have a game against Johnson HS next week.
2. They want to enter the probable starter, the lineup, and start jotting
   tendencies _now_, before any game data exists.
3. Today they have to start a fake game, add the pitcher/lineup there,
   then never touch that game again — or just keep it all in their head.

## Scope (confirmed 2026-05-12)

**In:**

- Add pitcher profiles directly to an opponent team (web + mobile).
- Add batter scouting profiles directly to an opponent team (web + mobile).
- Edit + delete affordances for both, on both platforms.

**Out:**

- Changing how pitcher tendencies aggregate (still auto-recalc from linked
  game pitches).
- Bulk import or CSV upload — single-add only for v1.
- A standalone "scouting season" UI separate from the existing scouting-report
  flow. Scouting reports already work standalone; this just lets you build
  roster _before_ writing a report.

## Decisions

### Data model — no migration needed

Both target tables already exist:

- `opponent_pitcher_profiles` (added in migration `024_scouting_focus.sql` /
  related earlier batch). Has `opponent_team_id`, `team_id`, `pitcher_name`,
  `normalized_name`, `jersey_number`, `throws`, `games_pitched`,
  `last_seen_date`. UNIQUE(opponent_team_id, normalized_name).
- `batter_scouting_profiles` (added in migration `027_opponent_teams.sql`).
  Has `opponent_team_id`, `team_id`, `opponent_team_name`, `player_name`,
  `normalized_name`, `bats`. UNIQUE per team+opponent+normalized_name.

The `findOrCreate()` pattern already exists in `opponentPitcherProfile.service.ts`
— we just need to expose it as a direct POST endpoint with explicit params,
not just as a side effect of game-pitcher linking.

For batters, `scouting.service.ts` has `getOrCreateProfile()` which currently
fires from the scouting-report flow only. We'll either reuse it from a new
controller or extract the upsert into a small helper.

### New API endpoints

All under `/bt-api/teams/:teamId/opponents/:opponentId/...` (mirrors the
existing team-scoped opponent route prefix so auth + ownership checks slot
in naturally).

| Verb   | Path                                       | Body                                         | Purpose                                                                            |
| ------ | ------------------------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| POST   | `/teams/:tId/opponents/:oId/pitchers`      | `{ pitcher_name, throws, jersey_number? }`   | Create pitcher profile standalone                                                  |
| PATCH  | `/teams/:tId/opponents/:oId/pitchers/:pId` | `{ pitcher_name?, throws?, jersey_number? }` | Edit profile                                                                       |
| DELETE | `/teams/:tId/opponents/:oId/pitchers/:pId` | —                                            | Remove profile (cascade to tendencies; orphan any games_pitched aggregation count) |
| POST   | `/teams/:tId/opponents/:oId/batters`       | `{ player_name, bats, jersey_number? }`      | Create batter profile standalone                                                   |
| PATCH  | `/teams/:tId/opponents/:oId/batters/:bId`  | `{ player_name?, bats?, jersey_number? }`    | Edit profile                                                                       |
| DELETE | `/teams/:tId/opponents/:oId/batters/:bId`  | —                                            | Remove profile                                                                     |

DELETE behavior for pitchers: nullify `opposing_pitchers.profile_id`
references rather than ON DELETE CASCADE — game-scoped opposing_pitcher
rows should survive (they're the historical pitch chart). Tendencies row
ON DELETE CASCADE is fine; it's pure aggregate.

DELETE behavior for batters: similar — nullify any
`scouting_report_batters.profile_id` (if such FK exists; verify during
implementation).

### Conflict handling

POST returns 409 if `normalized_name` already exists on this opponent team.
Web/mobile surfaces "A pitcher named X is already on this team's roster —
edit the existing one?" with a link to the existing row.

### Web UI

`packages/web/src/pages/OpponentDetail/OpponentDetail.tsx`:

- Section title "Pitchers" gains an inline **+ Add Pitcher** button (right-aligned).
- Click opens a modal with fields: `pitcher_name` (required), `throws` (radio
  L/R, default R), `jersey_number` (optional, integer).
- Each row in the existing roster gets edit (✎) and delete (🗑) icons that
  open the same modal in edit mode (or confirm-delete).
- Same pattern for "Batters" section: **+ Add Batter** button + per-row
  edit/delete, with fields: `player_name` (required), `bats` (radio L/R/S,
  default R), `jersey_number` (optional).

New service helpers in `packages/web/src/services/opponentsService.ts`
(add to existing file): `createOpponentPitcher`, `updateOpponentPitcher`,
`deleteOpponentPitcher`, and batter equivalents.

### Mobile UI

`packages/mobile/app/team/[id]/opponents/[opponentId].tsx`:

- Mirror the web pattern: header-row **+ Add Pitcher** / **+ Add Batter**
  buttons next to each section title.
- Tapping opens an inline form (same pattern as the
  `app/team/[id]/opponents/index.tsx` standalone team form — collapsible
  Card, not a modal) since RN Paper modals are awkward on small screens.
- Long-press on a roster row opens an action sheet: Edit / Delete.
  Alternatively, swipe-to-delete using `Swipeable` from
  `react-native-gesture-handler` — but action sheet is simpler and matches
  the team-edit pattern already in the app.

State plumbing in `packages/mobile/src/state/opponents/opponentsSlice.ts`:

- Add `addPitcher`, `updatePitcher`, `deletePitcher` thunks (and batter
  equivalents). Each updates `selectedOpponent.pitchers` / `.batters`
  optimistically with rollback on error.
- New API client methods on `opponents/api/opponentsApi.ts` mirroring the
  web service.

### Shared types

`packages/shared/src/index.ts`:

```ts
export interface CreateOpponentPitcherProfileParams {
    pitcher_name: string;
    throws: 'L' | 'R';
    jersey_number?: number | null;
}

export interface UpdateOpponentPitcherProfileParams {
    pitcher_name?: string;
    throws?: 'L' | 'R';
    jersey_number?: number | null;
}

export interface CreateBatterScoutingProfileParams {
    player_name: string;
    bats: 'L' | 'R' | 'S';
    jersey_number?: number | null;
}

export interface UpdateBatterScoutingProfileParams {
    player_name?: string;
    bats?: 'L' | 'R' | 'S';
    jersey_number?: number | null;
}
```

Plus check if `BatterScoutingProfile` currently has `jersey_number`; if not,
add it. Migration may be needed for that one column — small DDL.

## Implementation phases

Implement in this order, per CLAUDE.md "shared → backend → web → mobile":

### Phase 1 — shared + api (foundation)

1. Add the 4 new shared types (above).
2. Build shared (`npm run build` in `packages/shared`).
3. New controller methods in `opponentPitcherProfile.controller.ts` +
   matching service methods in `opponentPitcherProfile.service.ts`.
   Wire to existing `/teams/:teamId/opponents/:opponentId/pitchers` route
   prefix (add to `opponentPitcherProfile.routes.ts` or to
   `opponentTeams.routes.ts` — pick whichever has the parent prefix).
4. New controller + service for batter profiles. Likely under a new
   `batterScoutingProfile.controller.ts` + `.service.ts` if neither exists,
   or extend `scouting.service.ts` if cleaner.
5. New batter migration only if `jersey_number` column missing — verify first.
6. Unit/integration tests for the 6 new endpoints.
7. Bump `packages/api` minor (1.5.x → 1.6.0).

### Phase 2 — web

8. Add modal components for pitcher + batter (probably one shared
   `OpponentRosterMemberModal` keyed on a `kind: 'pitcher' | 'batter'` prop).
9. Wire `+ Add` buttons + per-row edit/delete on `OpponentDetail.tsx`.
10. Service helpers in `opponentsService.ts`.
11. Empty-state copy updates: drop "they appear after charting games" line
    in favor of "Add one now or chart a game to populate automatically."
12. Bump `packages/web` minor (1.0.x → 1.1.0).

### Phase 3 — mobile

13. Mirror the inline-form add UX in `app/team/[id]/opponents/[opponentId].tsx`.
14. Slice + API client methods in `state/opponents/`.
15. Action sheet (or modal) for edit/delete.
16. Same empty-state copy update.
17. Bump `packages/mobile` minor (1.95.x → 1.96.0), keep `app.json` in sync.

### Phase 4 — docs + verification

18. `/parity-check` after web + mobile both ship — confirm field sets, labels,
    edit/delete behavior match.
19. Change doc at `docs/changes/2026-05-12-standalone-opponent-roster.md`.
20. Update `docs/changes/README.md`.

## Verification checklist

- [ ] On web, navigate to `/teams/<tId>/opponents/<oId>` and add a pitcher
      without any game existing for that opponent. Refresh — row persists.
- [ ] Edit + delete that pitcher; both round-trip cleanly.
- [ ] Add a second pitcher with the same name → 409 + the existing pitcher's
      info surfaced inline.
- [ ] On mobile, same flow against the same opponent.
- [ ] Start a new game vs. that opponent — the manually-added pitcher
      appears as a selectable option in `OpposingPitcherModal` (verify the
      live-game lookup still works — it currently uses `getOrCreate` on the
      backend, so a manually-added profile should match by normalized name).
- [ ] Same flow for batters.
- [ ] No regressions: existing scouting-report batter-add still works,
      tendency recalc still works.

## Out of scope (deferred)

- Bulk roster paste / CSV upload.
- Pitcher arsenal pre-population (e.g., "this pitcher throws FB / SL /
  CH") — current schema doesn't capture arsenal separately from
  aggregated tendencies, and arsenal-as-coach-input would be a separate
  feature.
- A roster history / "former players" view.
- Standalone batter zone-weakness entry independent of a scouting report.
  Today zone weakness lives on `scouting_report_batters`; making it live
  on the profile directly would be a meaningful schema change. Defer.
