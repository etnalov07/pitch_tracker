import * as Speech from 'expo-speech';
import { PitchCallAbbrev, PitchCallZone, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';

/**
 * Speak a pitch call via the device's text-to-speech engine.
 * Audio routes through standard A2DP to a connected Bluetooth earpiece.
 *
 * Format: "[Pitch type], [zone location]... [Pitch type], [zone location]"
 * Change calls get a "Change..." prefix.
 */
export async function speakPitchCall(pitchType: PitchCallAbbrev, zone: PitchCallZone, isChange = false): Promise<void> {
    const pitchLabel = PITCH_CALL_LABELS[pitchType] || pitchType;
    const zoneLabel = PITCH_CALL_ZONE_LABELS[zone] || zone;
    const callPhrase = `${pitchLabel}, ${zoneLabel}`;

    // Double-speak pattern so catcher catches it even in crowd noise
    const prefix = isChange ? 'Change. ' : '';
    const message = `${prefix}${callPhrase}... ${callPhrase}`;

    await Speech.speak(message, {
        language: 'en-US',
        rate: 0.9,
        pitch: 1.0,
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
