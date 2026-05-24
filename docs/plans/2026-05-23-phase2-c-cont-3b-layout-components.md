# Phase 2 — C continuation 3b — Extract `LiveGameTablet` + `LiveGamePhone` + shared render helpers

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, item C (continuation 3b/2 — final batch)
**Findings addressed:** closes `UX-LG-00` (live.tsx size)

## Context

3a moved all handlers into `useLiveGameActions`. The last 1300 lines of `live.tsx` were render helpers + tablet/phone JSX + StyleSheet. This batch (3b) pulls them apart into single-concern files, leaving `live.tsx` as a thin orchestrator that picks the layout and handles a few conditional-return states.

After this batch, the entire live-game surface is composed of small, focused files. Each file is independently understandable; no file is larger than ~1300 lines.

## Plan (Decisions)

Split into 5 sibling files, all using shared types from the controller and actions hooks:

1. **`liveGameStyles.ts`** — the StyleSheet block (~290 lines). Exported as `styles`. Imported by every layout + helper file.
2. **`LiveGameRenderHelpers.tsx`** — 7 small render components that were inline `render*` arrow functions:
   - `<PitchTypeFilterBar />` — read-only filter chips
   - `<PitchBreakdown />` — read-only breakdown table
   - `<ZoneTapHint />` — 1st-tap / 2nd-tap UX cue
   - `<ActualEqualsTargetButton />` — "pitch hit target" shortcut
   - `<LiveGameHeader />` — wraps `<GameHeader>` with all click handlers wired up
   - `<AtBatControls />` — Start At-Bat button + "Select pitcher/batter" prompts
   - `<RunnerOutButton />` — Runner Adv / Runner Out buttons
   - `<LineupBanner />` — "My team lineup not set" banner
3. **`LiveGameTablet.tsx`** — tablet landscape layout. Takes `{ ctl, actions }`. Builds the modalHandlers bag internally.
4. **`LiveGamePhone.tsx`** — phone (and tablet portrait) layout. Same shape.
5. **`live.tsx`** — orchestrator. Loading / no-game / role-select conditional returns + `{isTablet && isLandscape ? <Tablet/> : <Phone/>}`.

Each render helper takes `{ ctl }` or `{ ctl, actions }` and destructures only the keys it needs. Some duplication of inline JSX between tablet and phone (Send Call row, Velocity row, Shake button) is preserved verbatim — extracting those too would be more abstraction than the difference warrants.

## Scope — files touched

### packages/mobile (v2.16.0 → v2.17.0)

- NEW `app/game/[id]/liveGameStyles.ts` (~287 lines)
- NEW `app/game/[id]/LiveGameRenderHelpers.tsx` (~393 lines)
- NEW `app/game/[id]/LiveGameTablet.tsx` (~394 lines)
- NEW `app/game/[id]/LiveGamePhone.tsx` (~316 lines)
- MODIFIED `app/game/[id]/live.tsx` — trimmed from 1386 → ~115 lines.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

## live.tsx running total

| Stage | live.tsx |
|---|---|
| Pre-Phase-2 (session 1 start) | 2921 |
| After C-cont 1 (controller hook) | 2739 |
| After C-cont 2 (modals + topbar) | 2534 |
| After C-cont 3a (actions hook) | 1386 |
| **After C-cont 3b (layouts, this commit)** | **~115 (-96% from origin)** |

Final split:
- `live.tsx` (~115) — orchestrator
- `useLiveGameController.ts` (562) — state, effects, derived
- `useLiveGameActions.ts` (1302) — handlers + helpers
- `LiveGameModals.tsx` (281) — modal stack
- `LiveGameTopBar.tsx` (82) — header bar
- `LiveGameTablet.tsx` (~394) — tablet landscape layout
- `LiveGamePhone.tsx` (~316) — phone / tablet portrait layout
- `LiveGameRenderHelpers.tsx` (~393) — 7 shared render components
- `liveGameStyles.ts` (~287) — shared StyleSheet

## Out of scope (deferred / closed)

- `UX-LG-00` is now considered closed for this audit pass. Further per-screen UX work (e.g. swapping the tendencies row to a single horizontal sheet, or pulling the Send Call row into its own component) is a separate audit-cycle item, not a code-organization issue.
