# Phase 2 — C (partial) — Phone layout reorder for thumb-zone tap path · 2026-05-23

**Type:** `style`
**Commit:** _(pending)_
**Versions:** `mobile@2.12.0 → 2.13.0`

## Context

Ships the user-visible part of audit item C: the phone layout reorder. Hook extraction + component split are deferred to their own session because `live.tsx` is 2921 lines and a clean refactor needs dedicated time.

Audit finding: **`UX-LG-07`** — phone layout puts StrikeZone and ResultButtons far apart, requiring scroll between every pitch.

## Plan (Decisions)

Only one substantive move: **Shake button** went from above ResultButtons (between Velocity and Result) to below ResultButtons.

- Shake is used between pitches (when the pitcher shakes off a call) — it's not in the per-pitch tap path. Below Result is correct.
- SendCall and Velocity have to stay above Result (call fires before the pitch; velocity must be entered before result-tap because tapping result auto-logs the pitch).
- Tablet path unchanged — already had ResultButtons in the right column adjacent to StrikeZone.

Full plan: [`docs/plans/2026-05-23-phase2-c-partial-phone-reorder.md`](../plans/2026-05-23-phase2-c-partial-phone-reorder.md).

## What shipped

### packages/mobile (v2.13.0)

- MODIFIED `app/game/[id]/live.tsx`:
  - Phone render block: Shake button block moved to immediately below ResultButtons (was between Velocity and Result).
  - Velocity block stays in its slot (above Result, below Pitch Calling SendCall/CallSent rows).
  - Updated comments above the Pitch Calling SEND row to document the UX-LG-07 ordering rationale (StrikeZone → Send → Velocity → Result → Shake).
  - Section numbering ("1. Pitch Type", "2. Strike Zone", etc.) replaced with descriptive comments since the numbering broke after the reorder.
- MODIFIED `package.json` — version bump.

### packages/web / packages/shared / packages/api

No changes.

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.
- Prettier on touched file.

**Smoke (manual):**

1. Mobile phone: log a pitch with no calling / no velocity — tap path is StrikeZone → ResultButtons (no scroll).
2. Mobile phone with velocity enabled: StrikeZone → MPH input → ResultButtons (still tight).
3. Mobile phone with pitch calling enabled: StrikeZone → SEND (contextual) → ResultButtons; once call is sent, CALL SENT badge replaces SEND row; coach can hit Shake below Result before the next pitch.
4. Tablet landscape: unchanged — ResultButtons remains in the right column.

## Out of scope (deferred — C continuation)

- **Extract `useLiveGameController` hook** from `live.tsx` (~30 useState, ~25 handlers, ~10 effects). Foundation for the JSX split.
- **Split JSX into `LiveGameTablet`/`LiveGamePhone`/`LiveGameModals`/`LiveGameCallControls`/`LiveGameResultPanel`** — pure code-quality refactor.

Both land in a follow-up session. This commit's phone reorder is independent and self-contained.
