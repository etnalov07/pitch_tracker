# Feat: Live-game Batter Breakdown button (web + mobile)

| Date       | Type | Commit  | Versions                                                       |
| ---------- | ---- | ------- | -------------------------------------------------------------- |
| 2026-05-11 | feat | pending | api 1.2.0 → 1.3.0, web 0.98.0 → 0.99.0, mobile 1.93.0 → 1.94.0 |

## Context

During live charting, the coach had no in-app shortcut to "how have we been
attacking this batter so far?" The Batter Breakdown view existed only on the
post-game Performance Summary tab. The user wants a one-tap action from the
live screen that opens the full Batter Breakdown for the game, auto-scrolled to
the current batter, with the per-row Charts toggle intact.

Forward-design plan lives at
[`docs/plans/2026-05-10-super-user-and-signup-modes.md`](../plans/2026-05-10-super-user-and-signup-modes.md)
is unrelated; this slice has no forward-design doc because it was scoped and
approved interactively in the same session.

## Decisions

- **Surface the full lineup, not just the current batter.** The button opens a
  modal/sheet that renders every opponent batter from the game. The current
  batter's row is auto-scrolled into view on open, all rows are expanded by
  default, and the coach can swipe to other batters. This reuses the existing
  `BatterBreakdownPanel` on web verbatim — only a new `scrollToBatterId` prop.
- **Mobile is a fresh build.** Mobile had no Batter Breakdown component before;
  this slice ships a native sheet with collapsible per-batter rows, pitch-chip
  AB sequences, and a Charts toggle that lazy-loads the spray chart only.
  Heat map and tendencies are explicitly deferred.
- **Reuse the existing endpoint.** `GET
/bt-api/performance-summaries/game/:gameId/batter-breakdown` already returns
  the full opponent lineup. One fix: the query was `INNER JOIN` from
  `opponent_lineup → at_bats → pitches`, so a batter without any ABs yet (the
  most common live case for the current batter) wouldn't appear. Changed those
  three joins to `LEFT JOIN`, added `NULLS FIRST` to the inning ORDER BY, and
  guarded the aggregation against null `at_bat_id` / null `pitch_number` rows
  so a no-AB batter is returned with `at_bats: []`.
- **Button placement.** Top action bar, next to the Scouting Report button on
  both platforms. Web button is a `SwapButton` labeled "🪧 Batter Breakdown";
  mobile is an `IconButton` with the `account-search` icon.

**Tradeoff accepted:** the panel on web renders all three Charts subviews
(spray + heat + tendencies) per batter; mobile only renders spray. Web is also
the only surface that auto-scrolls — mobile relies on `FlatList.scrollToIndex`
which is best-effort and falls back to an offset-based scroll if the list isn't
fully laid out on first attempt.

## What shipped

### packages/api

- `src/services/performanceSummary.service.ts` — `getBatterBreakdown` SQL: three
  `INNER JOIN`s flipped to `LEFT JOIN` (`opponent_lineup → at_bats → innings →
pitches`), `ORDER BY i.inning_number NULLS FIRST` added. Aggregation now
  short-circuits when `row.at_bat_id` or `row.pitch_number` is null, so a
  batter with no charted ABs still appears with `at_bats: []`. The sibling
  `getMyTeamBatterBreakdown` is unchanged.
- `package.json` — `1.2.0` → `1.3.0`.

### packages/web

- `src/components/performanceSummary/BatterBreakdownPanel/BatterBreakdownPanel.tsx`
  — added optional `scrollToBatterId?: string` prop. `BatterRow` now takes a
  ref on its container; a `useEffect` calls `scrollIntoView({ behavior:
'smooth', block: 'start' })` when the row's batter matches. All rows remain
  expanded by default. No other behavioral change.
- `src/components/liveGame/BatterBreakdownModal/` — new component folder (3
  files: `BatterBreakdownModal.tsx`, `styles.ts`, `index.ts`). Overlay + Modal
  pattern, click outside to dismiss, header shows the current batter's name,
  body renders `BatterBreakdownPanel` with a single section containing all
  batters and the new `scrollToBatterId` prop. Reuses
  `performanceSummaryService.getBatterBreakdown`.
- `src/pages/LiveGame/LiveGame.tsx` — added `🪧 Batter Breakdown` button to
  the top action bar (between Scouting Report and Settings), `showBreakdown`
  local state, and a conditional `<BatterBreakdownModal>` render at the
  modal-rendering tier. Passes `gameId`, `currentPitcher.player_id`,
  `currentBatter.id`, and `currentBatter.player_name`.
- `package.json` — `0.98.0` → `0.99.0`.

### packages/mobile

- `src/components/batterBreakdown/` — new folder, 4 components + barrel: - `BatterBreakdownSheet.tsx` — full-screen `Modal` (slide animation),
  header with batter name + close icon, legend row, hint row, and a
  `FlatList` of `BatterRow` sorted by batting order.
  `scrollToIndex({ animated, viewPosition: 0 })` on mount with a
  `onScrollToIndexFailed` fallback that calls `scrollToOffset` using
  `averageItemLength`. Fetches via existing
  `performanceSummaryApi.getBatterBreakdown`. - `BatterRow.tsx` — RN port: order badge, name + meta (`pos · LHH/RHH ·
N AB · M P`), expand/collapse, Charts toggle. Lazy-loads spray chart
  via existing `analyticsApi.getSprayChart`. Tendencies + heat map are
  not included (deferred). - `PitchChip.tsx` — RN port of the web `PitchCardItem`: 44px-wide
  colored chip with count · pitch abbrev · result label · velocity ·
  target zone. Same `RESULT_COLOR` palette as web. AB-ending pitches get
  a yellow border. - `BatterSprayChart.tsx` — RN port of `BatterSprayChartView` using
  `react-native-svg` (already a dep). Same field geometry, hit-location
  buckets, trajectory shapes per contact type, and contact-type legend.
- `app/game/[id]/live.tsx` — added `account-search` `IconButton` to both
  `headerRight` blocks (tablet landscape and phone/portrait), `showBreakdown`
  state, and `BatterBreakdownSheet` render alongside `InPlayModal` in both
  layout closures.
- `package.json` + `app.json` — `1.93.0` → `1.94.0` (kept in sync).

### packages/shared

No changes. `BatterBreakdown`, `BatterAtBatSummary`, `BatterAtBatPitch`, and
`SprayChartData` were already exported.

## Verification

1. **Web**:
    - `cd packages/api && npx tsc --noEmit` — clean.
    - `cd packages/web && npx tsc --noEmit` — clean.
    - `cd packages/web && npx eslint src/pages/LiveGame/LiveGame.tsx` — clean.
    - Start a game in dev, chart 2–3 ABs vs opponent batter #2, advance the
      inning, return to batter #2. Tap "🪧 Batter Breakdown" in the action
      bar. Confirm the modal opens, batter #2 is scrolled into view, prior
      AB pitches render with correct colors. Tap "📊 Charts" on the row to
      verify spray/heat/tendencies still render (unchanged behavior).
    - Edge case: open the modal at the very top of the first inning (no ABs
      charted). Confirm the panel renders with all batters and empty AB
      lists, no crash.
2. **Mobile**:
    - `cd packages/mobile && npx tsc --noEmit` — clean.
    - `cd packages/mobile && npx jest --no-coverage` — 5/5 pass.
    - On iOS sim: open a live game, chart 2 ABs vs an opposing batter, advance
      the inning, return. Tap the `account-search` icon in the header.
      Confirm the sheet opens, current batter row is scrolled into view, pitch
      chips render with the correct color scheme. Tap "📊 Spray" on the row
      → spray chart renders inside the row. Dismiss → live screen state
      intact (count, runners, current AB).

## Out of scope (deferred)

- Mobile heat map + tendencies subviews. Web has all three under Charts;
  mobile V1 ships spray only.
- Cross-game scouting view ("how this batter was attacked in prior games").
  The current endpoint is game-scoped only.
- Backend `playerId` filter on the breakdown endpoint. Client-side scroll
  into view covers the live use case without a backend change.
- Promoting `RESULT_COLOR` / `RESULT_LABEL` to `@pitch-tracker/shared`. Both
  the web and mobile components carry their own copies today; consolidating
  is a candidate cleanup, not blocking.
- Auto-collapsing non-current batters. Default-expanded matches the postgame
  UX; coaches can collapse manually.
