# Phase 2 — C continuation 3a — Extract `useLiveGameActions` hook · 2026-05-23

**Type:** `refactor`
**Commit:** _(pending)_
**Versions:** `mobile@2.15.0 → 2.16.0`

## Context

Third hook extraction from `live.tsx`. After this commit, all 25 handlers + 3 pure helpers live in `useLiveGameActions.ts`. Together with `useLiveGameController.ts` (state) + `LiveGameModals.tsx` + `LiveGameTopBar.tsx`, `live.tsx` is now 1386 lines — down 53% from the original 2921.

Mirrors web's `useLiveGameState` + `useLiveGameActions` pattern exactly. This was deferred from C-cont 1 because the handlers form their own complete unit and extracting them separately keeps each batch reviewable.

Findings: continues `UX-LG-00`.

## Plan (Decisions)

- Single combined hook for actions, takes the controller's return as input.
- Handlers reference each other via closure inside the hook — no setter-passing ceremony.
- `useCallback` deps now explicitly include the setters they close over (was implicit before; explicit prevents stale closures if fast-refresh re-evaluates).

Full plan: [`docs/plans/2026-05-23-phase2-c-cont-3a-actions-hook.md`](../plans/2026-05-23-phase2-c-cont-3a-actions-hook.md).

## What shipped

### packages/mobile (v2.16.0)

- NEW `app/game/[id]/useLiveGameActions.ts` (1294 lines):
  - `useLiveGameActions(ctl: LiveGameController)` — takes the controller return as input.
  - All 25 handlers verbatim from live.tsx, organized into 4 sections: score/inning/at-bat plumbing, pitch calling, pitch logging / Fix Last Pitch / Undo, in-play / runner events.
  - Three pure helpers (`toPitchCallAbbrev`, `deriveFielderPosition`, plus internal use of `findNextActiveBatter`/`findInningLeadoffBatter`).
  - Returns a 25-key flat handler bag.
  - Exports `LiveGameActions` type (`ReturnType<typeof useLiveGameActions>`) for downstream component props.

- MODIFIED `app/game/[id]/live.tsx`:
  - Trimmed imports drastically: removed `useCallback` (no longer used inline), many type imports (Inning, BaseRunners, BaserunnerEventType, RunnerBase, ContactType, PlayerPosition, Player, Pitch, PitchType, PitchResult, PitchCall, PitchCallAbbrev, PitchCallZone, OpponentLineupPlayer), const imports (PITCH_TYPE_TO_ABBREV, getOutsForResult, getSuggestedAdvancement, clearBases), utility modules (`pitchCallingApi`, `scoutingReportsApi`, `speakPitchCall`, walkieTalkie passthrough trio), most action creators (kept `fetchGameById` for error-screen retry + `setCurrentGameRole` for role-select), and `Portal` (now only used in extracted modals). Also removed `useTheme`/`useToast`/`useConfirm` from inline imports — they're provided via the controller.
  - Deleted the 1130-line handler code block (was at lines 185-1313).
  - Replaced with `const actions = useLiveGameActions(ctl)` plus a 25-name destructure.
  - JSX, render helpers, modal handler bag, and styles all unchanged — they reference handlers via the new destructure.
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

## live.tsx running total

| Stage | live.tsx | Δ |
|---|---|---|
| Pre-Phase-2 | 2921 | — |
| After hook extraction (`35571a4`) | 2739 | -182 |
| After modals + topbar (`1bce870`) | 2534 | -205 |
| **After actions hook (this commit)** | **1386** | **-1148** |

Full file split:
- `useLiveGameController.ts` (562) — state, effects, derived values
- `useLiveGameActions.ts` (1294) — handlers
- `LiveGameModals.tsx` (281) — modal stack
- `LiveGameTopBar.tsx` (82) — header bar
- `live.tsx` (1386) — orchestrator + conditional returns + render helpers + tablet/phone JSX + styles

Combined LOC is up (~3600 vs 2921 original) because of destructure boilerplate and explicit dep arrays — but the boundary is now sharp: each file is single-concern and independently understandable.

## Out of scope (deferred — C continuation 3b)

- **Extract `LiveGameTablet` + `LiveGamePhone` layout components** (~560 lines of JSX). Now tractable because both can take just `{ ctl, actions }` props.
