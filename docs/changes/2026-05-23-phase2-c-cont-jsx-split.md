# Phase 2 — C continuation 2 — Extract `LiveGameModals` and `LiveGameTopBar` · 2026-05-23

**Type:** `refactor`
**Commit:** _(pending)_
**Versions:** `mobile@2.14.0 → 2.15.0`

## Context

Continues the JSX split half of audit item C. C continuation 1 (commit `35571a4`) moved state/effects/derived values into `useLiveGameController`. This commit pulls the modal stack and the duplicated header bar into separate components — both are clean isolated extractions that don't require moving handlers.

The full tablet/phone layout extraction is deferred to C continuation 3 because it requires moving handlers into the hook first (otherwise the tablet/phone components would each take ~25 callback props).

Findings: continues `UX-LG-00` (live.tsx size).

## Plan (Decisions)

- **`LiveGameModals`** takes the controller + a typed handler bag — 9 callbacks rather than 50+ individual props.
- **`LiveGameTopBar`** owns its own `useRouter` + scouting-nav fetch; parent passes the optional `onBatterBreakdown` to gate the tablet-only button.
- Render helpers (renderPitchTypeFilterBar, renderPitchBreakdown, renderZoneTapHint, renderActualEqualsTargetButton, renderGameHeader, renderAtBatControls, renderRunnerOutButton) **stay as inline functions** — small (10-80 lines each), low value to extract relative to the wiring cost.

Full plan: [`docs/plans/2026-05-23-phase2-c-cont-jsx-split.md`](../plans/2026-05-23-phase2-c-cont-jsx-split.md).

## What shipped

### packages/mobile (v2.15.0)

- NEW `app/game/[id]/LiveGameModals.tsx` (281 lines):
  - Wraps all 12 modals in a single Portal: `PitcherSelectorModal`, `BatterSelectorModal`, `MyBatterSelectorModal`, `InningChangeModal`, `TeamAtBatModal`, `RunnerEventModal`, `DoublePlayModal`, `RunnerAdvancementModal`, `PitcherTendenciesModal`, `HitterTendenciesModal`, `OpposingPitcherModal`, `CountBreakdownModal`, `PitcherStatsModal`.
  - `LiveGameModalsHandlers` interface enumerates the 9 callbacks (handleSelectPitcher, handleSelectBatter, handleInningChangeConfirm, handleTeamAtBatConfirm, handleRecordAdvancement, handleRecordBaserunnerOut, handleDoublePlayConfirm, handleRunnerAdvancementConfirm, advanceInningWithRuns).
  - Destructures everything else from `ctl: LiveGameController`.

- NEW `app/game/[id]/LiveGameTopBar.tsx` (82 lines):
  - Back button + "Live Game" title + sync badge + scouting/end-game actions.
  - `onBatterBreakdown` prop optional — when provided renders the breakdown button (tablet); when omitted hides it (phone).
  - Owns the `useRouter` call and the `scoutingReportsApi.getByGameId` navigation — parents don't have to wire that logic.

- MODIFIED `app/game/[id]/live.tsx`:
  - Imports `LiveGameModals` + `LiveGameTopBar`.
  - Deleted the 156-line `renderModals` function definition; replaced with an 11-line `modalHandlers` bag.
  - Replaced both `{renderModals()}` call sites (tablet + phone) with `<LiveGameModals ctl={ctl} handlers={modalHandlers} />`.
  - Replaced both inline `<View style={styles.header}>...</View>` header blocks (tablet ~40 lines, phone ~30 lines) with `<LiveGameTopBar ... />`.
  - Net: 2739 → 2534 lines (-205, -7.5%).
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

**Smoke (manual — no behavior change):**

1. Tablet header: back / scouting / batter-breakdown / end-game buttons all behave as before.
2. Phone header: back / scouting / end-game buttons all behave as before; no batter-breakdown button (intentional).
3. Every modal opens/dismisses on the same triggers as before.
4. Modal handlers fire correctly (InningChangeModal Confirm advances, RunnerEventModal updates runners, etc.).

## Session running total (live.tsx)

- Session start: 2921 lines (single file, state + effects + handlers + JSX + modals all mixed)
- After hook extraction (`35571a4`): 2739 lines
- After this commit: 2534 lines
- **Net: -387 lines (-13%)** split into 4 single-concern files:
  - `useLiveGameController.ts` (562 lines) — state plumbing
  - `LiveGameModals.tsx` (281 lines) — modal stack
  - `LiveGameTopBar.tsx` (82 lines) — header bar
  - `live.tsx` (2534 lines) — handlers + render helpers + tablet/phone JSX

## Out of scope (deferred — C continuation 3)

- **Tablet/phone layout component extraction** — the remaining ~600 lines of JSX (the two main render blocks). Requires moving handlers into the hook first so the components can take just `{ ctl, actions }` props.
- **Render helper extraction** (`renderGameHeader` → `<GameHeaderRow>`, etc.) — low value, deferred indefinitely.
