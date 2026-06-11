# iPad Web-Parity Layout (Landscape-Locked)

- **Date:** 2026-06-10
- **Type:** feat
- **Commit SHA:** `b604ec1`; follow-ups `e0bcf8a` (50/50 charting split), `f63df9d` (stacked collapse)
- **Version bumps:** `packages/mobile` 2.51.0 → 2.54.0; `app.json` 1.99.0 → 1.102.0

## Context

The mobile app already rendered a two-column **tablet** layout for the live-game screen
(`LiveGameTablet.tsx`), but its left panel was a literal placeholder ("Pitcher Stats / Total
Pitches: X") and the rich data (opposing pitcher, count breakdown, tendencies) lived behind modals.
The **web** app has a polished multi-panel pitch-tracking experience with an always-visible left
sidebar (PitcherStats table → BatterHistory → OpposingPitcher → CountBreakdown). The ask: make the
**iPad** look and flow mimic the web view across **all main screens**, as a **faithful port**,
while leaving the **phone (portrait) look completely untouched**.

Decided with the user: (1) scope = all main screens; (2) faithful sidebar port (inline panels, not
modals); (3) iPad **landscape-locked** (phone stays portrait), so iPad always gets the web-like
two-column layout.

## Plan (Decisions)

- **Orientation:** lock iPad to landscape, phone to portrait, via `expo-screen-orientation` in the
  root layout keyed off `useDeviceType().isTablet` (orientation-stable, uses `min(w,h)`). Set
  `ios.requireFullScreen: true` because iPadOS multitasking overrides app-level orientation locking
  when it's false. Chosen over a global `app.json` `orientation` (can't differ phone vs tablet).
- **Pattern:** reuse the established `XxxTablet`/`XxxPhone` split (proven by `live.tsx`) rather than
  a generic shell. Add one shared presentational primitive `TwoColumnLayout` for the lighter
  screens. New screens select on `isTablet` alone (landscape-lock makes `&& isLandscape`
  redundant).
- **DRY for the sidebar panels:** extract each modal body into a shared `*Content` component (the
  existing `TendenciesModals` convention) consumed by both the phone modal and the new inline iPad
  panel — instead of duplicating list/form rendering.
- Plan doc: `~/.claude/plans/need-to-design-the-merry-grove.md` (session plan).

## What shipped

### packages/mobile — orientation
- `package.json`: added `expo-screen-orientation` `~9.0.9`.
- `app.json`: `ios.requireFullScreen` `false → true`; `version` `1.99.0 → 1.100.0`.
- `app/_layout.tsx`: added a `useEffect` in `RootLayoutContent` that `ScreenOrientation.lockAsync`
  to `LANDSCAPE` on tablet / `PORTRAIT_UP` on phone (try/caught for iOS 26.2 beta safety).

### packages/mobile — Live Game sidebar (faithful port)
- **New** `src/components/live/BatterHistory/` — RN/Paper port of the web `BatterHistory`: AB/H/BB/K/AVG
  stat grid, recent at-bats with pitch-result-tinted pitch badges, and an "All Time / vs This
  Pitcher" toggle that flips the `pitcherId` query param. Fetches `/analytics/batter/:id/history`
  via the shared `api` axios instance directly (same one-off pattern `PitcherStats` uses; mobile has
  no analyticsService). Scouting-notes section intentionally omitted (no mobile equivalent).
- **Refactor** `OpposingPitcherModal/`: extracted `OpposingPitcherContent.tsx` (list + inline add
  form); `OpposingPitcherModal.tsx` now wraps it (phone, unchanged behavior — select still
  dismisses); **new** `OpposingPitcherPanel.tsx` renders it inline for the iPad sidebar (select just
  sets current pitcher).
- **Refactor** `CountBreakdownModal/`: extracted `CountBreakdownContent.tsx` (bucket cards; `active`
  prop gates the fetch, replacing the modal's `visible` gate); `CountBreakdownModal.tsx` wraps it
  (passes `active={visible}`); **new** `CountBreakdownPanel.tsx` renders it inline (always active,
  refetches on `refreshTrigger`).
- `src/components/live/index.ts`: export `BatterHistory`, `OpposingPitcherPanel`,
  `CountBreakdownPanel`.
- `app/game/[id]/LiveGameTablet.tsx`: replaced the placeholder + the Opp.-Pitcher/Counts toggle
  buttons with an always-visible inline panel stack inside a `ScrollView` — `PitcherStats` (reused
  as-is) → `BatterHistory` → `OpposingPitcherPanel` → `CountBreakdownPanel`, mirroring the web
  `LeftPanel`. Pitcher/Hitter **Tendencies** toggles kept (web gates those too). Pulled
  `dispatch`, `opposingPitchers`, `currentOpposingPitcher`, `statsRefreshTrigger` from the
  controller; removed the now-unused `setShowOpposingPitcherModal`/`setShowCountBreakdownModal`.
  `StrikeZone` `batterSide`/`pitcherThrows` props untouched (LHH/RHH mirroring preserved).
- `app/game/[id]/liveGameStyles.ts`: `statsPanel` padding moved to new `statsPanelContent` (sidebar
  is now a ScrollView); added `sidebarPanels` gap style.

#### Follow-up — 50/50 charting split (main panel)
- `app/game/[id]/LiveGameTablet.tsx`: restructured the main charting panel into a 50/50 row —
  **left** column is the strike zone (target) with its zone-tap hint and actual=target button;
  **right** column stacks **pitch type above result** (PitchTypeGrid → send-call/active-call →
  velocity → ResultButtons). Previously the zone was full-width with pitch type and result
  side-by-side below it; the split lets the coach see the full target and the results at once.
  `PitchBreakdown` moved to full-width below the row.
- `app/game/[id]/liveGameStyles.ts`: replaced the now-unused `controlsRow`/`controlsHalf` (tablet-only)
  with `chartingRow` (50/50, top-aligned) + `chartingCol` (flex 1).
- **Stacked collapse:** when the tendencies side rail is open (`showPitcherTendencies && currentPitcher`
  or `showHitterTendencies && currentBatter` — matching `TendenciesSideRail`'s render condition), the
  narrowed main panel collapses the 50/50 row to a single stacked column (`chartingRowStacked` +
  `chartingColStacked`, full-width each) so the zone and controls stay comfortably sized.

### packages/mobile — shared primitive
- **New** `src/components/common/TwoColumnLayout.tsx` (sidebar + main row, ~340px sidebar, divider
  matching the live-game stats panel); exported from `common/index.ts`.

### packages/mobile — other screens
- `app/game/[id]/replay.tsx`: extracted render pieces to consts (identical phone output); added an
  `isTablet` two-column branch — strike zone on the left, scrubber + pitch details on the right,
  with `BatterStrip` across the top (web-parity). Phone keeps the single stacked scroll.
- `app/(tabs)/index.tsx` (Dashboard): wrapped game-list items in a tablet grid-item
  (`flexBasis/minWidth 320`) so the existing wrap-grid forms clean columns across landscape width.
- `app/team/[id]/index.tsx`: extracted team-info / actions / roster into consts; iPad renders them
  via `TwoColumnLayout` (team info + actions in the left rail, roster on the right). Phone unchanged.
- `app/game/[id]/lineup.tsx`, `my-lineup.tsx`, `scouting-lineup.tsx`: added a `contentTablet`
  centered max-width (760) so the forms don't stretch full-bleed on landscape iPad.

## Verification

1. **Real iPad / TestFlight** (orientation differs from simulator; iOS 26.2 beta quirks): confirm
   iPad forces landscape and phone stays portrait; rotate to verify the lock holds; open Live Game
   and confirm the left sidebar shows PitcherStats → BatterHistory (toggle works) → OpposingPitcher
   (add/select/delete) → CountBreakdown, all inline. Walk Replay / Team / Dashboard / lineup screens.
2. **Phone smoke test:** confirm zero visual change to the phone layouts and that the
   OpposingPitcher / CountBreakdown modals still render and behave as before.
3. `/parity-check` vs web for PitcherStats columns, BatterHistory labels/toggle, CountBreakdown
   buckets + strike-% color thresholds, OpposingPitcher add-form. Confirm LHH/RHH mirroring intact.
4. `/check` (TypeScript + Jest) on `packages/mobile` — tsc clean, 37 tests pass.

## Out of scope (deferred)

- No changes to phone layouts or any `*Phone.tsx` / phone-facing modal behavior.
- No backend/API changes (BatterHistory endpoint + shared type already existed).
- BatterHistory scouting-notes subsection (web-only; no mobile `BatterScoutingNotes`).
- Android tablet styling polish (the orientation lock keys off `isTablet`, but tuning targeted iPad).
- `setup.tsx` is a placeholder stub — left as-is.
