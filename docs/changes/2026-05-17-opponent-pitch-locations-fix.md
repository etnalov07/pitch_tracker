# Fix: Pitch Locations & Tendencies by Count empty for the opponent lineup

- **Date:** 2026-05-17
- **Type:** `fix`
- **Commit SHA:** _pending — backfilled after commit_
- **Version bumps:** `@pitch-tracker/api` 1.13.0 → 1.14.0.

## Context

In the batter breakdown panel, expanding a batter's **Charts** shows three
charts. For the **opposing team's lineup**, the **Pitch Locations** and
**Tendencies by Count** charts rendered nothing — while the **Spray Chart** and
the pitch-by-pitch at-bat list worked (confirmed with the user).

Both empty charts are fed by the same data in `BatterBreakdownPanel.tsx`:
`pitchLocations`, the result of `getPitchLocations` →
`GET /analytics/batter/:batterId/pitch-locations` →
`analyticsService.getBatterPitchLocations()`.

`getBatterPitchLocations` filtered the **`pitches` table directly** —
`WHERE (p.batter_id = $1 OR p.opponent_batter_id = $1)`. For an opponent batter
`$1` is an `opponent_lineup.id`, which only matches if `pitches.opponent_batter_id`
is populated with that id — and it is not reliably populated for opponent
at-bats (legacy rows / charting paths that link the pitch to the at-bat only).

The two queries that _worked_ resolve the batter through the **`at_bats`** table,
which reliably carries `opponent_batter_id`:

- `getBatterBreakdown` (`performanceSummary.service.ts`) — `at_bats ON ab.opponent_batter_id = ol.id`, then `pitches ON p.at_bat_id = ab.id`.
- `getBatterSprayChart` (`analytics.service.ts`) — `WHERE (ab.batter_id = $1 OR ab.opponent_batter_id = $1)`.

`getBatterPitchLocations` was the only one of the three that shortcut through
the `pitches` table's own batter columns — that shortcut was the bug.

## Plan (Decisions)

- **Query-side fix, no data migration.** Resolve the batter through `at_bats`
  (the proven-reliable linkage), so the fix covers all existing data — legacy,
  mobile-charted, and web-charted — without a backfill.
- **Keep the `p.*` terms.** The first filter retains `p.batter_id` /
  `p.opponent_batter_id` and _adds_ the `at_bats` columns, so our-team batters
  (which already matched via `p.batter_id`) carry zero regression risk.
- **`LEFT JOIN`**, so a pitch with no `at_bat_id` is never dropped.
- Scoped to `getBatterPitchLocations` only. Two sibling methods
  (`getBatterPitchHeatMap`, `getHitterLiveTendencies`) have the same latent
  shortcut but feed different, unreported views — left alone (see below).

## What shipped

### `packages/api` (1.13.0 → 1.14.0)

- `src/services/analytics.service.ts` — `getBatterPitchLocations`:
    - `FROM` clause now `LEFT JOIN at_bats ab ON ab.id = p.at_bat_id` (both the
      no-scope and the `games`-join branches).
    - First filter broadened from `(p.batter_id = $1 OR p.opponent_batter_id = $1)`
      to also match `ab.batter_id = $1 OR ab.opponent_batter_id = $1`.
- `src/services/__tests__/analytics.service.test.ts` — new `getBatterPitchLocations`
  describe block: verifies the `at_bats` join + `ab.opponent_batter_id` match,
  the retained `p.batter_id` path, the `games` join under opponent-team scope,
  and row mapping.

## Verification

1. **Unit test:** `cd packages/api && npx jest analytics.service` — 25 tests pass, including the 4 new ones.
2. **Manual end-to-end:** open a game with the opposing team's lineup charted →
   batter breakdown → expand an opponent batter's **Charts** → **Pitch Locations**
   shows pitch dots and **Tendencies by Count** shows the four count buckets
   populated.
3. **Regression:** our-team lineup charts still render (the `p.batter_id` term
   is retained); the "Our Lineup" opponent-scoped view (`opponentTeamId` /
   `opponentName`, with the `games` join) still works.

## Out of scope (deferred)

Two sibling analytics methods have the same latent shortcut but feed different
views the user did not report — flagged, not changed, to keep the fix tight:

- `getBatterPitchHeatMap` — same `(p.batter_id = $1 OR p.opponent_batter_id = $1)` pattern.
- `getHitterLiveTendencies` — switches directly on the `opponent_batter_id` vs `batter_id` column.

## Known pre-existing gaps (unchanged)

- `packages/api/src/__tests__/scoutingFlow.integration.test.ts` — integration test fails on a clean checkout (needs a live DB).
