# Pitcher Performance Report · 2026-05-25

**Type:** `feat`
**Commit:** _(pending)_
**Versions:** `shared@1.0.0 (unchanged)` · `api@1.17.0 → 1.18.0` · `web@1.24.0 → 1.25.0` · `mobile@2.20.0 → 2.21.0`

## Context

Coaches asked for a single "run-the-report" view of a pitcher's performance: overall stats, a game log, what's working well, where they've been successful, what they're struggling with, trends, and a velocity trend when velocity is being recorded.

All the per-game pieces already existed — single-game stats + Claude narrative + zone effectiveness in `performanceSummary.service.ts`, `PerformanceSummaryCard`, web `PitcherProfile`. What was missing: **cross-game aggregation, a velocity-over-time trend, trend detection across recent outings, and a Claude narrative that synthesizes across games (not just one outing)**. Mobile had no PitcherProfile-equivalent at all.

## Plan (Decisions)

- **Dedicated new report surface on both web + mobile** (per user choice — not extending PitcherProfile).
- **Last 10 games as default**, with a chip selector for `5 / 10 / 20 / Season / All time` (per user choice).
- Extends `performance_summaries` table with `source_type='pitcher_report'` + `window_key` column for cache keying — no new tables, no new endpoints beyond `/analytics/pitcher/:id/report`.
- Reuses Claude infra exactly: `claude-haiku-4-5-20251001`, fire-and-forget + explicit regenerate, client poll every 3 s × 10 attempts.
- Velocity trend rendered only when at least one game in the window has velocity data — hidden cleanly otherwise.

Full plan: scratch plan file `wobbly-napping-glade.md` (approved this session; archived to `docs/plans/2026-05-25-pitcher-performance-report.md` separately).

## What shipped

### packages/shared (no version bump — pinned at 1.0.0)

- `src/index.ts`: new exported types — `PitcherReportWindow`, `VelocityTrendPoint`, `PitcherTrendKind`, `PitcherTrendDirection`, `PitcherTrendCallout`, `PitcherReportPitchTypeRow`, `PitcherReportZoneRow`, `PitcherReportGameLogRow`, `PitcherReportStats`, `PitcherReportPayload`. Rebuild required.

### packages/api (v1.18.0)

- **NEW** `src/migrations/045_pitcher_report_source.sql`: widens `performance_summaries_source_type_check` to include `'pitcher_report'`, adds `window_key VARCHAR(16)`, adds partial unique index on `(pitcher_id, window_key) WHERE source_type='pitcher_report'`.
- **NEW** `src/services/pitcherReport.service.ts`: cross-game aggregation, velocity-trend computation, trend detection (last 3 vs prior N for velocity / strike% / command / whiff / first-pitch-strike with hardcoded thresholds), and Claude narrative generation. Reuses `aggregateAccuracy()` (now exported from `performanceSummary.service.ts`). Persists to `performance_summaries` keyed by `(pitcher_id, window_key)`.
- MODIFIED `src/services/performanceSummary.service.ts`: exported `aggregateAccuracy` (no behavior change).
- MODIFIED `src/controllers/analytics.controller.ts`: added `getPitcherReport` + `regeneratePitcherReportNarrative` methods with window validation (defaults to `'last10'`).
- MODIFIED `src/routes/analytics.routes.ts`: registered `GET /analytics/pitcher/:pitcherId/report` + `POST /analytics/pitcher/:pitcherId/report/:window/regenerate-narrative`.

### packages/web (v1.25.0)

- **NEW** `src/pages/PitcherReport/PitcherReport.tsx`: dedicated page at `/teams/:team_id/pitcher/:pitcher_id/report`. Coach's summary (narrative + Regenerate button, polls every 3 s up to 10 attempts), 8-tile stat grid, inline-SVG velocity trend chart (avg + top lines, hidden when no velocity data), trend call-outs with up/down arrows, pitch arsenal + zone effectiveness tables with Working / Mixed / Struggles tags, click-through game log. Inline subcomponents + Emotion styled-components — no new deps.
- **NEW** `src/services/pitcherReportService.ts`: thin wrapper over the two new endpoints.
- MODIFIED `src/App.tsx`: imports + registers the new route.
- MODIFIED `src/pages/PitcherProfile/PitcherProfile.tsx`: added a "View Performance Report →" button in the header.

### packages/mobile (v2.21.0)

- **NEW** `app/pitcher/[id]/report.tsx`: Expo Router screen mirroring the web layout. Uses Paper `Chip` for window selector, `react-native-svg` (already a dep) for the velocity chart, same narrative polling + regenerate semantics. Click a game-log row → `/game/${id}`. Dynamic route cast as `any` per mobile rules.
- MODIFIED `src/state/analytics/api/analyticsApi.ts`: added `getPitcherReport` + `regeneratePitcherReportNarrative` methods.
- MODIFIED `src/components/live/PitcherStatsModal/PitcherStatsModal.tsx`: added a "Performance Report" button that navigates to `/pitcher/${pitcherId}/report`.
- MODIFIED `app/_layout.tsx`: registered `pitcher/[id]/report` Stack screen.

### docs/changes

- This doc, plus a new row in `docs/changes/README.md`.

## Verification

1. **Migration**: apply `045_pitcher_report_source.sql` locally. `\d performance_summaries` shows the updated CHECK + new `window_key` column + partial unique index `idx_performance_summaries_pitcher_report`.
2. **Shared rebuild**: `cd packages/shared && npm run build` clean.
3. **Type checks**: `npx tsc --noEmit` clean in api / web / mobile.
4. **Web ESLint**: clean.
5. **Mobile Jest**: 12/12 still pass.
6. **End-to-end (web)**: pick a pitcher with ≥10 games. Visit `/teams/:team_id/pitcher/:pitcher_id/report`. Default window `last10`, switch through all 5 windows, narrative initially shows "Generating…" and lands within ~10 s, velocity chart hidden if no velocity, trend call-outs match the underlying numbers, game-log rows click through to `/game/:id`, Regenerate replaces narrative.
7. **End-to-end (mobile)**: open the same pitcher's report via the `PitcherStatsModal` "Performance Report" button (or directly via `/pitcher/[id]/report`). Same flow works.
8. **Regression**: existing per-game `PerformanceSummaryCard` narratives, opponent attack summary, scouting narrative, postgame email report all still work (different `source_type` values — unchanged code paths).
9. **Edge cases**: pitcher with 0 games → empty state, no Claude call. Pitcher with 1 game → narrative + stats render. Pitcher with no velocity in any window game → velocity chart cleanly hidden.

## Out of scope (deferred)

- **Public / shareable URL** for the pitcher report (like `/report/:gameId`). Worth doing as a follow-up.
- **Email export** of the pitcher report.
- **Per-pitch-type narrative** (e.g. dedicated curveball coaching paragraph).
- **League / team comparisons**.
- **Configurable trend thresholds** in UI.
- **Bullpen sessions in the report** — they live on `PitcherProfile` today.
- **Cache invalidation on new pitch logged** — stats refresh on every GET, but narrative stays cached until Regenerate.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
