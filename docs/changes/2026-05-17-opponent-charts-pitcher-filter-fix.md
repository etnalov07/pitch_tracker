# Fix: opponent-lineup Pitch Locations & Tendencies charts empty — drop the pitcher filter

- **Date:** 2026-05-17
- **Type:** `fix`
- **Commit SHA:** `4cc341d`
- **Version bumps:** `@pitch-tracker/web` 1.14.0 → 1.15.0.

## Context

The **Pitch Locations** and **Tendencies by Count** charts in the opponent-lineup
batter breakdown rendered nothing — while the Spray Chart and at-bat list worked.

An earlier change (`19f97f6`) reworked `getBatterPitchLocations` to resolve the
batter through `at_bats` — a sound robustness improvement, but **it did not fix
this symptom.** Reviewing a real game's data (`ac9dc7f5-…`) in `dump.sql`
disproved the assumed cause:

- 254 pitches: 125 to opponent batters, all with `opponent_batter_id`,
  `at_bat_id`, **and** `location_x/y` populated. The data was never the problem.

The real cause is a **pitcher filter** the charts shouldn't apply:

- `ViewerDashboard.tsx` (opponent-lineup panel) and `BatterBreakdownModal.tsx`
  passed `pitcherId` into `BatterBreakdownPanel`.
- `BatterRow` forwarded it to `getPitchLocations`, and `getBatterPitchLocations`
  applies `WHERE p.pitcher_id = $2`.
- So Pitch Locations + Tendencies only showed pitches from the **single
  selected pitcher** — empty for any opponent batter that pitcher didn't face.
  In `ac9dc7f5-…` the opponent lineup was pitched to by two of our pitchers
  (34 + 91 pitches), so a single-pitcher filter can only ever show a subset.
- The **Spray Chart** isn't pitcher-filtered (`getSprayChart` takes `gameId`,
  not `pitcherId`) — which is exactly why it worked while the other two didn't.

## Plan (Decisions)

- **Treat the opponent-lineup charts as a scouting view of the hitter.** They
  should reflect _every_ pitch the batter saw, across all our pitchers — the
  same scope the Spray Chart already uses. Single-pitcher scoping is what
  empties them.
- **Remove `pitcherId` end-to-end on the web side.** It was used _only_ to
  scope this one query; dropping it from `BatterBreakdownPanel` and its two
  call sites is a clean removal.
- **API left unchanged.** `getBatterPitchLocations` still accepts an optional
  `pitcherId` query param (no current caller passes it); not removed, to avoid
  a needless endpoint change. The `at_bats` join from `19f97f6` also stays — it
  remains a correct fallback for any data where `pitches.opponent_batter_id`
  isn't populated.

## What shipped

### `packages/web` (1.14.0 → 1.15.0)

- `components/performanceSummary/BatterBreakdownPanel/BatterBreakdownPanel.tsx` —
  removed the `pitcherId` prop (Props, `BatterRow`); `getPitchLocations` is now
  called with no pitcher scope.
- `components/liveGame/BatterBreakdownModal/BatterBreakdownModal.tsx` — removed
  the `pitcherId` prop; no longer forwards it to the panel.
- `pages/LiveGame/ViewerDashboard.tsx` — opponent-lineup `BatterBreakdownPanel`
  no longer passes `pitcherId`.
- `pages/LiveGame/LiveGame.tsx` — `BatterBreakdownModal` no longer passes `pitcherId`.

## Verification

1. **Checks:** `/check` — TypeScript + ESLint pass on web.
2. **Manual end-to-end:** open game `ac9dc7f5-2978-407d-98db-6054d8b6fe65` →
   batter breakdown → opponent lineup → expand a batter's **Charts** →
   **Pitch Locations** shows dots and **Tendencies by Count** shows the four
   count buckets, regardless of which pitcher is selected in the viewer.
3. **Regression:** the "Our Lineup" view (opponent-team-scoped) still works;
   the Spray Chart is unaffected.

## Out of scope (deferred)

- The opponent-lineup panel title still reads "Opponent Lineup vs. {pitcherName}".
  With the charts (and the at-bat list) no longer pitcher-scoped, that label is
  cosmetic-only and slightly misleading — left for a separate copy tweak.
