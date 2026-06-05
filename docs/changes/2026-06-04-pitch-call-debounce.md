# Debounce Pitch-Call Announcements (mobile)

- **Date:** 2026-06-04
- **Type:** `fix`
- **Commit:** `81f83fe`
- **Versions:** `mobile` 2.49.0 → 2.50.0
- **Related:** follow-up to [pitch-call-haptics](2026-06-04-pitch-call-haptics.md) (`d6f8529`), which
  added tactile feedback but explicitly deferred the rate-limit.

## Context

Over-pressing the pitch-call controls during a live game fired **rapid calls at the catcher**.
Haptics (shipped in `d6f8529`) confirm a press but don't *prevent* repeats — if you mash through
the buzz it still fires. This adds the actual prevention: a short cooldown so the catcher can't
be spammed.

## Plan (Decisions)

- **Time-based cooldown in the shared handler**, not a per-button disabled state — the cooldown is
  set at the *start* of the action (before the async request), so it also blocks taps that land
  while a send is in flight. One place (`useLiveGameActions`) covers phone + tablet.
- **Shared cooldown across Send and Resend.** Both announce to the catcher, so they share one
  `lastCallSentAtRef`: no announce action can repeat within `CALL_COOLDOWN_MS` (1000 ms). A coach
  won't legitimately send two distinct calls inside a second.
- **Silently drop** the rapid follow-ups (no toast). The first press already buzzed and sent; the
  ignored repeats are exactly what we want gone — surfacing them would re-add noise.

## What shipped

**mobile** (`packages/mobile`)

- `app/game/[id]/useLiveGameActions.ts`:
  - Added `CALL_COOLDOWN_MS = 1000` and a `lastCallSentAtRef` (useRef).
  - `handleSendCall`: after the existing validity guard, drop the press if
    `Date.now() - lastCallSentAtRef.current < CALL_COOLDOWN_MS`; otherwise stamp the ref and proceed.
  - `handleResendCall`: same guard, sharing the same ref.
- `package.json`: 2.49.0 → 2.50.0.

No `shared`/`api`/`web` change.

## Verification

- **Automated:** `cd packages/mobile && npx tsc --noEmit` clean; `npm test` → 37/37; prettier clean.
- **On device:** in a live game with pitch-calling on, mash **Send Call** — only one call goes to
  the catcher per ~1 s (the first); rapid re-taps are ignored. Same for **Resend**, and Send→Resend
  spam is rate-limited together. A deliberate new call after ~1 s still sends normally.

## Out of scope (deferred)

- A visible cooldown indicator (e.g. briefly dimming the button) — silent drop is enough for now;
  add if coaches find the ignored taps confusing.
- Tuning `CALL_COOLDOWN_MS` — 1 s is a first guess; adjust from field feedback.
