# Phase 2 E — In-play modal cleanup · 2026-05-25

**Type:** `refactor`
**Commits:** `a255628` (E1) · `fdb3a47` (E2) · `6d25a76` + `dda0237` (E3)
**Versions:** `mobile@2.23.0 → 2.26.0` (one minor bump per sub-commit)

## Context

Phase 2 item E of the UX audit asked for a multi-modal cleanup pass across the three in-play modals (InPlayModal, RunnerEventModal, RunnerAdvancementModal). Findings `UX-IP-02` (partial) / `UX-IP-03` / `UX-IP-07` / `UX-IP-08` / `UX-IP-09` / `UX-IP-15` — all on mobile.

Per the handoff plan, three independent commits — each modal could ship in isolation, and a revert of any one doesn't affect the others.

Full plan: [`docs/plans/2026-05-25-phase2-e-inplay-modal-cleanup.md`](../plans/2026-05-25-phase2-e-inplay-modal-cleanup.md).

## What shipped

### E1 — InPlayModal Portal + Pressable + Cancel (`a255628`, mobile 2.24.0)

Addresses **UX-IP-02 (partial)**, **UX-IP-03**, **UX-IP-15**.

- Replaced the hand-rolled `position:absolute` overlay (zIndex 1000) with `<Portal><Modal>` from Paper. Routes through the Portal.Host we mounted in `app/_layout.tsx` (commit `4a5a92c`).
- Swapped every `View+onTouchEnd` for `Pressable` — 4 hit-type chips + 13 result buttons. Each now gets `accessibilityRole='button'`, `accessibilityState` (selected / disabled), `accessibilityLabel`, and a `pressed` opacity dip.
- Added a Cancel text button in the bottom action area. Header X still works; bottom Cancel gives a thumb-friendly target.

No behavior change: same handlers, same state, same flow.

### E2 — Split RunnerEventModal into Advance + Out (`fdb3a47`, mobile 2.25.0)

Addresses **UX-IP-07**, **UX-IP-08**.

- NEW `RunnerAdvanceModal.tsx` (~190 lines) — only the Advance flow (stolen-base / wild-pitch / passed-ball / balk / advance-on-throw + before/after diamond + runs total).
- NEW `RunnerOutModal.tsx` (~160 lines) — only the Out flow (runner + out type).
- `RunnerEventModal.tsx` collapsed from 418 lines to a 53-line shim that routes to whichever sub-modal based on `defaultTab`. Callers (LiveGameModals, useLiveGameController) unchanged.
- The custom DiamondToggle (45°-rotated squares with -45° counter-rotated text) is deleted. The Advance flow now uses the existing `<BaseRunnerDiamond>` used by the live GameHeader — same SVG renderer wherever runners appear.

No behavior change: same event types, same callbacks, same flow ordering. UI: the diamond is the BaseRunnerDiamond pip layout instead of rotated squares.

### E3 — Trim RunnerAdvancementModal (`6d25a76` + version fixup `dda0237`, mobile 2.26.0)

Addresses **UX-IP-09**.

- **632 → 236 lines** for the main file (-63%). Splits into:
  - **NEW** `runnerAdvancementHelpers.ts` (148 lines) — `batterSourceBase`, `matchAdvancements`, `computeExtraAdvancements`, `advancementKey`, `getHitLabel`, all the label maps (`FROM_BASE_LABEL`, `TO_BASE_LABEL`, `ORIGIN_LABEL`, `TARGET_LABEL`), `BASE_ORDER`, `VALID_TARGETS`, plus the `Throwout` / `ErrorAdvancement` / `ThrowoutTargetBase` / `RunnerOrigin` / `AdvanceTarget` types.
  - **NEW** `ThrowoutSection.tsx` (188 lines) — list of recorded throwouts + inline add-form. Owns its own draft state (`fromBase` / `toBase` / `fielderSeq` / `showAddThrowout`).
  - `RunnerAdvancementModal.tsx` (236 lines, was 632) — orchestrator only: suggested seed, before/after diamonds, runs control, error-advancement chips, confirm/cancel.

Public types re-exported from the modal file so downstream callers (`useLiveGameActions.ts` imports `ErrorAdvancement` and `Throwout` from this path) don't change.

Cancel button was already present in the bottom action area — UX-IP-15 already satisfied for this modal.

The version-bump fixup commit (`dda0237`) caught a missed package.json bump in `6d25a76` (Edit failed silently on stale state while the modal files committed cleanly).

## Verification

- `cd packages/mobile && npx tsc --noEmit` clean after each commit.
- `cd packages/mobile && npm test` — 12/12 pass after each commit.
- Manual (deferred to dev/TestFlight): trigger each modal from the live screen, confirm visual + interaction parity.

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

## Out of scope (deferred)

- **UX-IP-04** (InPlayModal fixed 280×280 SVG) — focused this batch on the Pressable / Portal / Cancel mechanical fixes. Responsive sizing for tablet landscape is its own pass.
- **Direct sub-modal mounts** in callers (skip the RunnerEventModal shim) — caller-side change, not blocking the modal split.
- **Bumping `packages/shared`'s version** (per memory: never bump shared).
