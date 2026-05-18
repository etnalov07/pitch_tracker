# Pitch Logging — Auto-Log on Result + Double-Log Guard

- **Date:** 2026-05-17
- **Type:** `feat`
- **Commit SHA:** `0bf0629`
- **Version bumps:** `@pitch-tracker/web` 1.16.0 → 1.17.0, `mobile` 2.5.0 → 2.6.0 (`app.json` expo.version 1.97.0 → 1.98.0).

## Context

Logging a pitch is the single most-repeated action in a live game (dozens of
times per game). A typical pitch cost **4 taps** on both web and mobile: pitch
type → strike-zone location → result → **Log Pitch**.

The final "Log Pitch" tap carried zero information — the _result_ tap is already
the last decision the charter makes. It was a redundant confirmation on every
pitch (~25% of the per-pitch taps).

Separately, the web "Log Pitch" button had **no in-flight guard**: a fast
double-tap silently logged two identical pitches, only surfacing later during
game review.

A UX review of the pitch-logging flow flagged both. This change addresses the
two the user scoped in (pre-filling location from the called target zone and
sticky velocity were deferred).

## Plan (Decisions)

- **Auto-log on result.** Selecting a result button immediately logs the pitch.
  The standalone "Log Pitch" button is removed. Per-pitch taps: 4 → 3.
- **Pass the result explicitly.** `handleLogPitch` reads the result from React
  state; calling `setResult(r)` then `handleLogPitch()` in one handler would see
  a _stale_ result (state updates are async). So `handleLogPitch` gains an
  optional `resultOverride` param, and the result buttons pass the tapped result
  through directly.
- **Double-log guard via `useRef`.** A synchronous `isLoggingRef` flag, checked
  and set at the top of `handleLogPitch`, cleared in a `finally`. Synchronous, so
  it is immune to the one-render gap of a state-driven `disabled` prop.
- **Velocity before result.** For auto-log to capture velocity, the velocity
  field must be reachable _before_ the result tap. Web already ordered it that
  way; mobile's velocity field was moved above the result buttons (both the
  portrait and landscape layouts).
- **Misordered taps keep existing behavior.** Tapping a result before a location
  is set falls through to `handleLogPitch`'s existing validation alert — no new
  disabled-until-ready button state was added.

## What shipped

### `packages/web` (1.16.0 → 1.17.0)

- `pages/LiveGame/useLiveGameActions.ts` — `handleLogPitch` now takes
  `resultOverride?: PitchResult`; an `effective result` (`resultOverride ??
pitchResult`) drives all logging/count/branch logic. Added an `isLoggingRef`
  (`useRef`) double-log guard checked at entry and cleared in a new `finally`.
- `pages/LiveGame/LiveGame.tsx` — the six result buttons now set the result and
  call `handleLogPitch('<result>')`. Removed the `<LogButton>` from `<LogRow>`
  (Undo remains; the row only renders when at least one pitch exists). Dropped
  the now-unused `pitchLocation` destructure.
- `pages/LiveGame/styles.ts` — removed the now-dead `LogButton` styled component.

### `packages/mobile` (2.5.0 → 2.6.0)

- `app/game/[id]/live.tsx` — `handleLogPitch` takes `resultOverride?:
PitchResult`; a renamed local `effectiveResult` (kept distinct from the
  existing `result` = `logPitchOffline` return) drives logging/count/branch
  logic. Added an `isLoggingRef` guard alongside the existing `isLogging` state.
  The `ResultButtons` `onSelect` (both portrait and landscape layouts) now sets
  the result and calls `handleLogPitch(r)`. The velocity row was moved above the
  result buttons in both layouts. Removed the "Log Pitch" `<Button>` and the
  now-unused `canLogPitch` derivation and `logButtonGrow` style.

### `packages/shared` / `packages/api`

- No changes — no type or endpoint changes.

## Verification

No automated tests cover `handleLogPitch`; verified via the gate plus manual
testing.

- **Pre-commit gate:** prettier, ESLint (web) clean, `tsc` green for web and
  mobile, mobile jest 12/12.
- **Manual (web + mobile), in-progress game, charter role:**
    1. Pitch type → strike-zone location → tap a result → pitch logs
       immediately, count advances, form resets (**3 taps, no "Log Pitch"**).
    2. Velocity enabled: enter velocity before tapping the result; the logged
       pitch carries it.
    3. **In Play** → pitch logs → DiamondModal / InPlayModal opens automatically.
    4. 4th ball / HBP / 3rd strike → pitch logs → walk / HBP / strikeout
       (runner-advancement / dropped-third) flow fires as before.
    5. Rapidly double-tap a result → exactly **one** pitch is logged.
    6. Tap a result before a location is set → existing validation alert; no
       pitch logged.
    7. Undo still works and is reachable.

## Out of scope (deferred)

- Pre-filling the actual pitch location from the called target zone
  (pitch-calling mode).
- Sticky / smart-default velocity between pitches.
- Strike-zone two-tap reduction, in-play modal stacking, layout/scrolling.
