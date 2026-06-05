# Stalker Pro 3s — Spin (RPM) Detection

- **Date saved:** 2026-06-04
- **Status:** **Planned / parked** — format reverse-engineered from a real capture; implementation deferred.
- **Depends on:** velocity decode (shipped `8cf91e8`) and the raw-capture tooling (shipped `f82fd8e`, settings UI later removed but service-level capture kept).

## Context

Velocity from the Stalker Pro 3s works on hardware. The gun also displays spin/RPM, and we
confirmed from a real BLE capture (`capture.log`, 2026-06-04, 2599 frames) that **spin is on
the wire, inside the same `bE` frame on the velocity characteristic** (`...ec4`). The second
characteristic (`...ec3`, Notify+Write) never emitted a frame, so spin does **not** need a
separate channel or an enabling write.

## The decoded format (the valuable part — don't re-derive)

Frames are the documented `bE` layout: `0x88` + unit config/status + `'3'` (numSpeeds) + three
15-byte blocks at offsets 7 / 22 / 37, then CR. Block IDs:

- `'4'` (0x34) = live, `'5'` (0x35) = peak, `'6'` (0x36) = hit (idle/blank).
- **`'9'` (0x39) = SPIN** — when present, it occupies the 3rd block slot (offset 37) in place of
  the `'6'` hit block.

Velocity already decodes from the `'5'` peak block (e.g. `609` → 60.9 mph, tenths).

Observed spin frame (ascii): `34A 608         5A 609 629     9A17130        .`
- Block 3 = `9A17130` → id `'9'`, zone `'A'`, then digits `17130`.
- `17130` → **1713.0 RPM** (÷10, same tenths convention as velocity). Paired with a ~60.9 mph
  peak on that pitch.
- Unlike the speed blocks (3-digit H/T/O + tenths), spin is a **wider field** — read the run of
  ASCII digits starting at `block_offset + 2` (here bytes 39..43 = `"17130"`), parse, ÷10 → RPM.

### Reliability caveat (important for UX)
In a capture with **many** velocity readings, spin appeared on **only one** pitch (30 held
frames ≈ 1.9 s, same hold behavior as peak). So the gun reports spin on *some* pitches, not all
— the UI must treat spin as **optional / intermittent**, never required, and not block velocity
on it. Also: the ÷10 decimal placement is inferred from a **single** sample (1713.0 RPM is the
only physically sane reading); confirm against 2-3 more captures, or against what the gun's own
display showed, before trusting the decimal.

## Implementation plan (when picked up)

Mirror the velocity path. Multi-package, includes a DB migration.

1. **shared** — add `spin?: number` to the `Pitch` interface (`packages/shared/src/index.ts`); rebuild.
2. **mobile decode** (`src/utils/stalkerRadar/stalkerPacket.ts`):
   - Extend `parseFrame`/`parseSpeedBlock` to recognize the `'9'` block and read its multi-digit
     RPM field (digits from `off+2`, ÷10). Add `spin: number | null` to `SpeedReading`.
   - `PitchDetector`: carry the latest spin alongside the peak; emit it with the pitch
     (`onPitch(mph, reading)` already passes the full reading — surface `reading.spin`).
   - Unit tests: a synthetic `'9'`-block frame → 1713.0; absence → null; spin does not disturb
     velocity decode. (The captured `9A17130` frame makes a good fixture.)
3. **mobile service/hook** — expose the latest spin so the live form can read it (parallel to
   `lastVelocity`/`lastReadingAt`).
4. **api** — migration `0NN_pitch_spin.sql` adding `pitches.spin NUMERIC(6,1) NULL`; thread
   `spin` through `pitch.service.logPitch` INSERT and (optionally) the bulk
   `updatePitchVelocities` → generalize to velocity+spin backfill.
5. **live-game UI** (`useLiveGameController.ts` + Live screens) — auto-fill a spin field from the
   radar reading when present; display it read-only when null (don't force entry).
6. **web** (optional) — show spin in Replay / PitcherStats; extend the manual velocity-entry page
   to velo+spin if backfill is wanted.

## Out of scope / open questions
- Decimal placement confirmation (÷10) — needs more samples or the gun's display value.
- Whether to persist spin in the deferred `pitch_velocity_measurements` table instead of a column
  — tied to the Phase 2/4 decision in `2026-06-04-stalker-velocity-parser.md` (still deferred, no
  CV source). Simplest first cut: a plain `pitches.spin` column.
- Surfacing "spin unavailable for this pitch" vs. blank.

## Pointers
- Capture tooling (parked): `src/utils/stalkerRadar/captureLog.ts` (`formatCaptureLog`),
  `stalkerRadarService.startRawCapture`/`buildCaptureText`, `useStalkerRadar.getCaptureText`.
  The settings UI that drove it was removed in this commit; re-expose a button to gather more
  spin samples when implementing.
- Velocity decode + change doc: `docs/changes/2026-06-04-stalker-velocity-parser.md`.
- Capture-share change doc: `docs/changes/2026-06-04-stalker-capture-share.md`.
