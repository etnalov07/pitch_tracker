# Fix: RHH pitch dot mirrored after a pitch-com call (mobile)

- **Date:** 2026-05-28
- **Type:** fix
- **Commit:** `<pending>`
- **Versions:** mobile `2.40.0` → `2.41.0`

## Context

A coach reported that after sending a pitch call over pitch-com (and especially
when **re-sending / changing** a call), the logged pitch dot rendered on the
**wrong side of the plate for right-handed batters**. Suspected at first to be a
side effect of the just-shipped offline buffering, but it is **pre-existing** and
unrelated: the offline optimistic pitch uses the exact `location_x` the server
stores (`pitch.service.ts` saves it verbatim), so buffering can't move the dot.

Root cause: the `pitch_call` WebSocket handler in `useLiveGameController.ts`
pre-fills the pitch location to the called zone's center so the receiver only
has to pick a result. It read **raw** `PITCH_CALL_ZONE_COORDS[zone]` (canonical
pitcher's-view coords, x=0 on the catcher's left). The strike zone renders pitch
dots un-mirrored (`toSvgCoords`) while displaying zones mirrored for RHH via
`getZoneCoords` (`x → 1 - x`). So the raw pre-fill landed RHH dots on the flipped
side. Re-sending re-fires the handler, re-applying the bad location over any
manual tap — hence "especially on re-send." LHH was unaffected because
`getZoneCoords` returns canonical coords unchanged for LHH.

This is the same bug class as commit `4db186c` ("inverted horizontal tap
coordinates"), in a code path that fix didn't cover.

## Plan (Decisions)

- Mirror the pre-filled location with the **same** `getZoneCoords(zone,
effectiveSide)` the renderer uses — never raw coords.
- Extract the batter-side formula into `getEffectiveSide()` in
  `strikeZoneCoords.ts` as the single source of truth, and reuse it in
  `StrikeZone.tsx` (which had the formula inline) to prevent future drift.
- `useGameWebSocket` stores handlers in a ref refreshed every render, so the
  `pitch_call` callback already sees the latest batter/pitcher — no stale-closure
  workaround needed; derive the side inline in the controller.
- **Mobile-only.** Web's `pitch_call` handler (`LiveGame.tsx`) does not pre-fill
  a location at all, so it has no equivalent bug.

## What shipped

### `packages/mobile/`

- `src/components/live/StrikeZone/strikeZoneCoords.ts` — new
  `getEffectiveSide(batterSide, pitcherThrows)` helper (handles switch hitters +
  null/undefined → `'R'`, matching the StrikeZone default).
- `src/components/live/StrikeZone/StrikeZone.tsx` — replaced the inline
  `effectiveSide` ternary with `getEffectiveSide(...)` (no behavior change).
- `app/game/[id]/useLiveGameController.ts` — the `pitch_call` handler now sets
  `pitchLocation` via `getZoneCoords(zone, getEffectiveSide(batterSide,
pitcherThrows))` instead of raw `PITCH_CALL_ZONE_COORDS[zone]`. Derives the
  batter side from the same inputs the StrikeZone uses.
- `src/components/live/StrikeZone/__tests__/strikeZoneCoords.test.ts` — 3 new
  `getEffectiveSide` cases (non-switch passthrough, undefined→R, switch-hitter
  platoon side). 18 tests total now pass.
- `package.json` — `2.40.0` → `2.41.0`.

## Verification

1. `cd packages/mobile && npx tsc --noEmit` — clean.
2. `cd packages/mobile && npx jest --no-coverage` — 18/18 pass.
3. **On-device:** with a **RHH** up, send a pitch call over pitch-com → the
   pre-filled dot now sits on the correct (batter) side; re-send/change the call
   → it stays correct. Confirm LHH still correct (unchanged). Two-tap and
   single-tap manual logging unaffected.

## Out of scope (deferred)

- Web parity change — not needed (web doesn't pre-fill a location on `pitch_call`).
- Backfilling already-logged pitches that were stored with the mirrored location
  (historical data); only new pre-fills are corrected.
