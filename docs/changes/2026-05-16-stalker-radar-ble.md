# Stalker radar gun → BLE velocity auto-fill (mobile)

- **Date:** 2026-05-16
- **Type:** feat
- **Commit:** `687a190`
- **Versions:** mobile `2.2.1` → `2.3.0`

## Context

Pitch velocity was typed by hand into a numeric field on the live-game and bullpen
screens. The user reverse-engineered a Stalker radar gun's Bluetooth LE protocol; this
ships the integration so a captured reading auto-fills that field.

Confirmed protocol (from the user's reverse-engineering):

- **Service UUID:** `4880C12C-FDCB-4077-8920-A450D7F9B907`
- **Notify characteristic:** `FEC26EC4-6D71-4442-9F81-55BC21D658D6`
- **Packet:** fixed-width ASCII, `CR` (`0x0D`) terminated. Peak velocity is the 2-char
  ASCII field the user identified as "bytes 26–27" (1-indexed) — **0-indexed offset 25**.
  Verified against two captured packets that differed only there (`"72"` → `"85"`).

Scope: velocity only, mobile only, both the live-game and bullpen screens.

## Decisions

- **Pure parser, separately testable.** `stalkerPacket.ts` decodes a byte array → mph with
  no RN/BLE deps. The user's two real captured packets are the test fixtures — they also
  pin the 1-indexed vs 0-indexed offset (the parser uses `PEAK_VELOCITY_OFFSET = 25`).
- **`react-native-ble-plx` for GATT.** The app's existing Bluetooth code is *audio* (A2DP);
  this is the first BLE GATT integration. Added via `expo install` (picked `^3.5.1`), which
  also registered the config plugin. Low-friction: the app already ships as a custom EAS
  dev client with native modules.
- **Singleton service + hook.** `stalkerRadarService` owns one `BleManager` (lazily
  constructed so importing the module doesn't crash before the native rebuild); `useStalkerRadar`
  exposes it to any screen. Because the service is a singleton, the live and bullpen
  screens share one connection.
- **Auto-fill watches a timestamp.** Each screen's `useEffect` keys on `lastReadingAt`
  (not the value) so two identical readings still re-fill a cleared field. The radar
  overwrites the field; manual editing still works; logging clears it (existing behavior).
- **Pairing in Settings.** A "Radar Gun" section scans by service UUID, lets the user pick
  a device (persisted to AsyncStorage), and the hook auto-connects to it. Enabling radar
  also enables the velocity field, since radar feeds it.
- **Base64 decoded inline** (ble-plx delivers characteristic values base64-encoded) — a
  ~15-line decoder avoids a `Buffer` polyfill dependency.

## What shipped

### New files (`packages/mobile/`)

- `src/utils/stalkerRadar/stalkerPacket.ts` — `parseVelocityFromPacket`.
- `src/utils/stalkerRadar/__tests__/stalkerPacket.test.ts` — 7 cases incl. both real packets.
- `src/utils/stalkerRadar/stalkerRadarService.ts` — singleton `BleManager` wrapper: Android
  permission requests, scan by service UUID, connect + discover + subscribe, base64 decode →
  parse → emit, disconnect, bounded auto-reconnect, status enum.
- `src/hooks/useStalkerRadar.ts` — `{ status, lastVelocity, lastReadingAt, devices, scan,
  connect, disconnect }`; auto-connects to the remembered device when radar is enabled.
- `src/components/radar/RadarStatusPill/` — compact connection indicator beside the velocity field.

### Edited

- `package.json` — added `react-native-ble-plx@^3.5.1`; version `2.2.1` → `2.3.0`.
- `app.json` — `react-native-ble-plx` config plugin (`isBackgroundEnabled: false`,
  `bluetoothAlwaysPermission` → iOS `NSBluetoothAlwaysUsageDescription`; Android scan/connect).
- `src/state/settings/settingsSlice.ts` + `src/state/index.ts` — `radarEnabled` /
  `radarDeviceId` / `radarDeviceName` persisted keys + `setRadarEnabled` / `setRadarDevice` thunks.
- `app/(tabs)/settings.tsx` — "Radar Gun" section: enable toggle, scan, device list, paired row.
- `app/game/[id]/live.tsx` + `app/bullpen/[id]/live.tsx` — `useStalkerRadar()` + auto-fill
  `useEffect` + `RadarStatusPill` beside the velocity input, gated on `radarEnabled`.

## Verification

1. **Unit:** `cd packages/mobile && npm test` — 12 tests pass; `stalkerPacket.test.ts`
   decodes the two real packets to 72 / 85 and rejects malformed input.
2. **TypeScript:** `npx tsc --noEmit` clean (the pre-existing `deleteGame` import error in
   `app/(tabs)/index.tsx` is unrelated — tracked on the user-levels branch).
3. **One-time native build (required):** `eas build --profile development` — the BLE native
   module is not in the current dev client.
4. **On-device (needs the gun):** Settings → Radar Gun → enable → Scan → pick the Stalker →
   status pill on the live-game / bullpen screen shows "Radar"; throw a pitch → the velocity
   field auto-fills; manual edits still work; logging clears it.

## Out of scope (deferred)

- **Spin rate** — not decoded yet, and `Pitch` has no `spin_rate` field. When decoded it's a
  parser addition + a shared-type/API migration + a UI field.
- **Web** — `react-native-ble-plx` is RN-only; the web velocity field stays manual.
- **iOS background BLE** — foreground use only.
- **Multiple simultaneous radars** — single paired device.

## Manual step before this works on devices

`eas build --profile development` must be run and the new dev client installed — the BLE
native module won't load in the existing build.
