# Stalker Raw-Capture Share-to-File (spin reverse-engineering)

- **Date:** 2026-06-04
- **Type:** `feat`
- **Commit:** `f82fd8e` → _(follow-up: UI removed after it did its job)_
- **Versions:** `mobile` 2.46.0 → 2.47.0 → 2.48.0

## Context

Direct-BLE velocity from the Stalker Pro 3s now works on-device. Next target: **spin rate**.
The gun displays spin, but it is **not** in the `bE` velocity frame we decode — if it's on the
wire at all, it's on a separate BLE characteristic we haven't identified. The app already has a
"Capture raw packets" diagnostic (`startRawCapture` — discovers the full GATT table, subscribes
to every notify/indicate characteristic, reads every readable one), but the captured frames only
render on-screen (capped at 25, consecutive duplicates collapsed). There was no way to get the
raw hex frames **off the device** for offline reverse-engineering. This adds that: write the full
capture to a `.log` file and share it via the native share sheet.

## Plan (Decisions)

- **Write to a file + share it** (vs. a share-sheet text blob): hex dumps are long; a file
  survives, isn't truncated, and can be AirDropped/emailed for analysis.
- **`expo-file-system` (legacy API) + `expo-sharing`**, both already in `node_modules` and
  autolinked into the existing dev client → **no EAS rebuild required**. Used the stable
  `expo-file-system/legacy` (`writeAsStringAsync` + `cacheDirectory`) rather than the SDK 54
  `File`/`Paths` API to avoid the newer-API churn; `cacheDirectory` is correct for a
  share-and-forget diagnostic file.
- **Full capture buffer in the service**, separate from the hook's 25-frame deduped display
  buffer — the export needs every frame (no dedupe) with timestamps to correlate a candidate
  spin characteristic against the velocity frame and the gun's on-screen readout. Bounded at
  5000 frames so a long idle stream can't grow unbounded.
- **Pure `formatCaptureLog()`** so the serialization is unit-testable without a device.

## What shipped

**mobile** (`packages/mobile`)

- `src/utils/stalkerRadar/captureLog.ts` (new): pure `formatCaptureLog(input)` — serializes
  device + service/velocity UUIDs + GATT table (with N/I/R/W flags) + every frame
  (`epoch_ms · source · char · len · hex · | ascii`). Handles the empty case.
- `src/utils/stalkerRadar/__tests__/captureLog.test.ts` (new): 4 tests — header/UUIDs, GATT
  flag rendering, per-frame lines, empty capture.
- `src/utils/stalkerRadar/stalkerRadarService.ts`: added a full `captureLog: RawPacket[]`
  (cap 5000) + `lastGatt: GattEntry[]`; reset on `startRawCapture`, appended in
  `handleRawValue`, GATT stored after discovery; new `buildCaptureText()` feeds the pure
  formatter.
- `src/hooks/useStalkerRadar.ts`: exposed `getCaptureText()`.
- `app/(tabs)/settings.tsx`: imported `expo-file-system/legacy` + `expo-sharing`; added
  `handleShareCapture` (writes `stalker-capture-<ts>.log` to cache, opens the share sheet) and a
  **"Share capture log"** row under the connected radar diagnostic (shown once a capture has
  run, i.e. `radar.gatt.length > 0`).
- `package.json`: 2.46.0 → 2.47.0.

No `shared`/`api`/`web` change. No `app.json`/native change — both Expo modules were already in
the build.

## Verification

- **Automated:** `cd packages/mobile && npx tsc --noEmit` clean; `npm test` → 37/37 (4 new).
- **On device (for Brian):** Settings → Radar Gun (connected) → **Capture raw packets** → throw
  ~10 pitches, noting the velocity **and** spin the gun shows for each → **Share capture log** →
  send the `.log` file (AirDrop/email). The file lists every characteristic and every frame; if a
  non-velocity characteristic (anything other than `FEC26EC4…`) emits frames that track the
  displayed spin, that's the spin stream to decode next.

## Follow-up — capture did its job; settings UI removed (mobile 2.47.0 → 2.48.0)

The capture tool worked: a real capture (`capture.log`, 2599 frames) revealed that **spin rides
the same `bE` velocity frame** — when the gun reports spin, the 3rd block's ID byte is `'9'`
(instead of `'6'` hit) and carries RPM (e.g. `17130` → 1713.0 RPM). Full decode + the build plan
are recorded in `docs/plans/2026-06-04-stalker-spin-detection.md`.

With the data in hand, the diagnostic UI was removed from **Settings → Radar Gun** (the
"Capture raw packets", "Refresh reads", "Share capture log" rows + the GATT/raw-frame displays,
their handlers, and the `expo-file-system`/`expo-sharing` imports). The **service-level capture
tooling is kept** (`startRawCapture`, `buildCaptureText`, `captureLog`, `formatCaptureLog`,
`useStalkerRadar.getCaptureText`) — parked for the spin work, which will re-expose a button to
gather more spin samples. Scan / Diagnose / pair / connection-status UI is unchanged.

## Out of scope (deferred)

- The actual spin parser / `spin` column / display — planned in
  `docs/plans/2026-06-04-stalker-spin-detection.md`; build deferred.
- Confirming the ÷10 spin decimal placement — inferred from a single sample; needs more captures.
