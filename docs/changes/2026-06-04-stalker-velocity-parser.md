# Stalker Pro 3s — bE-frame velocity decode + radar re-enable

- **Date:** 2026-06-04
- **Type:** `feat`
- **Commit:** _(backfill on commit)_
- **Versions:** `mobile` 2.45.0 → 2.46.0
- **Plan:** ad-hoc handoff (`files.zip`: `stalker-integration-plan.md` + `stalkerRadar.ts`), reconciled against the repo. Supersedes the parser half of [`2026-05-16-stalker-radar-ble.md`](2026-05-16-stalker-radar-ble.md) and complements the diagnostic work in [`2026-05-27-stalker-pro3s-diagnostic.md`](2026-05-27-stalker-pro3s-diagnostic.md).

## Context

We want PitchChart to read pitch velocity straight off a Stalker Pro 3s over BLE and auto-fill the charter's velocity field. A handoff spec + decode module were provided, but written generically and predating the repo. Reconciling against the code showed most of the plumbing already existed and was **gated off** (`RADAR_FEATURE_ENABLED = false`) because the original packet parser only read a single fixed 2-char field and "only ever yielded an idle status frame, never a live reading":

- BLE plumbing (`react-native-ble-plx` plugin + iOS permission string in `app.json`) — already present.
- Connection service, scan/pair/diagnose settings UI, `useStalkerRadar` hook, `RadarStatusPill`, and live-game velocity auto-fill (`useLiveGameController.ts` copies `radar.lastVelocity` into the velocity field) — already built.
- The full 128-bit characteristic UUID the handoff asked for (`FEC26EC4-6D71-4442-9F81-55BC21D658D6`) — already in the service.

The one genuinely broken piece was the **packet parser**. This change replaces it with the documented `bE` multi-block decoder and re-enables the feature.

## Plan (Decisions)

- **Scope: parser unlock only.** Velocity continues to persist via the existing `pitches.velocity` column. The handoff's Phase 2/4 (`pitch_velocity_measurements` table, `POST /pitches/:id/velocity`, radar-vs-CV comparison) is **deferred** — there is no computer-vision velocity source in the system today, so radar-vs-CV has nothing to compare against.
- **Parser: hybrid bE + fixed-offset fallback.** The handoff's rigid "15-byte block from offset 7" decoder, traced against the two **real captured packets** in the existing test fixture, returns `null` — their `'5'`/`'6'` block-ID markers don't sit on the 15-byte grid (the digits "72"/"85" do land at bytes 26/27, but the block-ID guard fails). Rather than regress the only ground-truth data we have, `decodeReading()` tries the bE grid first and **falls back** to the fixed-offset peak field when no block yields a numeric speed. The parser must pass BOTH the bE model AND the existing fixture.
- **Re-enable behind existing per-user gating.** Flipping the master flag only reveals the settings UI; the feature is still gated by `settings.radarEnabled` + a paired `radarDeviceId` (both default off, persisted in AsyncStorage).

## What shipped

**mobile** (`packages/mobile`)

- `src/utils/stalkerRadar/stalkerPacket.ts`:
  - Added `SpeedReading` interface (`live`/`peak`/`hit`/`inbound`).
  - Added `parseSpeedBlock()` + `parseFrame()` — documented `bE` block-grid decode (offset 7, 15-byte stride, ASCII digits, tenths resolution, inbound zone bit).
  - Added `decodeReading()` — hybrid wrapper: bE grid first, fixed-offset peak fallback; returns `null` only when neither finds a speed.
  - Added `StalkerSpeedStream` — CR-delimited notification reassembler emitting one `SpeedReading` per complete frame; operates on raw byte arrays (service base64-decodes once).
  - Added `PitchDetector` — holds the peak through a throw and emits one debounced `(mph, reading)` per pitch after a quiet gap (`minMph` 30, `quietMs` 700 defaults).
  - Refactored the fixed-offset logic into an internal `peakFromFixedOffset()` (no CR requirement) so the bE fallback works on the CR-stripped buffer the stream delivers; `parseVelocityFromPacket()` keeps its CR "complete packet" guard and behavior (existing tests unchanged).
- `src/utils/stalkerRadar/stalkerRadarService.ts`:
  - Replaced the per-notification `parseVelocityFromPacket → emitVelocity` call in the `connect()` monitor callback with the `StalkerSpeedStream → PitchDetector → emitVelocity(mph)` pipeline (reassembly + debounce + tenths).
  - Added `speedStream`/`pitchDetector` instance fields and a `teardownPipeline()` helper; pipeline is (re)built on `connect()` and disposed on disconnect/reconnect so a stale quiet-gap timer can't fire late.
  - Flipped `RADAR_FEATURE_ENABLED` to `true` (updated the comment to explain the re-enable + per-user gating).
- `src/utils/stalkerRadar/__tests__/stalkerFrame.test.ts` (new): 15 tests — bE grid decode with tenths, hybrid fallback on the two captured packets, CR-stripped-buffer decode, stream reassembly across split/batched notifications, and detector peak-hold/quiet-flush/min-mph/dispose (fake timers).
- `package.json`: version 2.45.0 → 2.46.0.

No `shared`, `api`, or `web` changes. No `app.json` change — the ble-plx plugin, iOS permission string, and `modes: []` (foreground-only, no background BLE) were already correct.

## Verification

- **Automated (run here):**
  - `cd packages/mobile && npm test` → 33/33 pass (15 new + existing).
  - `cd packages/mobile && npx tsc --noEmit` → clean.
  - `npx prettier --write` on the three changed `.ts` files → no diff.
- **On device (requires a physical iPhone + EAS dev build — cannot run from the Windows dev box):**
  1. `eas build --profile development --platform ios`; install on a physical iPhone.
  2. On the gun, enable **peak speed** and set **resolution = tenths** (the parser depends on peak-enabled frames; tenths gives `79.4` vs `79` for cleaner logging).
  3. App → Settings → Radar Gun: toggle Stalker on, **Scan**, pair the gun.
  4. Open a live game; throw into the gun. The velocity field should auto-fill with the gun's displayed peak (within rounding), one clean value per pitch, with no bleed across rapid consecutive pitches.
  5. If only idle frames arrive, use the Scan/Diagnose + raw-capture UI to capture real frames and refine `parseFrame`/`decodeReading`.

## Out of scope (deferred)

- `pitch_velocity_measurements` table, `POST /pitches/:id/velocity`, and the radar-vs-CV comparison view (handoff Phase 2/4) — revisit when a CV velocity source exists.
- The Velocity Sender second-device path (`9a3023c`) — separate feature, unaffected by this change.
- Background BLE / staying connected when backgrounded; spin-rate capture; Android hardware verification (code stays Android-compatible, verify on iOS first).
