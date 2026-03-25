import { AudioContext, AudioBuffer, AudioRecorder, AudioManager } from 'react-native-audio-api';

/**
 * Walkie-Talkie: real-time phone-mic-to-Bluetooth HFP passthrough.
 *
 * Uses react-native-audio-api (Web Audio API for RN) to connect the phone's
 * built-in microphone to the Bluetooth audio output via HFP.
 *
 * Audio path:  Phone mic → AudioRecorder → RecorderAdapterNode → AudioContext.destination → BT earpiece (HFP)
 *
 * NFHS compliance: The earpiece is receive-only. HFP routes audio TO the
 * earpiece; all mic input comes from the phone's built-in microphone, never
 * from the earpiece. The catcher cannot talk back.
 *
 * Audio session strategy: expo-av owns the iOS AVAudioSession (configured for
 * HFP via `allowsRecordingIOS: true`). We call `disableSessionManagement()`
 * so react-native-audio-api does not touch the session, avoiding conflicts
 * between the two audio systems.
 */

// Prevent react-native-audio-api from managing its own AVAudioSession.
// expo-av is the sole session owner (HFP routing via activateBTAudio).
AudioManager.disableSessionManagement();

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
 * Relies on expo-av's HFP audio session (activated via `activateBTAudio`).
 * The phone's built-in microphone is captured by AudioRecorder and routed
 * through the Web Audio graph to the BT earpiece. The earpiece stays
 * receive-only — its mic is never activated.
 */
export async function startPassthrough(): Promise<void> {
    if (_isActive) return;

    // Request mic permissions
    const status = await AudioManager.requestRecordingPermissions();
    if (status !== 'Granted') {
        throw new Error('Microphone permission denied');
    }

    // Ensure HFP audio session is active (expo-av owns the session).
    // Lazy import to avoid circular dependency (pitchCallAudio imports from walkieTalkie).
    const { activateBTAudio } = await import('./pitchCallAudio');
    await activateBTAudio();

    // Create audio context and recorder
    audioContext = new AudioContext({ sampleRate: 44100 });
    audioRecorder = new AudioRecorder();

    // Create adapter node to bridge recorder into the audio graph
    const adapter = audioContext.createRecorderAdapter();

    // Connect: phone mic → adapter → destination (BT earpiece via HFP)
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
