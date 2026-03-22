# PitchChart — Walkie-Talkie, BT Status & Call Analytics

**Date:** 2026-03-22
**Status:** Planned
**Commits:** N/A (not yet implemented)

## Summary

Adds walkie-talkie push-to-talk (coach voice to catcher earpiece), real Bluetooth device detection with an enhanced status dashboard, and call-vs-execution analytics. Builds on the existing pitch calling system (TTS, Redux state, API, UI) which is already complete.

## Motivation

The pitch calling spec (`pitchchart-pitch-calling-spec.md`) defines a full electronic pitch communication system compliant with NFHS rules. The core pitch calling flow (select pitch + zone, send TTS to earpiece, log result) is already built. The remaining gaps are:

1. **Walkie-talkie** — coaches want live voice to the catcher for situational context ("watch the runner at second"), not just pitch type/zone
2. **Bluetooth status** — the current BT indicator is a manual toggle with no real device detection; coaches need to know at a glance if the earpiece is live
3. **Call analytics** — no way to measure how well pitchers execute the called pitch vs. what was actually thrown

## Design Decisions

- **Keep TTS over pre-recorded clips.** The `expo-speech` system works reliably. Pre-recorded m4a clips (104 files) add bundle size and recording effort with marginal quality gain for short spoken commands. TTS stays.
- **Stay on HFP (Hands-Free Profile), not A2DP.** The spec advocates A2DP for "provably one-way" compliance, but on iOS, enabling mic recording (required for walkie-talkie) forces Bluetooth to switch from A2DP to HFP at the platform level. HFP is still one-way in practice: the earpiece receives audio, and the phone mic is the phone's own mic, not the earpiece's. NFHS compliance argument holds.
- **Prototype walkie-talkie first.** Real-time mic-to-BT passthrough is the highest-risk feature. `expo-av` records to files, not real-time streams. `react-native-audio-api` (Web Audio API for RN) is the primary candidate. If it doesn't work in Expo managed workflow, a native module would be needed — better to know early.
- **Use `react-native-headphone-detection`** for real BT audio connection/disconnection events and device name. The project already uses EAS builds, so adding a native dependency is viable.
- **Spec's DB proposal is redundant.** The spec suggests adding `called_pitch_type`, `called_zone`, `call_sent_at`, `call_changed` columns to the `pitches` table. The existing `pitch_calls` table (migration 009) already captures all of this with a more comprehensive schema and links to pitches via `pitch_id`.

## Existing Foundation (No Changes Needed)

| Component | Location |
|---|---|
| `pitch_calls` DB table | `packages/api/src/migrations/009_pitch_calling.sql` |
| Pitch call API (CRUD, change, transmit, result, summary) | `packages/api/src/routes/pitchCall.routes.ts`, `services/pitchCall.service.ts` |
| Redux state (create, change, transmit, result, fetch) | `packages/mobile/src/state/pitchCalling/pitchCallingSlice.ts` |
| Pitch calling screen (type grid, zone grid, send/resend/change/result) | `packages/mobile/app/game/[id]/pitch-calling.tsx` |
| UI components (CallPitchTypeGrid, CallZoneGrid, CallResultButtons, CallHistory) | `packages/mobile/src/components/pitchCalling/` |
| Shared types (PitchCall, PitchCallAbbrev, PitchCallZone, labels) | `packages/shared/src/index.ts` |
| TTS audio service (HFP routing, double-speak, change prefix) | `packages/mobile/src/utils/pitchCallAudio.ts` |

## Changes

### Phase 1: Walkie-Talkie Prototype (De-risk)

**Goal:** Prove real-time phone-mic-to-BT-earpiece passthrough is feasible.

#### Mobile
- Install `react-native-audio-api` dependency
- New `packages/mobile/src/utils/walkieTalkie.ts` — AudioContext connecting phone mic input to BT audio output
  - `startPassthrough()`, `stopPassthrough()`, `getInputLevel()`
  - Target latency: <200ms
- Temporary test button on pitch-calling screen to validate

### Phase 2: Enhanced Bluetooth Status Dashboard

**Goal:** Replace manual toggle with real BT device detection.

#### Mobile
- Install `react-native-headphone-detection` dependency
- New `packages/mobile/src/utils/bluetoothAudio.ts` — BT audio detection utility + `useBluetoothAudio()` hook
- Rewrite `packages/mobile/src/components/pitchCalling/BluetoothStatus/BluetoothStatus.tsx`:
  - Remove manual toggle, show real device name
  - States: green (connected + name + "Receive Only"), red (disconnected + alert), amber (reconnecting), gray (no device paired + link to Settings)
  - Connection loss: haptic + visual alert
- Update `packages/mobile/app/game/[id]/pitch-calling.tsx`:
  - Replace hardcoded `btConnected` with `useBluetoothAudio()` hook
  - Gate Send/Resend on BT connection

### Phase 3: Walkie-Talkie Full Build (if prototype succeeds)

**Goal:** Production push-to-talk with UI and audio mixing.

#### Mobile
- Finalize `walkieTalkie.ts` — add open/close chimes, audio mixing (pitch calls duck mic), proper teardown
- New `packages/mobile/src/components/pitchCalling/WalkieTalkieButton/WalkieTalkieButton.tsx`:
  - Press-and-hold Pressable (60x60px min)
  - Idle: gray mic + "HOLD TO TALK" / Active: pulsing red ring + "TALKING..."
  - Audio level meter
  - Disabled when BT disconnected
- Integrate into pitch-calling screen layout (below zone grid, left of Send)
- Modify `pitchCallAudio.ts` to pause walkie-talkie during TTS playback

### Phase 4: Call-vs-Execution Analytics

**Goal:** Dashboard showing pitcher execution accuracy against called pitches.

#### API
- New `packages/api/src/services/pitchCallAnalytics.service.ts` — join `pitch_calls` to `pitches` via `pitch_id`, compute accuracy metrics
- New `packages/api/src/controllers/pitchCallAnalytics.controller.ts`
- New `packages/api/src/routes/pitchCallAnalytics.routes.ts`:
  - `GET /bt-api/pitch-call-analytics/pitcher/:pitcherId`
  - `GET /bt-api/pitch-call-analytics/game/:gameId`
  - `GET /bt-api/pitch-call-analytics/team/:teamId/season`
- Register routes in `packages/api/src/app.ts`

#### Shared
- Add `PitchCallAccuracy`, `PitcherExecutionStats` types to `packages/shared/src/index.ts`

#### Mobile
- New `packages/mobile/app/game/[id]/pitch-call-analytics.tsx` — stats screen
- Add analytics thunks to `pitchCallingSlice.ts` and API methods to `pitchCallingApi.ts`
- Enhance result logging to pass `pitch_id` for call-to-pitch linkage

#### Web (lower priority)
- New `packages/web/src/services/pitchCallAnalyticsService.ts`
- New `packages/web/src/pages/PitchCallAnalytics/` page with charts

## File Manifest

| File | Action | Purpose |
|------|--------|---------|
| `packages/mobile/src/utils/walkieTalkie.ts` | Added | Real-time mic-to-BT passthrough |
| `packages/mobile/src/utils/bluetoothAudio.ts` | Added | BT audio detection + `useBluetoothAudio()` hook |
| `packages/mobile/src/components/pitchCalling/WalkieTalkieButton/WalkieTalkieButton.tsx` | Added | Push-to-talk button component |
| `packages/mobile/src/components/pitchCalling/WalkieTalkieButton/index.ts` | Added | Barrel export |
| `packages/mobile/src/components/pitchCalling/BluetoothStatus/BluetoothStatus.tsx` | Modified | Real BT detection, device name, connection states |
| `packages/mobile/src/components/pitchCalling/index.ts` | Modified | Export WalkieTalkieButton |
| `packages/mobile/src/utils/pitchCallAudio.ts` | Modified | Pause walkie-talkie during TTS |
| `packages/mobile/app/game/[id]/pitch-calling.tsx` | Modified | BT hook, walkie-talkie button, gated Send |
| `packages/mobile/package.json` | Modified | Add react-native-audio-api, react-native-headphone-detection |
| `packages/mobile/app.json` | Modified | Config plugin for headphone detection (if needed) |
| `packages/api/src/services/pitchCallAnalytics.service.ts` | Added | Call accuracy analytics queries |
| `packages/api/src/controllers/pitchCallAnalytics.controller.ts` | Added | Analytics controller |
| `packages/api/src/routes/pitchCallAnalytics.routes.ts` | Added | Analytics route definitions |
| `packages/api/src/app.ts` | Modified | Register analytics routes |
| `packages/api/src/services/pitchCall.service.ts` | Modified | Enhance pitch_id linking in logResult |
| `packages/shared/src/index.ts` | Modified | Analytics types |
| `packages/mobile/app/game/[id]/pitch-call-analytics.tsx` | Added | Mobile analytics screen |
| `packages/mobile/src/state/pitchCalling/pitchCallingSlice.ts` | Modified | Analytics thunk + state |
| `packages/mobile/src/state/pitchCalling/api/pitchCallingApi.ts` | Modified | Analytics API methods |

## Known Limitations

- **Walkie-talkie may require a native module** if `react-native-audio-api` doesn't support real-time passthrough in Expo managed workflow. Phase 1 prototype will determine this.
- **HFP audio quality is 8kHz mono** (phone-call quality). Adequate for voice commands but not music-quality.
- **Battery level detection** is deferred. Reading earpiece battery via BLE (`react-native-ble-plx`) adds complexity and another native dependency. Can revisit later.
- **Web pitch calling** is not planned. Pitch calling is a mobile-only (dugout) feature. Web gets analytics only.
- **iOS 26.2 beta** — any new native modules must be tested against `newArchEnabled: false` constraint.

## Testing

| Phase | Verification |
|---|---|
| 1 | Pair BT earpiece, tap test button, speak into phone — hear voice through earpiece with <200ms latency |
| 2 | Disconnect earpiece — status bar turns red, Send disabled. Reconnect — auto-recovers green with device name |
| 3 | Hold talk button, speak — voice through earpiece. Tap Send while talking — TTS plays, voice ducks. Release — voice resumes |
| 4 | After a game with calls, `GET /bt-api/pitch-call-analytics/pitcher/:id` returns execution % and zone accuracy |
