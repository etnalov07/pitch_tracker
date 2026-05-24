# Phase 2 — C continuation 2 — Extract `LiveGameModals` and `LiveGameTopBar`

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, item C (continuation 2/2)
**Findings addressed:** continues `UX-LG-00` (live.tsx size)

## Context

C continuation 1 extracted state/effects/derived values into a hook (`useLiveGameController`). This batch continues the JSX split: pull the modal stack and the duplicated header bar out into separate components.

The full audit-listed split (LiveGameTablet, LiveGamePhone, LiveGameInGameControls, etc.) would require also extracting all handlers from `live.tsx` because the tablet/phone components reference ~25 handler functions. That's a substantial follow-up — deferred to its own session (call it C continuation 3).

## Plan (Decisions)

### `LiveGameModals.tsx` — extract the Portal stack

The `renderModals()` function in live.tsx was a 150-line Portal with 12 modals (selector modals, inning change, team-at-bat, runner event/advancement/double-play, tendencies, opposing pitcher, count breakdown, pitcher stats). Almost all of them are gated by visibility flags in the controller. Perfect extraction candidate.

Signature: `<LiveGameModals ctl={ctl} handlers={modalHandlers} />` where:
- `ctl: LiveGameController` provides every state value the modals need
- `handlers` is a typed bag of the 9 callbacks the modals invoke (handleSelectPitcher, handleSelectBatter, handleInningChangeConfirm, etc.)

Mounted at the bottom of both the tablet and phone return blocks.

### `LiveGameTopBar.tsx` — dedupe the header bar

The header bar (back button, "Live Game" title, sync badge, scouting/breakdown/end-game actions) was duplicated between the tablet-landscape and phone-portrait render paths. The only difference: tablet has a batter-breakdown icon button; phone omits it.

Signature: `<LiveGameTopBar game={...} id={...} onEndGame={...} onBatterBreakdown={...} />`. The `onBatterBreakdown` prop is optional — when provided (tablet), renders the breakdown button; when omitted (phone), it's hidden.

The component owns its own `useRouter` call + `scoutingReportsApi.getByGameId` navigation (the only behavior beyond pure rendering), so the parent doesn't have to wire any of that.

### What's NOT extracted this batch

- **The two main render blocks** (tablet content panel + phone scroll content) — they reference ~25 handler functions defined in `live.tsx` (handleLogPitch, handleSendCall, handleEditLastPitchResult, etc.). Extracting them requires either passing all handlers as props (ugly) or moving handlers into the hook (large refactor). Deferred to C continuation 3.
- **The render helpers** (`renderPitchTypeFilterBar`, `renderPitchBreakdown`, `renderZoneTapHint`, `renderActualEqualsTargetButton`, `renderGameHeader`, `renderAtBatControls`, `renderRunnerOutButton`) — small (10–80 lines each), low extraction value relative to the wiring cost. Leave as-is.

## Scope — files touched

### packages/mobile (v2.14.0 → v2.15.0)

- NEW `app/game/[id]/LiveGameModals.tsx` (281 lines) — Portal-wrapped modal stack.
- NEW `app/game/[id]/LiveGameTopBar.tsx` (82 lines) — header bar with optional batter-breakdown action.
- MODIFIED `app/game/[id]/live.tsx`:
  - Added imports for `LiveGameModals` and `LiveGameTopBar`.
  - Replaced the 156-line `renderModals` function definition with an 11-line `modalHandlers` bag.
  - Replaced both `{renderModals()}` call sites with `<LiveGameModals ctl={ctl} handlers={modalHandlers} />`.
  - Replaced both inline header `<View style={styles.header}>...</View>` blocks (40 + 30 lines) with `<LiveGameTopBar ... />`.
  - Net: 2739 → 2534 lines (-205).
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

**Smoke (manual — no behavior change, all paths verified by TS):**

1. Tablet header back/scouting/breakdown/end-game buttons all behave as before.
2. Phone header back/scouting/end-game buttons all behave as before; no breakdown button visible.
3. Every modal opens/dismisses on the same triggers as before.
4. Modal handlers fire correctly (e.g., InningChangeModal Confirm → advance, RunnerEventModal onRecordAdvancement → updates runners).

## Out of scope (deferred — C continuation 3)

- **Full tablet/phone layout component extraction**: `LiveGameTabletLayout` (with the left stats panel + tendencies row + main panel), `LiveGamePhoneLayout` (single column with thumb-zone ordering). Each ~250 lines of JSX referencing the handler set. Best done AFTER moving handlers into a sibling `useLiveGameActions` hook so the components can take just `{ ctl, actions }` props.
- **Extracting render helpers** into components (`renderGameHeader` etc.) — low value, deferred indefinitely.
