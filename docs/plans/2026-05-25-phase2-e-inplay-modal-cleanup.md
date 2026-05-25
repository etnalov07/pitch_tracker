# Plan — Phase 2 E: In-play modal cleanup

**Status:** Shipped (3 commits)
**Phase:** UX Audit Phase 2 — Item E
**Findings addressed:** `UX-IP-02` (partial) · `UX-IP-03` · `UX-IP-07` · `UX-IP-08` · `UX-IP-09` · `UX-IP-15`
**Change doc:** [`docs/changes/2026-05-25-phase2-e-inplay-modal-cleanup.md`](../changes/2026-05-25-phase2-e-inplay-modal-cleanup.md)

## Context

The in-play modal surfaces — InPlayModal (record play result), RunnerEventModal (advance / out tabs), RunnerAdvancementModal (post-hit runner positions + throwouts) — accumulated inconsistencies over time:

- InPlayModal used a hand-rolled `position:absolute` overlay with `View+onTouchEnd` for buttons (no Pressable, no a11y, no press-state feedback).
- RunnerEventModal packed two unrelated flows (Advance / Out) into 418 lines behind a tab toggle with a `defaultTab` prop injected by callers.
- The DiamondToggle inside RunnerEventModal used 45°-rotated squares with -45° counter-rotated text, which antialiased poorly on iOS through the transform stack — and duplicated the diamond pattern already in BaseRunnerDiamond (used by the live GameHeader).
- RunnerAdvancementModal was 632 lines — the largest single modal, mixing pure helpers, a throwout draft form, an error-advancement section, and the orchestrator.
- None of the in-play modals had a discoverable bottom Cancel button (only the X in headers).

## Approach

Three commits, each independently shippable, each its own logical unit. Reverting any one doesn't affect the others.

### E1 — InPlayModal Portal + Pressable + Cancel

Smallest mechanical fix. Switch the custom overlay to Paper Portal + Modal; swap every `View+onTouchEnd` for `Pressable` with proper accessibility props + press-state feedback; add a Cancel button to the bottom action area. Same handlers, same state, same flow.

### E2 — Split RunnerEventModal into Advance + Out

Two new files own one flow each. The original RunnerEventModal becomes a 53-line shim that routes to whichever sub-modal based on `defaultTab` so callers (LiveGameModals) don't have to change. The legacy DiamondToggle gets deleted; the Advance flow uses BaseRunnerDiamond (same as the live header). Future cleanup: replace the shim mount with direct sub-modal mounts and delete the shim entirely.

### E3 — Trim RunnerAdvancementModal

Split into three files in the same folder:
- `runnerAdvancementHelpers.ts` (148 lines) — pure helpers + types (matchAdvancements, computeExtraAdvancements, batterSourceBase, label maps, etc.).
- `ThrowoutSection.tsx` (188 lines) — list of recorded throwouts + inline add-form. Owns its own draft state.
- `RunnerAdvancementModal.tsx` (236 lines, down from 632) — orchestrator only.

Public type re-exports preserved so downstream callers' imports stay valid.

## Scope — files touched

### packages/mobile (v2.23.0 → v2.26.0 across 3 commits)

E1 (commit `a255628`, v2.24.0):
- `src/components/live/InPlayModal/InPlayModal.tsx` — Portal/Modal + Pressable + Cancel.

E2 (commit `fdb3a47`, v2.25.0):
- NEW `src/components/live/RunnerEventModal/RunnerAdvanceModal.tsx` — Advance flow.
- NEW `src/components/live/RunnerEventModal/RunnerOutModal.tsx` — Out flow.
- `src/components/live/RunnerEventModal/RunnerEventModal.tsx` — shim (53 lines, was 418).

E3 (commit `6d25a76` + version-bump fixup `dda0237`, v2.26.0):
- NEW `src/components/live/RunnerAdvancementModal/runnerAdvancementHelpers.ts` — helpers + types.
- NEW `src/components/live/RunnerAdvancementModal/ThrowoutSection.tsx` — extracted subsection.
- `src/components/live/RunnerAdvancementModal/RunnerAdvancementModal.tsx` — slimmed orchestrator.

### packages/api / packages/web / packages/shared

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` clean after each commit.
- `cd packages/mobile && npm test` — 12/12 pass after each commit.
- Manual (deferred to dev/TestFlight): trigger each modal from the live screen, confirm visual + interaction parity.

## Out of scope (deferred)

- **UX-IP-04** (InPlayModal fixed 280×280 SVG) — focused this batch on Pressable+Portal+Cancel; responsive sizing is its own pass.
- **Direct sub-modal mounts** for RunnerAdvanceModal / RunnerOutModal (skip the RunnerEventModal shim) — caller-side change, not blocking.
- **`packages/shared`'s version** (per memory: never bump shared).

## Phase 2 status after this batch

| Item | Title | Status |
|---|---|---|
| A | Design tokens | Shipped |
| B | Pitch calling consolidation | Pending (biggest) |
| C | Live screen refactor | Shipped |
| D | New Game flow alignment | Pending (needs user input) |
| **E** | **In-play modal cleanup** | **Shipped** |
| F | Tendencies side-by-side (tablet) | Pending |
| G | Snackbar lib eval | Closed |
| H | Scoreboard aesthetic | Declined |
| I | Bullpen feature parity | Pending |
| J | Mobile role routing | Shipped |
| K | Heat-zone parity | Shipped |
