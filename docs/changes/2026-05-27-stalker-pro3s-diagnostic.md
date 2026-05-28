# Stalker Pro3S — BLE diagnose mode (mobile)

- **Date:** 2026-05-27
- **Type:** feat
- **Commit:** `e990f69` (diagnose scan), `<pending>` (raw-packet capture)
- **Versions:** mobile `2.36.0` → `2.37.0` → `2.38.0`

## Context

The 2026-05-16 feature (`docs/changes/2026-05-16-stalker-radar-ble.md`, commit
`687a190`) shipped BLE auto-fill of pitch velocity from a Stalker radar — built
against a Pro3S, verified against two real captured packets, and gated on the
hardcoded service UUID `4880C12C-FDCB-4077-8920-A450D7F9B907` (notify
characteristic `FEC26EC4-6D71-4442-9F81-55BC21D658D6`).

A Pro3S being paired today (iOS) doesn't show up in **Settings → Radar Gun →
Scan** at all. The production scan filters by `STALKER_SERVICE_UUID`, and iOS
strictly matches scan filters against what's in a peripheral's _advertisement
packet_ (not its GATT table) — so if this particular unit/firmware doesn't put
that UUID in its advertisement, the scan is silently empty and we can't tell
why. We need a diagnostic affordance before we know what to fix.

External research (Stalker Sport documentation, Pro3S pairing page, third-party
projects on GitHub) describes the Pro3S as a **Bluetooth Classic** device with
PIN pairing, and **no published BLE GATT** — so there's also a possibility the
unit isn't broadcasting BLE at all and the original capture worked against a
different mode/model. The diagnose flow will distinguish "different UUID" from
"no BLE at all."

## Plan (Decisions)

- **Diagnose-first, not fix-first.** With the shipped code working for the
  original packet capture but the new unit invisible to scan, we can't pick the
  right fix until we know what (if anything) the Pro3S advertises. Land the
  diagnostic in one PR; pick the production-path fix in a follow-up commit.
- **Additive only — leave the production flow untouched.** The existing `scan()`
  keeps its `STALKER_SERVICE_UUID` filter so pairing UX doesn't regress for the
  known-working case. A new `scanAll()` sibling does the unfiltered scan; new
  Settings row exposes it.
- **Hide Diagnose once paired.** Only show the button when `radarDeviceId` is
  null — once a radar is paired, the everyday Settings UX shouldn't surface a
  developer affordance.
- **Surface advertised data in the device row.** When `serviceUUIDs` are
  present on the discovered peripheral, render them under the name so the user
  can read them off without attaching a debugger.
- **Also `console.log` each discovered device.** Lets a developer attached via
  Xcode/Metro grep a complete record (id, name, localName, all serviceUUIDs)
  that's wider than the UI shows.
- **No shared-type, API, parser, Redux, or pitch-screen changes.** The parser
  and auto-fill pipeline are unchanged; once we land the right scan/connect
  config the existing pipeline takes over.

## What shipped

### `packages/mobile/`

- `src/utils/stalkerRadar/stalkerRadarService.ts` - Widened `RadarDevice` with optional `localName?: string | null` and
  `serviceUUIDs?: string[] | null` so the diagnose UI can render what each
  peripheral is advertising. - Added `scanAll(onFound)` — mirrors `scan()` (permissions, status, auto-stop
  after `SCAN_DURATION_MS`) but calls `manager.startDeviceScan(null, null,
...)` (no UUID filter) and forwards `device.serviceUUIDs` /
  `device.localName` into the callback. Logs each discovered device as
  `[stalker-diagnose] {…}` for developer capture.
- `src/hooks/useStalkerRadar.ts`
    - Exposed `scanAll: () => Promise<void>` on `UseStalkerRadar`; populates the
      same `devices` state as `scan()` and clears it on entry.
- `app/(tabs)/settings.tsx`
    - Added `handleDiagnoseRadar` callback wrapping `radar.scanAll()`.
    - Added a "Diagnose (show all Bluetooth devices)" `List.Item` (icon
      `bug-outline`) under the existing Scan row, **only when no radar is
      paired**.
    - Device-row description now renders `serviceUUIDs.join(', ')` under the
      id when present (up to 3 lines), and the title falls back to
      `device.localName` when `device.name` is null.
- `package.json` — version bump `2.36.0` → `2.37.0`.

## Verification

1. **Dev client current.** This requires the post-2026-05-16 dev client (the
   one that has `react-native-ble-plx` in it). If the iPhone is still on a
   pre-2026-05-16 build, run `cd packages/mobile && eas build --profile
development` and reinstall before testing — no BLE code runs otherwise.
2. **Unit tests.** `cd packages/mobile && npm test` — the existing 12 tests in
   `stalkerPacket.test.ts` and friends continue to pass (no parser or
   permission changes).
3. **TypeScript.** `cd packages/mobile && npx tsc --noEmit` — clean.
4. **Prettier.** `npx prettier --write` on the three changed files.
5. **On-device.** Power on the Pro3S. **Settings → Radar Gun → enable radar →
   tap Diagnose.** Wait the 12 s scan window. Read the device list and record:
    - Names / localNames of every peripheral that appeared
    - Any advertised serviceUUIDs (rendered under the id)
    - Whether anything resembling the Pro3S (name containing "Stalker", "PR",
      etc.) appears, and what UUIDs it advertises
6. **Follow-up commit (separate PR/doc).** Based on the readout, land one of:
    - Pro3S advertises a different service UUID → update the constant in
      `stalkerRadarService.ts:6-7`.
    - Pro3S advertises with no service UUIDs / a generic name → relax `scan()`
      to filter by name regex and discover characteristics after connect.
    - Pro3S doesn't appear at all → device-side / firmware / Classic-only
      issue; new design doc (Stalker partner SDK vs. `react-native-bluetooth-classic`
      Android-only pivot).

## Follow-up — raw-packet capture (mobile `2.37.0` → `2.38.0`)

The diagnose scan confirmed the radar connects, but the next blocker is decoding
the packet layout for _this_ unit: the existing parser only reads mph at a
hardcoded offset (25) tuned to the original unit, and **spin rate has never been
decoded** (the legacy Stalker stream is velocity-only — spin likely needs an
extended output format on the gun). To map both fields we need to see the raw
bytes, paired with the gun's own mph/spin readout.

### What shipped

- `src/utils/stalkerRadar/stalkerRadarService.ts`
    - New `RawPacket` interface (`serviceUuid`, `charUuid`, `bytes`, `hex`,
      `ascii`, `at`) + `bytesToHex` / `bytesToAscii` helpers.
    - `onRaw` / `emitRaw` listener plumbing + `rawListeners` / `rawSubs` fields.
    - `startRawCapture()` — on the connected device, logs the full GATT table
      (`[stalker-gatt] svc=… char=… notify/indicate/read`) and subscribes to
      **every** notifiable/indicatable characteristic (not just the hardcoded
      one), emitting each notification as a `RawPacket` and logging
      `[stalker-raw] char=… len=… hex=[…] ascii="…"`. `stopRawCapture()` tears
      the subscriptions down; both `disconnect()` and the device-disconnect
      handler call it.
- `src/hooks/useStalkerRadar.ts` — exposes `rawPackets` (newest-first, capped at 25) and `startRawCapture()`; clears the buffer on each capture start.
- `app/(tabs)/settings.tsx` — when status is `connected`, a "Capture raw
  packets" button + a monospace list of recent packets (ASCII title, `<len>B`
    - hex + source characteristic). Imported `Platform`; added `rawMono` style.

### How to capture (drives the next parser commit)

1. Settings → Radar Gun → confirm **Connected** → tap **Capture**.
2. Throw 3–4 shots at clearly different speeds; note the gun's own mph (and spin
   if shown) for each.
3. Pair each on-screen `hex`/`ascii` row with its true mph/spin and report back.
   Those become the parser fixtures, exactly like the original `72`/`85` packets
   pinned the mph offset.

If nothing streams on **Capture**, the `[stalker-gatt]` console lines still tell
us which characteristics exist (data may be read-only / poll-only, or spin needs
an output-format change on the gun itself).

## Out of scope (deferred)

- Decoding mph/spin offsets + writing the parser, the `spin_rate` shared type,
  API migration, and UI field — the _next_ commit, once we have raw fixtures.
- Changing the BLE service/characteristic constants — pending diagnose readout.
- Bluetooth Classic SPP / `react-native-bluetooth-classic` — only on the table
  if the Pro3S has no BLE at all; would be an Android-only pivot since iOS
  blocks non-MFi Classic.
- Stalker partner SDK (`stalkersport.com/pages/integration`) — same
  conditional; separate design doc if we go there.
- Android support, spin rate, background BLE, multi-radar — already deferred
  in the 2026-05-16 doc.

## Manual prerequisite

Same as the 2026-05-16 feature: the iPhone must be running a dev client built
after `react-native-ble-plx` was added (post-`687a190`). If not, the BLE module
isn't in the binary and Diagnose will silently no-op the same way Scan does.
Run `cd packages/mobile && eas build --profile development` and reinstall first.
