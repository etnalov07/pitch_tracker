import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import * as Speech from 'expo-speech';
import { PitchCallAbbrev, PitchCallZone, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { pausePassthrough, resumePassthrough, isPassthroughActive } from './walkieTalkie';

/**
 * Audio routing strategy — A2DP (media audio):
 *
 * PitchChart routes all pitch call audio through the standard A2DP
 * (Advanced Audio Distribution Profile) Bluetooth channel. A2DP is
 * physically one-way — the earpiece receives audio but cannot transmit
 * back. This enforces NFHS Rule 1-6-2 at the protocol level.
 *
 * Key rule: We NEVER request audio input from the Bluetooth device.
 * Mic input always comes from the phone's built-in microphone (for
 * walkie-talkie). This keeps the earpiece locked to A2DP receive-only.
 *
 * On iOS, we use `.playback` category (not `.playAndRecord`) for pitch
 * calls alone. The walkie-talkie module separately configures
 * `.playAndRecord` with `allowBluetoothA2DP` when the coach holds the
 * talk button — even then, the earpiece stays on A2DP.
 */

let _audioModeActive = false;

/**
 * Activate A2DP audio routing for pitch calls. Routes TTS output
 * through the default Bluetooth audio output (A2DP).
 */
export async function activateA2DPAudio(): Promise<void> {
    if (_audioModeActive) return;

    await Audio.setAudioModeAsync({
        // iOS: .playback category routes to A2DP by default.
        // allowsRecordingIOS: false keeps us on A2DP (not HFP).
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        // Android: media route goes to A2DP when BT connected
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
    });

    _audioModeActive = true;
}

/**
 * Deactivate audio routing. Call when leaving the pitch calling screen.
 */
export async function deactivateA2DPAudio(): Promise<void> {
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
 * Speak a pitch call via TTS over the A2DP Bluetooth channel.
 *
 * Format: "[Pitch type], [zone location]... [Pitch type], [zone location]"
 * Change calls get a "Change..." prefix so catcher knows to discard previous.
 *
 * If walkie-talkie is active, pauses mic passthrough while TTS plays
 * (pitch calls take priority over live voice per spec).
 */
export async function speakPitchCall(pitchType: PitchCallAbbrev, zone: PitchCallZone, isChange = false): Promise<void> {
    await activateA2DPAudio();

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

/** Whether A2DP audio mode is currently active */
export function isAudioActive(): boolean {
    return _audioModeActive;
}

// Legacy aliases for backward compatibility
export const activateHFPAudio = activateA2DPAudio;
export const deactivateHFPAudio = deactivateA2DPAudio;
