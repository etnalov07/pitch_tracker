import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Speech from 'expo-speech';
import { PitchCallAbbrev, PitchCallZone, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';

/**
 * Audio isolation strategy:
 *
 * We route pitch call audio through the HFP (Hands-Free Profile) Bluetooth
 * channel instead of A2DP (media). This means:
 *
 *   - Pitch calls → HFP → earpiece hears them
 *   - Notifications, music, etc. → A2DP media channel → phone speaker
 *
 * On iOS, setting `allowsRecordingIOS: true` activates the AVAudioSession
 * `.playAndRecord` category with `.allowBluetooth`, which routes to HFP.
 *
 * On Android, `playThroughEarpieceAndroid: true` routes through the call
 * audio path (BT SCO when a headset is connected).
 *
 * Audio quality is 8kHz mono (phone-call quality) — more than adequate for
 * short spoken commands like "Fastball, down and away".
 */

let _audioModeActive = false;

/**
 * Activate HFP audio routing. Call before the first pitch call in a session.
 * Safe to call multiple times — skips if already active.
 */
export async function activateHFPAudio(): Promise<void> {
    if (_audioModeActive) return;

    await Audio.setAudioModeAsync({
        // iOS: activates .playAndRecord + .allowBluetooth → routes to HFP
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        // Android: route through call/earpiece audio path (BT SCO)
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: true,
    });

    _audioModeActive = true;
}

/**
 * Deactivate HFP audio routing. Call when leaving the pitch calling screen
 * so normal audio behavior resumes.
 */
export async function deactivateHFPAudio(): Promise<void> {
    if (!_audioModeActive) return;

    await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
    });

    _audioModeActive = false;
}

/**
 * Speak a pitch call via TTS over the HFP Bluetooth channel.
 * Activates HFP routing if not already active.
 *
 * Format: "[Pitch type], [zone location]... [Pitch type], [zone location]"
 * Change calls get a "Change..." prefix so catcher knows to discard previous.
 */
export async function speakPitchCall(pitchType: PitchCallAbbrev, zone: PitchCallZone, isChange = false): Promise<void> {
    // Ensure HFP routing is active before speaking
    await activateHFPAudio();

    const pitchLabel = PITCH_CALL_LABELS[pitchType] || pitchType;
    const zoneLabel = PITCH_CALL_ZONE_LABELS[zone] || zone;
    const callPhrase = `${pitchLabel}, ${zoneLabel}`;

    // Double-speak pattern so catcher catches it even in crowd noise
    const prefix = isChange ? 'Change. ' : '';
    const message = `${prefix}${callPhrase}... ${callPhrase}`;

    return new Promise<void>((resolve, reject) => {
        Speech.speak(message, {
            language: 'en-US',
            rate: 0.9,
            pitch: 1.0,
            onDone: resolve,
            onError: reject,
        });
    });
}

/** Stop any currently playing speech */
export async function stopSpeech(): Promise<void> {
    await Speech.stop();
}

/** Check if speech is currently in progress */
export async function isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
}

/** Whether HFP audio mode is currently active */
export function isHFPActive(): boolean {
    return _audioModeActive;
}
