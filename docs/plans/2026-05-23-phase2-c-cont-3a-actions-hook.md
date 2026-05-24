# Phase 2 — C continuation 3a — Extract `useLiveGameActions` hook

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, item C (continuation 3a/2)
**Findings addressed:** continues `UX-LG-00` (live.tsx size)

## Context

C continuation 1 extracted state/effects into `useLiveGameController`. C continuation 2 pulled `LiveGameModals` and `LiveGameTopBar` out as separate components. This batch (3a) is the bigger one: move all 25 handlers + helpers from `live.tsx` into a sibling `useLiveGameActions` hook. Splits a single ~1100-line block into its own single-concern file.

This is the prerequisite for 3b (extracting `LiveGameTablet` + `LiveGamePhone` layout components) — once handlers are in the hook, the layout components can take just `{ ctl, actions }` props instead of 25+ individual callbacks.

## Plan (Decisions)

Mirrors web's `useLiveGameState` + `useLiveGameActions` split exactly. Hook signature:

```ts
export function useLiveGameActions(ctl: LiveGameController) {
    // destructure everything from ctl
    // define 25 handlers + 3 pure helpers (deriveFielderPosition, etc.)
    // return all handlers as a flat object
}
```

Handlers reference each other via closure (handleLogPitch → handleEndAtBat; handleInPlayResult → handleEndAtBat; handleRunnerAdvancementConfirm → handleEndAtBat). Putting them all in the same hook preserves those references with zero ceremony.

The dependency arrays on each useCallback got `set*` setters explicitly listed (they were closed over implicitly before). The lint-vs-noise tradeoff: explicit deps prevent stale closures even if React fast-refresh re-evaluates the hook between renders.

## Scope — files touched

### packages/mobile (v2.15.0 → v2.16.0)

- NEW `app/game/[id]/useLiveGameActions.ts` (1294 lines) — all handlers + helpers; exported `LiveGameActions` type.
- MODIFIED `app/game/[id]/live.tsx`:
  - Trimmed imports massively: removed `useCallback` (no longer used inline), `Inning`, `BaseRunners`, `BaserunnerEventType`, `RunnerBase`, `ContactType`, `PlayerPosition`, `Player`, `Pitch`, `PitchType`, `PitchResult`, `PitchCall`, `PitchCallAbbrev`, `PitchCallZone`, `PITCH_TYPE_TO_ABBREV`, `getOutsForResult`, `getSuggestedAdvancement`, `clearBases`, `OpponentLineupPlayer` (all only used by handlers). Removed `pitchCallingApi`, `scoutingReportsApi`, `speakPitchCall`, `startPassthrough`/`stopPassthrough`/`isPassthroughActive`, almost all action creators (kept only `fetchGameById` for the error-screen retry and `setCurrentGameRole` for the role-select buttons). Removed `Portal`, `useTheme`, `useToast`, `useConfirm` (provided via ctl). Kept `PITCH_CALL_ZONE_LABELS` + `PITCH_CALL_ZONE_COORDS` (used in render helpers).
  - Deleted the 1130-line handler block (lines 185-1313).
  - Replaced with `const actions = useLiveGameActions(ctl)` + a 25-name destructure.
  - JSX, render helpers, and styles unchanged — they reference the destructured handlers via closure.
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

## live.tsx running total

| Stage | live.tsx |
|---|---|
| Pre-Phase-2 (session 1 start) | 2921 |
| After hook extraction (`35571a4`) | 2739 |
| After modals + topbar (`1bce870`) | 2534 |
| After actions hook (this commit) | **1386** (-1535, -53%) |

Split into:
- `useLiveGameController.ts` (562) — state plumbing
- `useLiveGameActions.ts` (1294) — handlers + helpers
- `LiveGameModals.tsx` (281) — modal stack
- `LiveGameTopBar.tsx` (82) — header bar
- `live.tsx` (1386) — conditional returns + render helpers + tablet/phone JSX + styles

## Out of scope (deferred — C continuation 3b)

- **Extract `LiveGameTablet` + `LiveGamePhone` layout components** — the remaining ~560 lines of JSX. Now tractable because handlers are in a hook: each layout takes `{ ctl, actions }` plus the shared `modalHandlers` + `setShowBreakdown` setter. Render helpers either get duplicated in each layout or extracted to a shared file.

3b is its own batch because (a) it's another ~30 mins of careful work that benefits from a fresh review, and (b) shipping 3a alone provides a stable foundation in case 3b uncovers issues.
