import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Speech from 'expo-speech';
import { PitchCallAbbrev, PitchCallZone, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { pausePassthrough, resumePassthrough, isPassthroughActive } from './walkieTalkie';

/**
 * Audio routing strategy — HFP (Hands-Free Profile):
 *
 * We route pitch call audio through the HFP Bluetooth channel. This
 * explicitly sends TTS audio to the paired earpiece rather than the
 * phone speaker. On iOS, `allowsRecordingIOS: true` activates the
 * AVAudioSession `.playAndRecord` category with `.allowBluetooth`,
 * which reliably routes to the BT earpiece.
 *
 * The earpiece is still one-way — HFP routes audio TO the earpiece,
 * and any mic input comes from the phone's built-in microphone, NOT
 * the earpiece. The catcher cannot talk back.
 */

let _audioModeActive = false;

/**
 * Activate Bluetooth audio routing for pitch calls.
 * Routes TTS output through the BT earpiece via HFP.
 */
export async function activateBTAudio(): Promise<void> {
    if (_audioModeActive) return;

    await Audio.setAudioModeAsync({
        // iOS: .playAndRecord + .allowBluetooth → routes to BT earpiece
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        // Android: route through earpiece/BT SCO audio path
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: true,
    });

    _audioModeActive = true;
}

/**
 * Deactivate BT audio routing. Skips teardown if walkie-talkie passthrough
 * is still active (it depends on the HFP session).
 */
export async function deactivateBTAudio(): Promise<void> {
    if (!_audioModeActive) return;
    // Don't tear down the HFP session while walkie-talkie needs it
    if (isPassthroughActive()) return;

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
 * Force-deactivate BT audio routing regardless of walkie-talkie state.
 * Use on screen unmount to ensure full cleanup.
 */
export async function forceDeactivateBTAudio(): Promise<void> {
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
 * Speak a pitch call via TTS over the Bluetooth channel.
 *
 * Format: "[Pitch type], [zone location]... [Pitch type], [zone location]"
 * Change calls get a "Change..." prefix so catcher knows to discard previous.
 *
 * If walkie-talkie is active, pauses mic passthrough while TTS plays
 * (pitch calls take priority over live voice).
 */
export async function speakPitchCall(pitchType: PitchCallAbbrev, zone: PitchCallZone, isChange = false): Promise<void> {
    await activateBTAudio();

    // Duck walkie-talkie if active
    const walkieWasActive = isPassthroughActive();
    if (walkieWasActive) {
        pausePassthrough();
    }

    const pitchLabel = PITCH_CALL_LABELS[pitchType] || pitchType;
    const zoneLabel = PITCH_CALL_ZONE_LABELS[zone] || zone;
    const callPhrase = `${pitchLabel}, ${zoneLabel}`;

    // Double-speak pattern so catcher catches it even in crowd noise
    const prefix = isChange ? 'Change. ' : '';
    const message = `${prefix}${callPhrase}... ${callPhrase}`;

    try {
        await new Promise<void>((resolve, reject) => {
            Speech.speak(message, {
                language: 'en-US',
                rate: 0.9,
                pitch: 1.0,
                onDone: resolve,
                onError: reject,
            });
        });
    } finally {
        // Resume walkie-talkie after pitch call completes
        if (walkieWasActive) {
            resumePassthrough();
        }
    }
}

/** Stop any currently playing speech */
export async function stopSpeech(): Promise<void> {
    await Speech.stop();
}

/** Check if speech is currently in progress */
export async function isSpeaking(): Promise<boolean> {
    return await Speech.isSpeakingAsync();
}

/** Whether BT audio mode is currently active */
export function isAudioActive(): boolean {
    return _audioModeActive;
}

// Aliases for backward compatibility
export const activateHFPAudio = activateBTAudio;
export const deactivateHFPAudio = deactivateBTAudio;
export const activateA2DPAudio = activateBTAudio;
export const deactivateA2DPAudio = deactivateBTAudio;
