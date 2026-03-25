import { AudioContext, AudioBuffer, AudioRecorder, AudioManager } from 'react-native-audio-api';
import { Platform } from 'react-native';

/**
 * Walkie-Talkie: real-time phone-mic-to-Bluetooth A2DP passthrough.
 *
 * Uses react-native-audio-api (Web Audio API for RN) to connect the phone's
 * built-in microphone to the Bluetooth audio output via A2DP.
 *
 * Audio path:  Phone mic → AudioRecorder → RecorderAdapterNode → AudioContext.destination → BT earpiece (A2DP)
 *
 * NFHS compliance: The catcher's earpiece is connected via A2DP, which is
 * physically one-way. The earpiece cannot transmit audio back. All mic input
 * comes from the phone's built-in microphone, never from the earpiece.
 *
 * On iOS, we use `allowBluetoothA2DP` (NOT `allowBluetoothHFP`) to keep the
 * earpiece on A2DP even during playAndRecord mode. This ensures the earpiece's
 * microphone (if it has one) remains completely inoperative.
 */

let audioContext: AudioContext | null = null;
let audioRecorder: AudioRecorder | null = null;
let _isActive = false;
let _inputLevel = 0;

/**
 * Play a short chime tone so the catcher knows voice is incoming (open)
 * or has stopped (close). Uses OscillatorNode for zero-dependency tones.
 */
async function playChime(ctx: AudioContext, frequency: number, duration: number): Promise<void> {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.start(now);
    // Quick fade out to avoid click
    gain.gain.setValueAtTime(0.3, now + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    osc.stop(now + duration);

    return new Promise((resolve) => setTimeout(resolve, duration * 1000));
}

/**
 * Start real-time mic → Bluetooth earpiece passthrough.
 *
 * The audio session is configured for playAndRecord + allowBluetoothA2DP.
 * This routes audio output through A2DP (media stream) while capturing
 * mic input from the phone's built-in microphone. The earpiece stays
 * receive-only — its mic is never activated.
 */
export async function startPassthrough(): Promise<void> {
    if (_isActive) return;

    // Request mic permissions
    const status = await AudioManager.requestRecordingPermissions();
    if (status !== 'Granted') {
        throw new Error('Microphone permission denied');
    }

    // Configure audio session for A2DP output + phone mic input
    if (Platform.OS === 'ios') {
        AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'voiceChat',
            // allowBluetoothA2DP: keeps earpiece on A2DP (receive-only)
            // defaultToSpeaker: fallback if no BT connected
            // NOTE: we deliberately do NOT include allowBluetoothHFP — this
            // prevents iOS from negotiating HFP and activating the earpiece mic.
            iosOptions: ['allowBluetoothA2DP', 'defaultToSpeaker'],
        });
    }

    await AudioManager.setAudioSessionActivity(true);

    // Create audio context and recorder
    audioContext = new AudioContext({ sampleRate: 44100 });
    audioRecorder = new AudioRecorder();

    // Create adapter node to bridge recorder into the audio graph
    const adapter = audioContext.createRecorderAdapter();

    // Connect: phone mic → adapter → destination (BT earpiece via A2DP)
    audioRecorder.connect(adapter);
    adapter.connect(audioContext.destination);

    // Track input levels for the UI meter
    audioRecorder.onAudioReady({ sampleRate: 44100, bufferLength: 1024, channelCount: 1 }, (event: { buffer: AudioBuffer }) => {
        const data = event.buffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += Math.abs(data[i]);
        }
        _inputLevel = sum / data.length;
    });

    // Start recording (passthrough)
    audioRecorder.start();
    _isActive = true;

    // Play open chime so catcher knows voice is incoming (ascending tone)
    await playChime(audioContext, 880, 0.12);
}

/**
 * Stop mic passthrough and clean up audio resources.
 */
export async function stopPassthrough(): Promise<void> {
    if (!_isActive) return;

    try {
        // Play close chime before tearing down (descending tone)
        if (audioContext) {
            await playChime(audioContext, 440, 0.12);
        }

        if (audioRecorder) {
            audioRecorder.stop();
            audioRecorder = null;
        }
        if (audioContext) {
            await audioContext.close();
            audioContext = null;
        }
    } finally {
        _isActive = false;
        _inputLevel = 0;
    }
}

/**
 * Get the current mic input level (0-1 range, amplified for visual display).
 * Used for the audio level meter in the push-to-talk UI.
 */
export function getInputLevel(): number {
    return Math.min(_inputLevel * 5, 1);
}

/** Whether walkie-talkie passthrough is currently active. */
export function isPassthroughActive(): boolean {
    return _isActive;
}

/**
 * Temporarily pause passthrough (e.g., when a TTS pitch call plays).
 * Pitch calls take priority over live voice per spec.
 */
export function pausePassthrough(): void {
    if (!_isActive || !audioRecorder) return;
    audioRecorder.pause();
}

/**
 * Resume passthrough after a pause.
 */
export function resumePassthrough(): void {
    if (!_isActive || !audioRecorder) return;
    audioRecorder.resume();
}
