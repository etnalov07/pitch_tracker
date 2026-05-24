# Phase 2 — C continuation 3b — Extract layout components + render helpers + styles · 2026-05-23

**Type:** `refactor`
**Commit:** `067e9e9`
**Versions:** `mobile@2.16.0 → 2.17.0`

## Context

Final batch of the UX audit item C refactor (started 4 commits ago). `live.tsx` is now a 115-line orchestrator — down from 2921 lines at the start of Phase 2 (**-96%**). All the JSX, render helpers, styles, and layout-specific logic now live in single-concern sibling files.

Findings: closes `UX-LG-00`.

## Plan (Decisions)

- Split into 5 sibling files (styles, render helpers, two layouts, orchestrator).
- Each render helper takes `{ ctl }` or `{ ctl, actions }`; destructures only what it needs.
- Tablet vs phone layouts duplicate the verbatim Send Call / Velocity / Shake JSX rather than abstract further — the duplication is small and the layouts diverge enough elsewhere that it stays readable.
- Both layouts build the modalHandlers bag internally from `actions` rather than receiving it as a prop, so the orchestrator only has to pass two props.

Full plan: [`docs/plans/2026-05-23-phase2-c-cont-3b-layout-components.md`](../plans/2026-05-23-phase2-c-cont-3b-layout-components.md).

## What shipped

### packages/mobile (v2.17.0)

- NEW `app/game/[id]/liveGameStyles.ts` (~287 lines) — the StyleSheet from live.tsx, exported as `styles`. Imported by every layout + render-helper file.
- NEW `app/game/[id]/LiveGameRenderHelpers.tsx` (~393 lines) — 7 named component exports replacing the inline `render*` arrow functions:
  - `<PitchTypeFilterBar />` — read-only filter chips
  - `<PitchBreakdown />` — read-only breakdown table
  - `<ZoneTapHint />` — 1st-tap / 2nd-tap UX cue
  - `<ActualEqualsTargetButton />` — "pitch hit target" shortcut
  - `<LiveGameHeader />` — wraps `<GameHeader>` with all click handlers
  - `<AtBatControls />` — Start At-Bat button + "Select pitcher/batter" prompts
  - `<RunnerOutButton />` — Runner Adv / Runner Out buttons
  - `<LineupBanner />` — "My team lineup not set" banner
- NEW `app/game/[id]/LiveGameTablet.tsx` (~394 lines) — tablet landscape: two-column (stats panel + main panel). Mounts `<LiveGameModals>`, `<PreviousAtBatsModal>`, `<InPlayModal>`, `<EditResultModal>`, `<BatterBreakdownSheet>`.
- NEW `app/game/[id]/LiveGamePhone.tsx` (~316 lines) — phone / tablet portrait: single-column with thumb-zone-ordered tap path (StrikeZone → Send Call → Velocity → Result → Shake → Undo). Mounts `<LiveGameModals>`, `<PreviousAtBatsModal>`, `<InPlayModal>`, `<EditResultModal>` (no `<BatterBreakdownSheet>` — there's no trigger on the phone top bar).
- MODIFIED `app/game/[id]/live.tsx` — trimmed from 1386 → 115 lines. Now just:
  1. Hook calls.
  2. Conditional returns for loading / no-game / role-select.
  3. `{isTablet && isLandscape ? <LiveGameTablet/> : <LiveGamePhone/>}`.
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Manually confirmed `live.tsx` JSX rendering paths are unchanged: same conditional returns, same layout choice, same modal stack per layout.

## live.tsx running total — final

| Stage | live.tsx | Δ |
|---|---|---|
| Pre-Phase-2 (session 1 start) | 2921 | — |
| After C (partial — phone reorder) | 2921 | 0 |
| After C-cont 1 (controller hook, `35571a4`) | 2739 | -182 |
| After C-cont 2 (modals + topbar, `1bce870`) | 2534 | -205 |
| After C-cont 3a (actions hook, `ce80e01`) | 1386 | -1148 |
| **After C-cont 3b (this commit)** | **115** | **-1271** |
| **Total reduction** | | **-2806 (-96%)** |

Final file split for the live-game surface:

| File | Lines | Concern |
|---|---|---|
| `live.tsx` | 115 | Orchestrator: hooks + conditional returns + layout pick |
| `useLiveGameController.ts` | 562 | State, effects, derived values, WebSocket |
| `useLiveGameActions.ts` | 1302 | 25 action handlers + 3 helpers |
| `LiveGameTablet.tsx` | 394 | Tablet landscape layout |
| `LiveGameRenderHelpers.tsx` | 393 | 7 shared render components |
| `LiveGamePhone.tsx` | 316 | Phone / tablet portrait layout |
| `liveGameStyles.ts` | 287 | Shared StyleSheet |
| `LiveGameModals.tsx` | 281 | Modal Portal stack |
| `LiveGameTopBar.tsx` | 82 | Header bar |

Combined LOC: ~3732 (vs 2921 origin — +28% from destructure boilerplate + explicit dep arrays + small TS-prop ceremony). But the boundary between concerns is now sharp and each file is independently understandable.

## Out of scope (deferred / closed)

- `UX-LG-00` (live.tsx size & complexity) is now considered closed. Further per-screen UX work (e.g. consolidating the tendencies row, extracting a `<PitchCallRow>` if it gets more complex) is a separate audit-cycle item — this batch was specifically about file organization.
