import { Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { AudioManager } from 'react-native-audio-api';
import * as Speech from 'expo-speech';
import { PitchCallAbbrev, PitchCallZone, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { pausePassthrough, resumePassthrough, isPassthroughActive } from './walkieTalkie';

/**
 * Audio routing strategy — A2DP (Advanced Audio Distribution Profile):
 *
 * On iOS, react-native-audio-api's AudioManager is the sole AVAudioSession
 * owner. We configure `.playAndRecord` with `.allowBluetoothA2DP` so iOS
 * prefers A2DP output (media audio) over HFP (phone-call audio). This
 * ensures audio reaches A2DP-only receivers like the YOCOWOCO BT adapter.
 *
 * On Android, expo-av manages the audio session as before.
 *
 * The earpiece is one-way — A2DP is a unidirectional streaming protocol.
 * The catcher's earpiece physically cannot transmit audio back. All mic
 * input comes from the phone's built-in microphone.
 */

let _audioModeActive = false;

/**
 * Activate Bluetooth audio routing for pitch calls.
 * iOS: A2DP via AudioManager. Android: expo-av.
 */
export async function activateBTAudio(): Promise<void> {
    if (_audioModeActive) return;

    if (Platform.OS === 'ios') {
        // AudioManager is the sole AVAudioSession owner on iOS.
        // .playAndRecord enables mic capture; .allowBluetoothA2DP routes
        // output through A2DP instead of HFP; .defaultToSpeaker falls back
        // to the phone speaker when no BT device is connected.
        AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'default',
            iosOptions: ['allowBluetoothA2DP', 'defaultToSpeaker'],
        });
        await AudioManager.setAudioSessionActivity(true);
    } else {
        await Audio.setAudioModeAsync({
            shouldDuckAndroid: false,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: true,
        });
    }

    _audioModeActive = true;
}

/**
 * Deactivate BT audio routing. Skips teardown if walkie-talkie passthrough
 * is still active (it depends on the audio session).
 */
export async function deactivateBTAudio(): Promise<void> {
    if (!_audioModeActive) return;
    // Don't tear down the session while walkie-talkie needs it
    if (isPassthroughActive()) return;

    if (Platform.OS === 'ios') {
        await AudioManager.setAudioSessionActivity(false);
    } else {
        await Audio.setAudioModeAsync({
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            playThroughEarpieceAndroid: false,
        });
    }

    _audioModeActive = false;
}

/**
 * Force-deactivate BT audio routing regardless of walkie-talkie state.
 * Use on screen unmount to ensure full cleanup.
 */
export async function forceDeactivateBTAudio(): Promise<void> {
    if (!_audioModeActive) return;

    if (Platform.OS === 'ios') {
        await AudioManager.setAudioSessionActivity(false);
    } else {
        await Audio.setAudioModeAsync({
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            playThroughEarpieceAndroid: false,
        });
    }

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
