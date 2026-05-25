# Phase 2 F — Tendencies side-by-side · 2026-05-25

**Type:** `refactor` (F1) + `feat` (F2)
**Commits:** `42161b5` + `b688faf` (F1) · `3d0a335` (F2)
**Versions:** `mobile@2.26.0 → 2.28.0` (one minor bump per sub-commit)

## Context

Phase 2 item F of the UX audit — findings **UX-TD-10** (PitcherTendenciesModal and HitterTendenciesModal duplicated ~80% of their scaffolding: Paper Portal+Modal wrapper, header with title/subtitle/close, scroll layout) and **UX-TD-11** / **UX-LG-11** (on iPad landscape there's plenty of room to render Tendencies beside the strike zone — opening a blocking modal that covers the live-game view is wasted real estate).

Forward-design plan: [`docs/plans/tendencies-buttons-situational-calls.md`](../plans/tendencies-buttons-situational-calls.md) (the original tendencies surface design). F is the follow-up that re-uses that surface in two layouts (modal on phone, side rail on tablet).

Two sub-items, shipped as independent commits — F1 is a pure refactor (no behavior change), F2 is the user-facing tablet UX win that depends on F1's content/wrapper split.

## Plan (Decisions)

**F1 — Extract a shared shell + content split (UX-TD-10).** Pull the duplicated Paper Portal+Modal scaffolding into `TendenciesModalShell` (header + close + optional toolbar slot + ScrollView body via children). Pull each modal's body + data fetching + handedness toggle into `*Content` components (`PitcherTendenciesContent`, `HitterTendenciesContent`) so the body is mountable outside the modal. Modal files collapse to thin shells.

**F2 — Tablet side rail (UX-TD-11 / UX-LG-11).** Reuse the F1 `*Content` components inline. Render them as a 340-px-wide right rail beside the main panel in `LiveGameTablet`. Each rail panel keeps its own header (title / subtitle / close ✕) so the coach can dismiss without leaving the live game. Phone keeps the modal — the two `*Modal` mounts in `LiveGameModals` are gated on `!isTablet` so the rail isn't a double-render. Sidebar buttons become toggles (`outlined ↔ contained`, `accessibilityState.selected`) so the same affordance that opens the panel also closes it.

Key tradeoff: a single side rail with both panels stacked (vertical scroll) instead of a third column per panel — keeps layout math trivial and the strike-zone column doesn't shift width when only one panel is active.

## What shipped

### F1 — Shell + content extraction (`42161b5` + `b688faf`, mobile 2.27.0)

Addresses **UX-TD-10**.

**packages/mobile**

- **NEW** `src/components/live/TendenciesModals/TendenciesModalShell.tsx` (~72 lines) — owns the Paper `<Modal>` wrapper, the header (title + subtitle + close ✕), the optional `toolbar` slot, and the `<ScrollView>` body. Children supply the actual content.
- **NEW** `src/components/live/TendenciesModals/PitcherTendenciesContent.tsx` (~167 lines) — body + `useEffect` fetch of `analyticsApi.getPitcherLiveTendencies` + the L/R handedness toggle. Toggle is exposed via a `renderToolbar` render-prop so the modal can mount it under the header _and_ the side rail can render it inline at the top of the body.
- **NEW** `src/components/live/TendenciesModals/HitterTendenciesContent.tsx` (~226 lines) — body + data fetching (analytics + scouting), scouting box, quick stats, zone-weakness map, pitch vulnerability bars, suggested-attack sequence.
- **REWRITTEN** `PitcherTendenciesModal.tsx`: **204 → 32 lines** (-84%). Now just `<TendenciesModalShell>` + `<PitcherTendenciesContent>`.
- **REWRITTEN** `HitterTendenciesModal.tsx`: **284 → 44 lines** (-85%). Same shape.
- `b688faf` — version-bump fixup commit (the original `42161b5` claimed `mobile 2.26.0 -> 2.27.0` in the commit message but the Edit to `package.json` failed silently on stale state, same pattern as E3's `dda0237` fixup).

No behavior change.

### F2 — Tablet side rail (`3d0a335`, mobile 2.28.0)

Addresses **UX-TD-11** / **UX-LG-11**.

**packages/mobile**

- **NEW** `app/game/[id]/TendenciesSideRail.tsx` (~125 lines) — tablet-only component. 340-px-wide right rail with a `<ScrollView>` that stacks the Pitcher and/or Hitter panels vertically. Each active panel mirrors the modal header (title, subtitle, close ✕) and mounts the corresponding `*Content` inline. Returns `null` when neither panel is active, so the rail collapses to zero width.
- `app/game/[id]/LiveGameTablet.tsx` — mounted `<TendenciesSideRail>` inside `tabletContent` after the main panel `<ScrollView>`. Destructured `showPitcherTendencies` / `showHitterTendencies` from `ctl`. Converted the two sidebar buttons to proper toggles (`mode={shown ? 'contained' : 'outlined'}`, `accessibilityState={{ selected: shown }}`, `onPress` flips the boolean).
- `app/game/[id]/LiveGameModals.tsx` — gated `<PitcherTendenciesModal>` and `<HitterTendenciesModal>` on `!isTablet` so phone keeps the modal stack and tablet uses the side rail.
- `src/components/live/TendenciesModals/index.ts` — exported `PitcherTendenciesContent` + `HitterTendenciesContent` from the barrel.
- `src/components/live/index.ts` — re-exported both content components alongside the existing tendencies modals.

## Verification

- `npx prettier --write` on all changed files — clean.
- `cd packages/mobile && npx tsc --noEmit` — clean after both commits.
- `cd packages/mobile && npm test` — 12/12 pass after both commits.
- Manual (deferred to dev/TestFlight):
    - **Tablet, iPad landscape:** in an in-progress game, tap the Pitcher button → the right rail appears with the Pitcher panel, the button switches to `contained`. Toggle L/R handedness inside the panel. Tap Hitter → the rail grows to stack both panels vertically. Close ✕ on either panel dismisses just that panel and the button returns to `outlined`. Confirm the strike zone is fully usable while the rail is open (no overlay covering it).
    - **Phone:** tap the Pitcher button → modal appears as before (no rail). Hitter same.
    - **Charting mode `opp_pitcher`:** initial handedness uses `currentMyBatter.bats`, not the opposing-team batter.

## Phase 2 status after this batch

| Item  | Title                       | Status                     |
| ----- | --------------------------- | -------------------------- |
| A     | Design tokens               | Shipped                    |
| B     | Pitch calling consolidation | Pending (biggest)          |
| C     | Live screen refactor        | Shipped                    |
| D     | New Game flow alignment     | Pending (needs user input) |
| E     | In-play modal cleanup       | Shipped                    |
| **F** | **Tendencies side-by-side** | **Shipped**                |
| G     | Snackbar lib eval           | Closed                     |
| H     | Scoreboard aesthetic        | Declined                   |
| I     | Bullpen feature parity      | Pending                    |
| J     | Mobile role routing         | Shipped                    |
| K     | Heat-zone parity            | Shipped                    |

## Out of scope (deferred)

- **Three-column layout per panel** (Pitcher panel as its own column, Hitter as another) — would let each panel be wider but forces the strike-zone column to re-flow when panels toggle. Vertical stack inside a single rail is simpler and ships now; a layout split can come later if coaches ask for more width.
- **Persisting panel state across at-bats** — closing the panel always returns to closed when the batter changes (existing behavior, no regression). A "pin Pitcher tendencies for whole inning" preference is a future polish item.
- **Web side-by-side parity** — UX-TD-11 / UX-LG-11 are mobile-only callouts. Web's live-game layout already shows tendencies in a side column.
- **Bumping `packages/shared`'s version** (per memory: never bump shared; api/web pin at 1.0.0).
