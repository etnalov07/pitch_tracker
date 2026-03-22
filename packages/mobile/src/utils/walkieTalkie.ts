import { AudioContext, AudioBuffer, AudioRecorder, AudioManager } from 'react-native-audio-api';
import { Platform } from 'react-native';

/**
 * Walkie-Talkie: real-time phone-mic-to-Bluetooth passthrough.
 *
 * Uses react-native-audio-api (Web Audio API for RN) to connect the phone's
 * built-in microphone to the Bluetooth audio output via HFP. The earpiece
 * receives the coach's live voice in real time.
 *
 * Audio path:  Phone mic → AudioRecorder → RecorderAdapterNode → AudioContext.destination → BT earpiece
 *
 * The catcher's earpiece is connected via HFP (Hands-Free Profile), which is
 * one-way: the earpiece receives audio from the phone but cannot transmit back.
 * The phone mic is the phone's own microphone, not the earpiece's.
 */

let audioContext: AudioContext | null = null;
let audioRecorder: AudioRecorder | null = null;
let _isActive = false;
let _inputLevel = 0;

/**
 * Start real-time mic → Bluetooth earpiece passthrough.
 * The audio session is configured for playAndRecord + allowBluetoothHFP
 * so audio routes through the earpiece while mic input comes from the phone.
 */
export async function startPassthrough(): Promise<void> {
    if (_isActive) return;

    // Request mic permissions
    const status = await AudioManager.requestRecordingPermissions();
    if (status !== 'Granted') {
        throw new Error('Microphone permission denied');
    }

    // Configure audio session for HFP routing
    if (Platform.OS === 'ios') {
        AudioManager.setAudioSessionOptions({
            iosCategory: 'playAndRecord',
            iosMode: 'voiceChat',
            iosOptions: ['allowBluetoothA2DP', 'allowBluetoothHFP', 'defaultToSpeaker'],
        });
    }

    await AudioManager.setAudioSessionActivity(true);

    // Create audio context and recorder
    audioContext = new AudioContext({ sampleRate: 44100 });
    audioRecorder = new AudioRecorder();

    // Create adapter node to bridge recorder into the audio graph
    const adapter = audioContext.createRecorderAdapter();

    // Connect: recorder → adapter → destination (BT earpiece)
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
}

/**
 * Stop mic passthrough and clean up audio resources.
 */
export async function stopPassthrough(): Promise<void> {
    if (!_isActive) return;

    try {
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
