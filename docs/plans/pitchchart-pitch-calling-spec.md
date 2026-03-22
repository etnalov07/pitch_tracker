# PitchChart — Pitch Calling & Walkie-Talkie Feature Spec

---

## 1. NFHS Rules Analysis

### 1.1 What the Rules Say

The NFHS approved one-way electronic communication devices for high school baseball starting with the **2024 season**. The rules are defined across three key sections:

**Rule 1-6-2** — One-way electronic communication devices are permissible from the dugout to the catcher while the team is on defense for the purpose of calling pitches. When using the electronic communication device, the coach cannot be outside the dugout/bench area.

**Rule 3-2-5** — A coach may use a one-way electronic communication device to communicate to the catcher for the purpose of calling pitches. Coaches may not use electronic communication device(s) to communicate with any other team member while on defense or any team member while on offense.

**Rule 1-6-3 (2026 update)** — No player shall wear any audio (microphone) or video (camera) device during the game.

**Penalty (Rule 1-6-2):** The umpire shall issue a team warning to the coach of the team involved and the next offender(s) of that team will be ejected along with the head coach.

**Permitted device types** (per NFHS guidance): earpieces, electronic bands, smart watches — giving schools several options at varying costs.

### 1.2 Key Constraints for PitchChart

| Constraint | Rule Source | Impact |
|---|---|---|
| **One-way only** — catcher cannot respond electronically | 1-6-2 | Catcher earpiece must be receive-only. No mic needed on earpiece. |
| **Coach must be in dugout** when using the device | 1-6-2, 3-2-5 | App must be operated from the dugout. Not from the stands, bullpen, etc. |
| **Catcher only** — cannot communicate with any other player on defense | 3-2-5 | Only the catcher wears the earpiece. No pitcher earpieces. |
| **No communication while batting** | 3-2-5 | Feature must be disabled or locked when your team is on offense. |
| **Purpose: calling pitches** | 1-6-2 | The stated purpose is pitch calling. "Setting up the defense" is also mentioned in NFHS Points of Emphasis language. |
| **No audio/video recording devices on players** | 1-6-3 | The earpiece cannot have recording capabilities. A basic receive-only Bluetooth earpiece satisfies this. |

### 1.3 Analysis: Pre-Recorded Pitch Calls

**Compliance: CLEAR YES.** Pre-recorded pitch call audio clips played from the coach's device to the catcher's earpiece are fully compliant with NFHS rules. This is functionally identical to PitchCom and commercial products like GoRout Diamond, which are approved at NFHS, NCAA, and MLB levels. The communication is one-way, for the purpose of calling pitches, from the dugout to the catcher.

### 1.4 Analysis: Walkie-Talkie (Live Voice)

**Compliance: STRONG CASE FOR YES — with the right hardware configuration.**

The critical rules question is whether the catcher's earpiece is truly "one-way." This is where Bluetooth protocol choice becomes a rules compliance tool, not just a technical decision.

**A2DP (Advanced Audio Distribution Profile) is physically one-way.** It is a unidirectional audio streaming protocol — the earpiece receives audio only. It cannot transmit audio back to the coach's phone. This is not a software setting that can be toggled; it is a protocol-level limitation. The earpiece microphone (if one exists on the hardware) is completely inoperative in A2DP mode. For the mic to work, the device would need to switch to HSP/HFP (Headset/Hands-Free Profile), which is a separate Bluetooth profile entirely.

**PitchChart will connect to the earpiece exclusively via A2DP and never negotiate HSP/HFP.** This means:
- The catcher physically cannot transmit audio, even if the earpiece has a built-in mic
- The earpiece is provably, demonstrably, architecturally receive-only
- This satisfies NFHS Rule 1-6-2 ("one-way, meaning the player cannot use an electronic device to respond or communicate back to the coach") at the hardware protocol level

**For additional certainty:** Select an earpiece that has no microphone at all. Bluetooth audio receivers (like a $10-15 Bluetooth audio adapter clipped to the helmet with a wired earbud) have no mic hardware whatsoever. This eliminates even the theoretical argument that the device *could* be two-way.

**The live voice question then becomes:** Is a coach speaking into his phone — routed one-way to the catcher's earpiece — within the scope of the rules?

**Arguments FOR compliance:**
- The communication remains strictly one-way — A2DP enforces this at the protocol level
- The NFHS rules do not specify the *format* of the communication — they do not say "signals only" or "no voice"
- The rules permit the device "for the purpose of calling pitches" and "setting up the defense" — a coach saying "Fastball, down and away, watch the runner" is exactly that
- Rule 1-6-3 prohibits players from wearing audio (microphone) or video (camera) devices — an A2DP earpiece has no active microphone, so it satisfies this rule
- Commercial products like GoRout already transmit coach-generated audio to catchers

**Risk factors to be aware of:**
- "Improper Use of Electronic Communication Equipment" was a **2025 Points of Emphasis** — NFHS is watching for misuse
- If a coach uses live voice for purposes beyond pitch calling and defensive setup (motivational talk, arguing calls, commentary), that exceeds the permitted purpose regardless of the delivery method
- An umpire unfamiliar with the technology might question it — be prepared to explain
- UIL in Texas follows NFHS rules. No Texas-specific electronic communication amendments were found in the 2025-2026 UIL rule changes, meaning NFHS rules apply as written

**Risk level by use case:**

| Use Case | Risk | Reasoning |
|---|---|---|
| Pre-recorded pitch calls | **None** | Identical to PitchCom / GoRout. Clearly within rules. |
| Live voice: "Fastball, down and away" | **Very Low** | One-way pitch call. Same content as pre-recorded, just spoken live. A2DP enforces one-way. |
| Live voice: "Fastball away, shift the infield to pull side" | **Low** | Pitch call + defensive setup. Both are explicitly mentioned in NFHS guidance. |
| Live voice: "Let's go, shake it off, stay focused" | **Medium** | Not pitch calling or defensive setup. Exceeds the permitted purpose. Coach discipline required. |
| Continuous open-mic commentary | **Medium-High** | Even though it's one-way, it exceeds "purpose of calling pitches." Don't do this. |

### 1.5 Recommendation

**Walkie-talkie is available at all times** — both games and practice. The app does not gate it behind a mode toggle. The NFHS rules permit one-way electronic communication for pitch calling and defensive setup, and the A2DP protocol guarantees the communication is one-way.

**Coach responsibility:** The app can include a brief reminder in settings that the electronic communication device should be used for calling pitches and setting up the defense per NFHS rules. Content discipline is on the coach, not the app.

**At the plate conference:** Recommend informing the umpire crew that you're using electronic pitch calling. If asked, you can explain: "It's a one-way earpiece for pitch calls — the catcher can hear us but can't talk back. It's the same as PitchCom."

**Earpiece selection for maximum compliance confidence:**

| Option | Mic Status | Compliance Level |
|---|---|---|
| Bluetooth audio receiver + wired earbud (no mic hardware) | **No mic exists** | Bulletproof — physically impossible to be two-way |
| Single-ear Bluetooth earpiece (has mic, but A2DP disables it) | **Mic inactive via A2DP** | Very strong — protocol enforces one-way |
| AirPods / smart earbuds (mic + voice assistant) | **Mic inactive via A2DP, but umpire may question it** | Technically fine, but perception risk |

---

## 2. Feature Spec: Pitch Call System (Game Mode)

### 2.1 Overview

Coach selects pitch type + target zone in PitchChart → app plays a pre-recorded audio cue through the phone's Bluetooth audio output → catcher hears the call through a paired earpiece.

### 2.2 Audio Architecture

**Source:** Pre-recorded audio clips bundled with the app (see Recording Guide for full list).

**File format:** m4a (AAC), mono, 44.1kHz. Each clip ~1.5-2 seconds.

**File naming:** `{pitch_type}_{zone}.m4a` — 104 total clips (6 pitch types × 17 zones + 2 tone clips).

**Playback sequence:**
```
[confirm_tone] → 200ms pause → [pitch_zone clip] → 400ms pause → [pitch_zone clip repeat]
```

**Change call sequence:**
```
[change_tone] → 200ms pause → [pitch_zone clip] → 400ms pause → [pitch_zone clip repeat]
```

**Resend:** Same as standard playback — replays the full sequence.

**Library:** `expo-av` (Audio.Sound API). Load clips on app startup, play from memory for zero-latency playback.

### 2.3 Bluetooth Integration

**Protocol:** Standard A2DP (Advanced Audio Distribution Profile). No custom BLE protocol needed.

**Pairing:** The coach's phone pairs to the catcher's earpiece via iOS/Android system Bluetooth settings — not managed by the app. PitchChart simply routes audio to the default Bluetooth audio output.

### 2.4 Bluetooth Connection Status Dashboard

The coach needs to know at a glance whether the earpiece is live and healthy. PitchChart displays a persistent Bluetooth status bar at the top of the pitch-calling screen with as much detail as the platform provides.

**What we can detect and show:**

| Data Point | iOS | Android | How |
|---|---|---|---|
| **BT audio device connected (yes/no)** | ✅ | ✅ | `AVAudioSession.currentRoute.outputs` (iOS) — check for `BluetoothA2DPOutput` port type. Android `AudioManager.isBluetoothA2dpOn()`. Also `react-native-headphone-detection` or `react-native-bluetooth-headset-detect` libraries detect BT audio connection/disconnection events in real time. |
| **Device name** | ✅ | ✅ | `AVAudioSessionPortDescription.portName` returns the earpiece name (e.g., "Jabra Talk 25"). Android `BluetoothDevice.getName()` via `react-native-bluetooth-status` or native module. |
| **A2DP profile confirmed** | ✅ | ✅ | iOS: port type `BluetoothA2DPOutput` explicitly identifies A2DP. Android: `BluetoothA2dp` profile connection state via broadcast receiver. This confirms the catcher's device is receive-only. |
| **Connection/disconnection events** | ✅ | ✅ | iOS: `AVAudioSession.routeChangeNotification` fires when BT device connects or disconnects. Android: `ACTION_CONNECTION_STATE_CHANGED` broadcast. App can respond instantly — show alert, block Send button. |
| **Earpiece battery level** | ⚠️ Partial | ✅ | iOS: battery level is shown in the iOS status bar and Control Center for connected BT devices, but Apple does not expose a public API for third-party apps to read it programmatically. A BLE secondary connection using `react-native-ble-plx` to read the Battery Service (UUID `0x180F`, characteristic `0x2A19`) *can* work if the earpiece supports BLE alongside A2DP — many modern earpieces do. Android: battery level is available via `BluetoothDevice.EXTRA_BATTERY_LEVEL` broadcast or HFP battery indicators. |
| **Audio route confirmation** | ✅ | ✅ | Before each Send, PitchChart verifies audio is routed to the BT device and not the phone speaker. If no BT output is active, the Send button is disabled with a warning. |
| **Signal strength (RSSI)** | ⚠️ BLE only | ⚠️ BLE only | Only available if the earpiece supports BLE and PitchChart establishes a secondary BLE connection. Not reliable over classic Bluetooth A2DP alone. Low priority — connection/disconnection events are more useful. |

**UI: Bluetooth Status Bar**

The status bar sits at the top of the pitch-calling screen and is always visible:

```
┌──────────────────────────────────────────────┐
│ 🟢 Jabra Talk 25 · A2DP · Battery: 78%      │
│    Connected — Receive Only                   │
└──────────────────────────────────────────────┘
```

**States:**

| State | Indicator | Color | Behavior |
|---|---|---|---|
| **Connected** | 🟢 Device Name · A2DP · Battery % (if available) | Green | Send button enabled. "Receive Only" label reinforces NFHS compliance. |
| **Connected, no battery info** | 🟢 Device Name · A2DP | Green | Same as above, battery field hidden. |
| **Disconnected** | 🔴 Earpiece Disconnected | Red | Send button disabled. Walkie-talkie disabled. Alert pulses to get coach's attention. |
| **Reconnecting** | 🟡 Reconnecting... | Amber | Shown briefly during automatic reconnect attempts. |
| **No BT device paired** | ⚪ No Earpiece Paired — Open Settings | Gray | Links to phone Bluetooth settings. First-time setup flow. |
| **BT off on phone** | 🔴 Bluetooth Off — Enable in Settings | Red | Shown when phone Bluetooth is disabled entirely. |

**Battery level implementation approach:**

For earpieces that support BLE alongside A2DP (most modern devices do), PitchChart can establish a lightweight BLE connection using `react-native-ble-plx` to read the standard Battery Service:

```javascript
// Read battery level from BLE Battery Service
import { BleManager } from 'react-native-ble-plx';

const BATTERY_SERVICE_UUID = '180F';
const BATTERY_LEVEL_CHAR_UUID = '2A19';

// After identifying the earpiece's BLE address
const characteristic = await device.readCharacteristicForService(
  BATTERY_SERVICE_UUID,
  BATTERY_LEVEL_CHAR_UUID
);
const batteryLevel = characteristic.value; // 0-100%
```

This is a secondary BLE connection for monitoring only — it does not affect the primary A2DP audio stream. Not all earpieces expose a BLE Battery Service, so battery level should be treated as an optional "nice to have" that the UI gracefully hides when unavailable.

**Connection loss handling:**

If the earpiece disconnects mid-game:
1. The status bar immediately turns red with "Earpiece Disconnected"
2. The Send and walkie-talkie buttons are disabled
3. A subtle vibration + on-screen alert notifies the coach
4. Pre-recorded pitch calls and live voice are blocked — no point sending audio to nothing
5. The coach falls back to traditional hand signals until reconnected
6. On reconnect, the status bar returns to green and all functions re-enable automatically

### 2.5 Coach-Side UI Flow

**State machine:**
```
IDLE → [select pitch type] → PITCH_SELECTED → [select zone] → READY_TO_SEND
  → [tap Send] → SENDING → SENT
  → [tap Resend] → SENDING → SENT (same call replayed)
  → [tap Change] → READY_TO_SEND (re-select, then send with change tone)
  → [tap result: Strike/Ball/Foul/In Play] → logs result → IDLE (next pitch)
```

**UI components:**
1. **Bluetooth status indicator** — green dot (connected) / red dot (disconnected) with earpiece name
2. **Pitch type selector** — 6 buttons (FB, CB, CH, SL, CT, 2S), configurable per pitcher
3. **Target zone grid** — 3×3 strike zone + 8 waste zones around the perimeter
4. **Send button** — large amber button, 44px+ tap target
5. **Post-send action bar** — Resend | Change | Result buttons (Strike, Ball, Foul, In Play)
6. **Call preview** — shows the audio text that will/was sent ("Fastball, down and away")
7. **Call history** — scrollable list of calls sent this at-bat / this inning

### 2.6 Database Changes

**New columns on `pitches` table:**
```sql
ALTER TABLE pitches ADD COLUMN called_pitch_type VARCHAR(10);
ALTER TABLE pitches ADD COLUMN called_zone VARCHAR(20);
ALTER TABLE pitches ADD COLUMN call_sent_at TIMESTAMP;
ALTER TABLE pitches ADD COLUMN call_changed BOOLEAN DEFAULT false;
```

This captures the *intended* call separately from the *actual* result, enabling call-vs-execution analytics.

**New analytics queries:**
- Call accuracy: % of pitches where actual pitch type/zone matches the call
- Call effectiveness: outcome rates (strike %, whiff %, in-play %) by called pitch + zone
- Pitcher execution: how often does pitcher X hit the called target?
- Sequence patterns: which call sequences lead to outs in 2-strike counts?

### 2.7 API Endpoints

```
POST /api/games/:gameId/pitch-call
  Body: { pitch_type, zone, at_bat_id }
  → Creates pending pitch record with called_pitch_type and called_zone

PUT /api/pitches/:pitchId/result
  Body: { actual_pitch_type, actual_zone, result, call_changed }
  → Logs the actual outcome against the call

GET /api/analytics/call-accuracy/:pitcherId
  → Returns call-vs-execution stats
```

---

## 3. Feature Spec: Walkie-Talkie (Always Available)

### 3.1 Overview

Coach presses and holds a talk button → phone microphone captures voice → audio streams live over Bluetooth A2DP to catcher's earpiece. Release to stop. One-way push-to-talk. Available at all times alongside pre-recorded pitch calls.

### 3.2 NFHS Compliance: Catcher Cannot Talk Back

The catcher's earpiece is connected via **A2DP (Advanced Audio Distribution Profile)**, which is a one-way audio streaming protocol. A2DP does not support microphone input from the receiving device. The earpiece physically cannot transmit audio back to the coach's phone — this is enforced at the Bluetooth protocol level, not by software.

**How PitchChart enforces this:**
- The app connects to the earpiece using A2DP only
- The app never negotiates HSP/HFP (the Bluetooth profile that enables mic input)
- Even if the earpiece has a built-in microphone, it is completely inoperative over A2DP
- For maximum compliance confidence, a Bluetooth audio receiver with no mic hardware can be used

**This means:** The walkie-talkie feature is provably one-way communication from coach to catcher. The catcher has no electronic means of responding. This satisfies NFHS Rule 1-6-2's requirement that "the player cannot use an electronic device to respond or communicate back to the coach."

### 3.3 Audio Architecture

**Input:** Coach's device microphone, captured via `expo-av` Recording API or `react-native-audio-api`.

**Output:** Mixed with pitch call audio into the same Bluetooth A2DP stream. Both the mic stream and pre-recorded clips route through the phone's audio output to the earpiece. The earpiece receives only — A2DP does not open a return audio channel.

**Mixing logic:** If the coach is talking while a pitch call plays, the pitch call takes priority (duck the mic audio or queue it). Pitch calls should never be obscured by live voice.

### 3.4 Push-to-Talk UI

**Interaction:** Press-and-hold button (not a toggle). This prevents accidental open-mic situations.

**Button placement:** Below the pitch zone grid, left of the Send button. Sized at 60×60px minimum.

**Visual feedback:**
- Default: Mic icon, gray, labeled "HOLD TO TALK"
- Active: Pulsing red ring, mic icon turns white, label changes to "TALKING..."
- Audio level meter: Small bar showing mic input level so the coach knows they're being picked up

**Audio indicator on catcher side:** A soft chime plays when the mic opens, so the catcher knows live voice is incoming (distinguishes from pitch calls).

### 3.5 Implementation

```javascript
// Simplified expo-av approach
import { Audio } from 'expo-av';

// On press
const startTalking = async () => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
  });
  // Start recording + playback routing to BT output
};

// On release
const stopTalking = async () => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
  });
};
```

**Note:** True real-time mic-to-Bluetooth-output passthrough may require a native module or `react-native-audio-api` for low-latency audio routing. `expo-av` records to a file — real-time passthrough needs a different approach. This is the most technically challenging part of the feature and should be prototyped early.

### 3.6 Bluetooth Profile Enforcement

PitchChart must ensure the earpiece connection uses A2DP only. This is what makes the catcher's device provably receive-only.

**iOS:** When a Bluetooth audio device is connected, iOS routes audio output via A2DP by default. PitchChart should not request microphone input from the Bluetooth device (which would trigger an HSP/HFP negotiation). The coach's mic input comes from the phone's built-in microphone, not the earpiece.

**Android:** Same principle — A2DP is the default media audio profile. PitchChart routes audio output to the paired Bluetooth device and captures mic input from the phone's local microphone.

**Key implementation rule:** Never call any API that requests audio input from the Bluetooth device. All mic input must be sourced from the phone's hardware microphone. This keeps the earpiece locked to A2DP receive-only.

```javascript
// CORRECT: Use phone mic for input, BT earpiece for output only
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,          // enables phone mic
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  // Audio output routes to BT earpiece via A2DP automatically
  // Mic input stays on phone — earpiece mic never activated
});
```

### 3.7 Use Cases

- **Game day — pitch calling with context:** "Fastball, down and away — watch the runner at second, he's been stealing on off-speed"
- **Game day — defensive setup:** "Shift left, he pulls everything on this count"
- **Game day — quick adjustments:** "He's sitting on the curve, go fastball in"
- **Practice — pitch sequencing instruction:** Coach explains *why* each pitch is being called in real time
- **Practice — catcher development:** Teaching a young catcher how to read hitters, set up pitches, and manage a game
- **Bullpen sessions:** Immediate feedback on location and pitch selection without shouting across the field

---

## 4. Technical Implementation Priorities

### Phase 1: Pre-Recorded Pitch Calls + Bluetooth Foundation
1. Record 104 audio clips (see Recording Guide)
2. Database migration: add call columns to pitches table
3. Audio playback service: load clips, play sequences via `expo-av`
4. UI: pitch type selector, zone grid, send/resend/change/result buttons
5. Bluetooth status dashboard: A2DP connection detection, device name, connect/disconnect events, route verification
6. Send button gating: disable when no BT audio device connected
7. API endpoints for pitch call logging
8. Call history component
9. Optional: BLE secondary connection for earpiece battery level (if device supports Battery Service)

### Phase 2: Walkie-Talkie (Push-to-Talk)
1. Prototype real-time phone-mic-to-Bluetooth-A2DP passthrough (may need native module)
2. Push-to-talk UI component with press-and-hold gesture
3. Audio mixing: pitch calls take priority over live voice
4. Mic open/close chime for catcher awareness
5. Bluetooth profile enforcement: verify A2DP-only connection (catcher cannot transmit)

### Phase 3: Analytics
1. Call-vs-execution accuracy dashboard
2. Sequence effectiveness analysis
3. Per-pitcher call accuracy breakdown
4. Historical call patterns by batter/count/situation

---

## 5. Hardware Recommendations

### Catcher Earpiece

**Option A: Bluetooth Audio Receiver + Wired Earbud (Recommended for max compliance)**

| Feature | Requirement |
|---|---|
| Type | Clip-on Bluetooth audio receiver with 3.5mm output |
| Profile | A2DP sink only — no mic hardware exists on the device |
| Battery | 6+ hours typical |
| Earbud | Any single-ear wired earbud plugged into the receiver |
| Fit | Clip receiver to helmet or jersey collar, earbud under ear flap |
| Price | $10-20 |

This is the most bulletproof option. The device has zero microphone hardware — it is physically impossible for the catcher to transmit. No umpire can argue it's two-way.

**Option B: Single-Ear Bluetooth Earpiece**

| Feature | Requirement |
|---|---|
| Type | Single-ear, in-ear Bluetooth |
| Profile | A2DP (standard audio) — mic is inoperative in A2DP mode |
| Battery | 4+ hours |
| Fit | Low-profile, fits under catcher's helmet ear flap |
| Water resistance | IPX4+ (sweat) |
| Price | $15-30 |

The earpiece may have a built-in mic, but PitchChart connects via A2DP only, which disables the mic at the protocol level. The catcher cannot transmit audio.

**Avoid:** Apple AirPods or high-profile smart earbuds — too bulky, too expensive to risk foul-ball damage, and umpires may question them.

### Coach Device

Standard iPhone or Android running PitchChart. No special hardware needed. Bluetooth must be enabled and paired to catcher's earpiece before the game.

---

## 6. Open Questions

1. **UIL-specific guidance:** Should we contact UIL directly to confirm they haven't issued Texas-specific restrictions beyond NFHS rules?
2. **Multiple catchers:** If the catcher is substituted mid-game, does the earpiece transfer? May need a quick re-pair workflow or a second paired earpiece.
3. **Umpire notification:** Should the coach inform the umpire crew at the plate conference that they're using electronic pitch calling? (Recommended as a courtesy, may become required.)
4. **Pitcher-specific pitch menus:** Different pitchers have different arsenals. Should the pitch type buttons be configurable per pitcher? (Probably yes — a pitcher who doesn't throw a cutter shouldn't see a CT button.)
5. **Auto-advance from offense to defense:** Should the app auto-detect when your team takes the field and prompt to enable pitch calling mode?
