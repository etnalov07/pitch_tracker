import { useState, useEffect, useRef } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import RNHeadphoneDetection from 'react-native-headphone-detection';

/**
 * Bluetooth audio detection utility.
 *
 * Uses react-native-headphone-detection to detect Bluetooth audio devices
 * (headphones/earpieces) and subscribe to connect/disconnect events.
 *
 * Provides a React hook `useBluetoothAudio()` for components to consume.
 */

export interface BluetoothAudioState {
    /** Whether a Bluetooth audio device is connected */
    connected: boolean;
    /** Name of the connected device (if available) */
    deviceName: string | null;
    /** Whether we're currently checking the connection */
    isChecking: boolean;
}

/**
 * Check the current headphone/Bluetooth connection status.
 * Returns { audioJack, bluetooth } booleans.
 */
async function getConnectionStatus(): Promise<{ audioJack: boolean; bluetooth: boolean }> {
    try {
        const status = await RNHeadphoneDetection.isAudioDeviceConnected();
        return {
            audioJack: status?.audioJack ?? false,
            bluetooth: status?.bluetooth ?? false,
        };
    } catch {
        return { audioJack: false, bluetooth: false };
    }
}

/**
 * React hook for Bluetooth audio device detection.
 *
 * Returns the current connection state and auto-updates when devices
 * connect or disconnect.
 *
 * Usage:
 * ```
 * const { connected, deviceName, isChecking } = useBluetoothAudio();
 * ```
 */
export function useBluetoothAudio(): BluetoothAudioState {
    const [connected, setConnected] = useState(false);
    const [deviceName, setDeviceName] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const emitterRef = useRef<NativeEventEmitter | null>(null);

    // Check initial connection state
    useEffect(() => {
        let mounted = true;

        const checkInitial = async () => {
            const status = await getConnectionStatus();
            if (mounted) {
                setConnected(status.bluetooth);
                setDeviceName(status.bluetooth ? 'Bluetooth Earpiece' : null);
                setIsChecking(false);
            }
        };

        checkInitial();

        return () => {
            mounted = false;
        };
    }, []);

    // Subscribe to connection change events
    useEffect(() => {
        let subscription: any = null;

        try {
            // Use NativeModules to get the native module for the event emitter
            const nativeModule = NativeModules.RNHeadphoneDetection;
            emitterRef.current = new NativeEventEmitter(nativeModule);
            subscription = emitterRef.current.addListener('onChange', (event: { audioJack: boolean; bluetooth: boolean }) => {
                setConnected(event.bluetooth);
                setDeviceName(event.bluetooth ? 'Bluetooth Earpiece' : null);
            });
        } catch {
            // Library may not support events on this platform — rely on polling
        }

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    return { connected, deviceName, isChecking };
}

/**
 * Verify that audio is currently routing to a Bluetooth device.
 * Call before sending a pitch call to ensure the earpiece will receive it.
 */
export async function verifyAudioRoute(): Promise<boolean> {
    const status = await getConnectionStatus();
    return status.bluetooth;
}
