# Live-Game Pitch Logger — Rhythm-First Flow (phone, fewer taps, radar velocity)

- **Date:** 2026-08-02
- **Type:** feat (web `packages/web`, some `packages/api`)
- **Status:** Approved (direction) — Tier 1 build pending
- **Related:** [phase2-c-partial-phone-reorder](2026-05-23-phase2-c-partial-phone-reorder.md) (mobile thumb-zone reorder — this is the web analog), [velocity-sender](2026-06-01-velocity-sender.md), [stalker-spin-detection](2026-06-04-stalker-spin-detection.md), command-grade plans (2026-05-11 / 2026-05-12).
- **Prototype (approved):** https://claude.ai/code/artifact/ac76584a-3839-4318-a438-1f70b14ba6f4

## Context

The primary user calls pitches **on a phone using the web app** during live games and does not want logging to slow the pitcher's rhythm. A live walkthrough of the current flow (production game, confirmed against code) found the per-pitch loop is **3 mandatory taps across two separated screen regions**:

| Step | Action | Taps | Where |
| --- | --- | --- | --- |
| 1 | Select pitch type | 0 (persists) | top strip |
| 2a | Tap zone = **called target** | 1 (mandatory) | center strike zone |
| 2b | Tap zone = **actual location** | 1 (mandatory) | center strike zone |
| — | *(if `showVelocity`)* type mph | keyboard | right column |
| 3 | Tap **result** | 1 (mandatory) | right column |

Confirmed root causes in code:

- **Two mandatory location taps.** `StrikeZone` enters "target mode" whenever `LiveGame` passes `onTargetZoneSelect` (it always does). The first tap sets `targetZone`; only the **second** tap calls `onLocationSelect`, which sets `pitchLocation`. `handleLogPitch` hard-guards `if (!currentAtBat || !pitchLocation) showError('Please select a pitch location')` — so a result cannot commit until the second tap. (`useLiveGameActions.ts:359-364`, `StrikeZone.tsx:122-157`.)
- **Horizontal layout on a phone.** `StrikeZoneRow` places the zone (`StrikeZoneContainer`) and the result buttons (`PitchForm`) side-by-side, forcing cross-screen thumb travel every pitch (`LiveGame.tsx:797-911`, `styles.ts`).
- **Velocity is an inline blocking step.** When `showVelocity` is on, a numeric `Input` renders as "Step 3" *between* the throw and the result (`LiveGame.tsx:817-829`).

Scope decisions from the user: **phone, web**; **keep command-grade and velocity data**, just make them faster; **Send-Call is out** (they moved to walkie-talkies), so the called target now serves command grade only; velocity should come **from a radar gun (ideal) or post-game import (fine)** — never typed inline.

## Goals

- Common pitch (pitcher hits the called spot) logs in **2 taps**: called target → result.
- No cross-screen thumb travel on a phone — zone and results in one column.
- Velocity never sits between the throw and the log.
- **No data loss**: command grade (called vs actual) still recorded; misses still capture a distinct actual location; velocity still attached (auto or imported).

## Non-goals (this round)

- Mobile (Expo) parity for the new web flow — deferred.
- Full Web-Bluetooth radar on web — deferred (see "Radar wrinkle").
- Send-Call / `pitchCallEnabled` changes — untouched (other users may still use it).
- Spin/RPM — separate parked plan.

## Decisions

**D1 — Actual location defaults to the called target.** After the called-target tap, the result chips are immediately usable. On a result tap with no explicit actual location, log the pitch using the **called zone's center** as `location_x/y`. The caller taps the grid a second time **only when the pitch missed**. Command grade is preserved: no second tap ⇒ actual == called ⇒ "hit his spot" (correct); a second tap ⇒ real miss recorded.

**D2 — Phone-first stacked layout.** Below a phone breakpoint, `StrikeZoneRow` becomes a single column: strike zone on top, result chips in a compact 2-row grid directly beneath, sized for thumb taps. Wider viewports keep today's side-by-side layout.

**D3 — Velocity is out of the pitch loop.** Remove the inline velocity `Input` from the throw→log path. Velocity attaches to a pitch **after** it logs, via (a) a radar/velocity stream that auto-fills the most-recent pitch, or (b) the existing post-game **Velocity Entry** import. Manual per-pitch typing is retired from the fast flow (optionally retained behind a setting for keyboard users).

**D4 — Ship behind a setting.** Add a `rhythmMode` (working name) toggle to `useSettings` (same localStorage pattern as `showVelocity`/`pitchCallEnabled`), default **on** for new use. When off, the current classic flow is unchanged — zero risk to existing users.

## Implementation

### packages/web

**D1 — actual defaults to called** (`pages/LiveGame/useLiveGameActions.ts`, `components/live/StrikeZone/StrikeZone.tsx`)
- In `handleLogPitch`, relax the guard: require a location **or** a `targetZone`. When `pitchLocation` is absent but `targetZone` is set, derive `location_x/y` from the zone center via `PITCH_CALL_ZONE_COORDS[targetZone]` (already imported in `StrikeZone`; reuse from `@pitch-tracker/shared`). Keep sending `target_zone` as today so command grade is unchanged.
- `StrikeZone`: after `targetZone` is set, update the instruction copy to "Tap a result — or tap where it actually went if it missed" (`Instructions`, line ~402). No change to the two-stage tap handler; the second tap remains the "miss" path.
- Result buttons already call `handleLogPitch(result)` directly, so no change to the commit path beyond the guard.

**D2 — stacked phone layout** (`pages/LiveGame/styles.ts`, `pages/LiveGame/LiveGame.tsx`)
- Make `StrikeZoneRow` responsive: `flex-direction: column` under the phone breakpoint (reuse `theme.breakpoints`), zone first, `PitchForm` (results) second.
- Give `ResultButtons` a phone treatment: larger min tap height, primary row (Ball / Called Strike / Swing & Miss) emphasized, secondary row (Foul / HBP / In Play). Keep the existing color coding (matches the zone legend).
- Verify the `Send Call` button and velocity block don't reintroduce a horizontal split on phone.

**D3 — non-blocking velocity** (`pages/LiveGame/LiveGame.tsx`, `useLiveGameActions.ts`, `hooks/useSettings.ts`)
- Remove the inline velocity `FormGroup` from the pitch loop when `rhythmMode` is on; result becomes the final step again (revert the "Step 3/Step 4" relabel in that mode).
- Attach velocity to the **last logged pitch** after commit: subscribe to the velocity stream (the `velocityCall` WebSocket the backend already broadcasts) and PATCH the most-recent pitch's `velocity`. Show a small, non-blocking readout on the just-logged pitch (as in the prototype) — the zone stays live for the next pitch.
- Keep the post-game path intact: `pages/VelocityEntry/VelocityEntry.tsx` (`/game/:id/velocities`) already imports velocities after the fact.

### packages/api

- Confirm a **per-pitch velocity attach** endpoint exists for the live path (a `PATCH .../pitches/:id` velocity update — see `pitchVelocity.routes.test.ts` / `pitch.service.ts`). If the live auto-attach needs "set velocity on the latest pitch of a game", add a thin endpoint mirroring the `velocityCall` service; otherwise reuse the existing pitch update.
- No schema change: `pitches.velocity`, `location_x/y`, `target_zone` all already exist.

### packages/shared

- No changes. Reuse `PITCH_CALL_ZONE_COORDS` and `PitchCallZone`.

## Radar wrinkle (must resolve during build)

The Stalker BLE radar service lives in **mobile** (`packages/mobile/src/utils/stalkerRadar/*`, confirmed on hardware), but the caller uses the **web** app on a phone. "Auto from the gun" on web therefore needs one of:
1. **Velocity-sender path (recommended):** a second device (mobile app + radar) sends velocities into the game; the web caller receives them over the existing `velocityCall` WebSocket and they auto-attach. This is exactly what the parked [velocity-sender](2026-06-01-velocity-sender.md) work was built for — backend already shipped.
2. **Web Bluetooth** direct to the Stalker from the phone browser — larger effort, deferred.
3. **Post-game import only** (D3b) — already works via Velocity Entry; ship this first, layer live auto-attach after.

Recommend: ship D1/D2 + D3b (import) first; wire D3a (live auto-attach via velocity-sender) as a fast follow.

## Verification

1. **Prototype parity:** the built flow should match the approved prototype's rhythm (2-tap common pitch, 3-tap miss, radar readout after log).
2. **Command data intact:** log a pitch with no second tap → stored `target_zone` == derived actual (perfect command). Log with a second tap on a different zone → distinct actual, miss graded. Check the pitch's `location_x/y` + `target_zone` server-side.
3. **Phone layout:** at phone width, zone and results are one column, no horizontal scroll, thumb-reachable. Classic layout unchanged at desktop width and when `rhythmMode` is off.
4. **Velocity non-blocking:** result commits instantly; velocity attaches after (import path works end-to-end via Velocity Entry; live auto-attach when the sender stream is present). Next pitch can start before velocity arrives.
5. `/check` (web TS/ESLint + api TS/Jest). Prettier on changed files. Drive the flow in the app (the `verify`/`run` skill) before committing. Bump `packages/web` (and `packages/api` if the attach endpoint is added).
6. Change doc in `docs/changes/` on ship.

## Out of scope (deferred)

- Mobile parity for the new flow.
- Web-Bluetooth radar directly on web.
- Results-at-the-fingertip popover and other Tier-2/3 prototype variants.
- Any Send-Call / walkie-talkie changes.
- Spin/RPM.
