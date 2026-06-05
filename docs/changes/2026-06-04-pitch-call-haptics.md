# Haptic Feedback on Pitch-Calling Buttons (mobile)

- **Date:** 2026-06-04
- **Type:** `feat`
- **Commit:** `d6f8529`
- **Versions:** `mobile` 2.48.0 → 2.49.0

## Context

During a live game the coach over-pressed the pitch-calling controls, firing rapid calls to the
catcher with no tactile confirmation that a press had registered. The three controls need a real
buzz on press so an accidental/hard tap is felt: **Send Call**, **push-to-talk (Hold to Talk)**,
and **Shake**.

The wrinkle: these handlers *already* call `Haptics.*` (`handleSendCall` → Heavy,
`handleShake` → Warning, `handleTalkPressIn` → Medium), but `src/utils/haptics.ts` is a global
**no-op** — expo-haptics' TurboModules crash on the iOS 26.2 beta, so all haptics were disabled
app-wide. So nothing fired.

## Plan (Decisions)

- **Targeted, not app-wide.** Re-enabling the no-op wrapper would turn haptics on at ~dozens of
  call sites across ~25 files, and iOS core `Vibration` is a firm buzz — obnoxious everywhere.
  The request was scoped to 3 buttons, so add a real vibration only to those handlers and leave
  the global no-op (and its future-expo-haptics migration path) intact.
- **RN core `Vibration`, not expo-haptics.** `Vibration` is always-linked React Native core (no
  TurboModule), so it's safe on the iOS 26.2 beta and needs **no EAS rebuild** — it works in the
  current dev client. iOS plays its standard short vibration; Android honors a brief 20 ms tap.
- **Fix in the shared handlers, not per-screen.** `LiveGamePhone` and `LiveGameTablet` both call
  the same `useLiveGameActions` handlers, so one change covers both (parity automatic).

## What shipped

**mobile** (`packages/mobile`)

- `src/utils/vibrate.ts` (new): `vibrateTap()` — a single short `Vibration.vibrate(20)` wrapped
  in try/catch, with a comment explaining why it bypasses `utils/haptics` and that it can be
  dropped once that wrapper is restored to real expo-haptics.
- `app/game/[id]/useLiveGameActions.ts`: call `vibrateTap()` at the top of `handleSendCall`,
  `handleShake`, and `handleTalkPressIn` (alongside the existing no-op `Haptics.*` calls, which
  remain as the future-Taptic markers).
- `package.json`: 2.48.0 → 2.49.0.

No `shared`/`api`/`web` change. No `app.json`/native change (Vibration is RN core; React Native's
own manifest declares the Android `VIBRATE` permission).

## Verification

- **Automated:** `cd packages/mobile && npx tsc --noEmit` clean; `npm test` → 37/37; prettier clean.
- **On device (for Brian):** open a live game with pitch-calling enabled (existing dev client, no
  rebuild). Tap **Send Call** → feel a buzz; hold **Hold to Talk** → buzz on press-in; tap
  **Shake** → buzz. Confirm on a physical phone (the iOS simulator has no vibration).

## Out of scope (deferred)

- **Debounce / rate-limit** on Send Call (the actual *prevention* of rapid calls) — haptics give
  confirmation but don't block double-fires. Flagged as a likely follow-up if mashing persists.
- `handleResendCall` and other live-game buttons — only the three named controls were wired.
- Restoring real haptics app-wide — blocked on the expo-haptics/TurboModule fix (see the TODO in
  `src/utils/haptics.ts`); when that lands, remove the `vibrateTap()` calls in favor of the
  existing `Haptics.*` calls.
