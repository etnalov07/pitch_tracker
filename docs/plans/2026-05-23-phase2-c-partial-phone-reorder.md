# Phase 2 — C (partial) — Phone layout reorder for thumb-zone tap path

**Status:** Approved · in progress
**Phase:** UX Audit Phase 2, item C (partial — phone reorder only)
**Findings addressed:** `UX-LG-07` (phone layout puts StrikeZone deep in a scroll)
**Findings deferred:** `UX-LG-00`, `UX-LG-11`, `UX-LG-31` (hook extraction + component split — see continuation note below)

---

## Context

Phase 2 item C from the audit has three parts: (1) extract `useLiveGameController` hook from the 2921-line `live.tsx`, (2) split JSX into 4–5 layout components, (3) reorder phone layout so StrikeZone + ResultButtons are in the thumb zone.

This commit ships **only #3 (phone reorder)** — the user-visible win. Hook extraction and component split are deferred to their own session because:
- The current `live.tsx` has ~30 useState declarations, ~25 useCallback handlers, ~10 useEffects, and a 1300-line JSX tree split between tablet-landscape and phone-portrait render paths.
- Mechanically extracting all of that to a single hook is a multi-hour piece of work that should not be rushed when 4 other commits already landed in the same session.
- Phone reorder is the part that coaches will actually feel; hook extraction is pure code organization.

---

## Plan (Decisions)

### Phone tap path before this commit

```
Header → banners → at-bat controls →
PitchTypeGrid → StrikeZone → SendCall → Shake → Velocity → ResultButtons → Undo
```

Problem: StrikeZone and ResultButtons are separated by SendCall + Shake + Velocity. Coach has to scroll between every pitch.

### After this commit

```
Header → banners → at-bat controls →
PitchTypeGrid → StrikeZone → SendCall (contextual) → Velocity → ResultButtons → Shake → Undo
```

Key moves:
- **Shake button moved from above ResultButtons to below.** Shake is used between pitches (when the pitcher shakes off a call) — it's not in the per-pitch tap path. Moving it below Result tightens zone → result.
- SendCall stays above Result (it has to fire before the pitch, and the coach taps result after watching the pitch — sending after the pitch would be too late).
- Velocity stays above Result (tapping a result auto-logs the pitch, so velocity has to be entered first).
- The contextual call rows (SendCall when no active call; CallSent badge when active) only render in their respective states — so on a typical pitch with no calling enabled, the tap path is just StrikeZone → ResultButtons with maybe Velocity in between.

### Why not also reorder tablet?

Tablet-landscape already has ResultButtons in the right column adjacent to the StrikeZone. The phone reorder doesn't affect tablet.

---

## Scope — files touched

### packages/mobile (v2.12.0 → v2.13.0)

- MODIFIED `app/game/[id]/live.tsx`:
  - Phone render path (the second `return` block, ~line 2402): Shake button moved from between Velocity and Result to below Result.
  - Velocity stays above Result (invariant: velocity must be entered before tapping result, which auto-logs).
  - Pitch calling SEND row + CALL SENT badge stay above Result (call has to fire before the pitch).
  - Comments updated to explain the new ordering.
- MODIFIED `package.json` — version bump.

### packages/web

No changes — web Live Game has ResultButtons in the right column already.

### packages/shared / packages/api

No changes.

---

## Verification

- `cd packages/mobile && npx tsc --noEmit` — clean.
- `cd packages/mobile && npm test` — 12/12 pass.

**Smoke (manual):**

1. Mobile phone (or simulator): start a game, select pitch type → tap zone twice → tap result → pitch logs without scrolling.
2. Mobile phone with pitch calling enabled: select pitch type → tap zone (target) → SEND row appears between zone and velocity → tap SEND → CallSent badge replaces SEND row → tap zone (actual) → tap result.
3. Mobile phone with velocity enabled: same as #1 but type velocity between zone and result.
4. Mobile phone with all three features (calling + velocity + shake): coach can shake off via the Shake button below ResultButtons; tap path for the actual pitch is still StrikeZone → (SEND / badge) → Velocity → Result.

---

## Out of scope (deferred — C continuation)

These are the rest of audit item C, deferred to their own session:

- **Extract `useLiveGameController` hook** — pull all state, effects, and handlers from `live.tsx` into a hook. Mirrors the web `useLiveGameState` + `useLiveGameActions` pattern. Foundation for component splitting. Multi-hour work; needs dedicated attention.
- **Split JSX into layout components** — `LiveGameTablet`, `LiveGamePhone`, `LiveGameModals`, `LiveGameCallControls`, `LiveGameResultPanel`. Each colocated with its styles. Reduces the 2921-line file to a thin coordinator plus 4–5 focused components.

Once those land, future changes to the live screen become substantially cheaper. No immediate user-visible payoff — pure code quality.
