# Postgame opponent-attack summary + pitcher zone effectiveness

- **Date:** 2026-05-10
- **Type:** feat
- **Commit:** `e102759`
- **Versions:** web `0.92.0` → `0.93.0`, mobile `1.89.0` → `1.90.0`

## Context

The existing Summary tab (web `ViewerDashboard.tsx`, mobile `app/game/[id]/viewer.tsx`) showed per-pitcher PerformanceSummary cards but said nothing about how the opponent attacked our hitters or what worked vs. failed for our offense. The user wanted a postgame view that surfaces:

1. How the opposing pitcher(s) sequenced and located against our lineup as a whole.
2. How they attacked **each** of our hitters individually.
3. Which pitches we hit (and how) versus which pitches got us out.
4. For our own pitchers (extension): zone-level "what worked / what didn't" beyond the pitch-type strike%/velocity rollup.

All raw material existed already — `pitches.location_x/y`, `target_zone`, `pitch_type`, `pitch_result`, `at_bats.result`, the existing `getMyTeamBatterBreakdown(gameId)`. The work was aggregation + narrative + UI.

## Decisions

- **Backend**: one new aggregation method `getOpponentAttackSummary(gameId)` returning a `TeamOffenseSummary` (team rollup + per-hitter rollup + outcome buckets). Optional cached row in `performance_summaries` keyed by `source_type='team_offense'`, `pitcher_id NULL` for narrative persistence.
- **Pitcher extension**: extend `gatherGameStats` to bucket each pitch-type into outcome groups (whiff / called strike / weak contact / hard contact) per zone. Surface as `per_zone_outcomes` on the existing `pitch_type_breakdown`.
- **Frontend**: new `OpponentAttackSummaryView` (web + mobile) with team narrative + charts, per-hitter accordion, outcome-bucket cards. Slot above the existing pitcher cards in the Summary tab. Pitcher zone-effectiveness mini-cards extend `PerformanceSummaryCard`.
- **Narrative**: AI-generated 2–4 sentence paragraph via the same Anthropic SDK + env var (`ANTHROPIC_API_KEY`) that powers the existing pitcher narratives. Cached in `performance_summaries`.

## Data model — new shared types

Added to `packages/shared/src/index.ts`:

- `PitchTypeMix`, `ZoneHistogram`, `CountSituationStat`, `OutcomePitchSlice`, `OutcomePitchGroup`, `PerHitterAttack`, `TeamOffenseSummary`
- `PitcherZoneOutcome` (whiff %, called-strike %, hard-contact %, weak-contact %)
- `pitch_type_breakdown[*].per_zone_outcomes?: PitcherZoneOutcome[]` field added to `PitchTypeSummary`
- `'team_offense'` added to `SummarySourceType`

## What shipped

### API

- Migration `packages/api/src/migrations/033_team_offense_summary.sql` — adds `'team_offense'` to `source_type` CHECK + partial unique index for one row per game.
- `services/performanceSummary.service.ts`:
    - New `getOpponentAttackSummary(gameId)` — reuses the SQL pattern from `getMyTeamBatterBreakdown` plus in-memory aggregation. Bucketing rules for count situations and outcome groups documented inline.
    - New `regenerateTeamOffenseNarrative(gameId)` synchronous regen.
    - New private `generateTeamOffenseNarrative(gameId, summary)` — fire-and-forget Anthropic call; caches into `performance_summaries`.
    - Extended `gatherGameStats` with a per-pitch-type/zone outcome buckets (computed via new `computeZoneOutcomes` helper).
- `controllers/performanceSummary.controller.ts` + `routes/performanceSummary.routes.ts`:
    - `GET /performance-summaries/game/:gameId/opponent-attack`
    - `POST /performance-summaries/team-offense/:gameId/regenerate-narrative`

### Web

- New `packages/web/src/components/performanceSummary/OpponentAttackSummary/` (component + styles + barrel).
- Slot into Summary tab in `pages/LiveGame/ViewerDashboard.tsx` above existing pitcher cards.
- `PerformanceSummaryCard.tsx` — new "What worked / what got hit (by zone)" mini-cards per pitch type (top 3 best zones by whiff+called%, top 3 hurt zones by hard-contact %).
- `services/performanceSummaryService.ts` — `getOpponentAttackSummary`, `regenerateTeamOffenseNarrative`.

### Mobile

- New `packages/mobile/src/components/performanceSummary/OpponentAttackSummaryView.tsx`.
- Slot into Summary tab in `app/game/[id]/viewer.tsx` above pitcher view.
- `state/performanceSummary/api/performanceSummaryApi.ts` — same two new methods.

## Verification / migration

1. Run `033_team_offense_summary.sql` on the prod DB.
2. Confirm `ANTHROPIC_API_KEY` is set (already used by pitcher narratives).
3. Open a completed game's Summary tab on web. Verify the new section renders with pitch-mix chips, attack-zone heatmap, count-situation table, what-worked/what-got-out chips, and per-hitter accordion. Click "Regenerate narrative" — paragraph should appear.
4. Mobile: same game's viewer Summary tab — verify parity.
5. Open a pitcher's PerformanceSummary — verify per-pitch-type per-zone outcome mini-cards render.
6. Tests: API 490/490 pass, mobile 5/5 pass.

## What this enables for old games

No backfill required. Aggregation is computed on-demand from raw `pitches`/`at_bats`. Every completed game's Summary tab picks up the new section automatically once the migration is applied and code is deployed.

Caveats for older games (graceful degradation, not failure):

- Games charted before pitch-location capture: zone heatmap collapses into the 'UNK' bucket; everything else still works.
- At-bats missing `batter_id` are skipped (`WHERE ab.batter_id IS NOT NULL`).
- Pitches without `pitch_result` or at-bats without `result` won't bucket into outcome groups.

## Out of scope (deferred)

- Cross-game trends.
- LHH/RHH split rollup as a separate view.
- Spray-chart integration on outcome buckets.
- Coach-tagged "key moments."

## Follow-ups

- **Migration `035_widen_performance_summaries_source_type.sql`**: Migration 033 added `'team_offense'` (12 chars) to the source_type CHECK constraint but left the column as `VARCHAR(10)` from migration 011. Prod hit `22001 value too long for type character varying(10)` on the first team-offense narrative insert (`generateTeamOffenseNarrative`). Widened `performance_summaries.source_type` to `VARCHAR(32)`. **Apply 035 on prod.**
