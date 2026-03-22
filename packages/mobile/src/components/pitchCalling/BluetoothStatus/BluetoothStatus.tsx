import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Linking, Animated } from 'react-native';
import * as Haptics from '../../../utils/haptics';

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'unpaired';

interface BluetoothStatusProps {
    /** Whether a BT audio device is connected */
    connected: boolean;
    /** Name of the connected device (null if unknown or disconnected) */
    deviceName: string | null;
    /** Whether the initial detection check is still in progress */
    isChecking?: boolean;
    /** Callback to test audio routing via TTS */
    onTestAudio?: () => Promise<void>;
}

const BluetoothStatus: React.FC<BluetoothStatusProps> = ({ connected, deviceName, isChecking, onTestAudio }) => {
    const [testing, setTesting] = useState(false);
    const [prevConnected, setPrevConnected] = useState(connected);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Determine connection state
    const state: ConnectionState = isChecking ? 'reconnecting' : connected ? 'connected' : 'disconnected';

    const stateConfig = {
        connected: { color: '#22C55E', label: deviceName || 'Earpiece Connected', sublabel: 'Receive Only' },
        disconnected: { color: '#EF4444', label: 'Earpiece Disconnected', sublabel: null },
        reconnecting: { color: '#F5A623', label: 'Checking...', sublabel: null },
        unpaired: { color: '#6B7280', label: 'No Earpiece Paired', sublabel: null },
    };

    const config = stateConfig[state];

    // Alert on disconnection
    useEffect(() => {
        if (prevConnected && !connected && !isChecking) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        setPrevConnected(connected);
    }, [connected, isChecking]);

    // Pulse animation for disconnected state
    useEffect(() => {
        if (state === 'disconnected') {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [state, pulseAnim]);

    const handleTest = async () => {
        if (!onTestAudio || testing) return;
        setTesting(true);
        try {
            await onTestAudio();
        } finally {
            setTesting(false);
        }
    };

    const handleOpenSettings = () => {
        Linking.openSettings();
    };

    return (
        <View style={[styles.container, { borderColor: config.color + '40' }]}>
            <View style={styles.topRow}>
                <View style={styles.left}>
                    <Animated.View style={[styles.dot, { backgroundColor: config.color, opacity: pulseAnim }]} />
                    <View style={styles.labelCol}>
                        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                        {config.sublabel && <Text style={styles.sublabelText}>{config.sublabel}</Text>}
                    </View>
                </View>
                <View style={styles.right}>
                    {connected && onTestAudio && (
                        <Pressable
                            style={[styles.testButton, testing && styles.testButtonActive]}
                            onPress={handleTest}
                            disabled={testing}
                        >
                            <Text style={[styles.testText, testing && styles.testTextActive]}>
                                {testing ? 'TESTING...' : 'TEST'}
                            </Text>
                        </Pressable>
                    )}
                </View>
            </View>
            {state === 'disconnected' && (
                <Pressable onPress={handleOpenSettings}>
                    <Text style={styles.settingsLink}>Open Bluetooth Settings</Text>
                </Pressable>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#132240',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    labelCol: {
        gap: 1,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    sublabelText: {
        fontSize: 10,
        fontWeight: '500',
        color: '#5A6278',
    },
    testButton: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#2A3A55',
    },
    testButtonActive: {
        borderColor: '#F5A623',
        backgroundColor: '#F5A62315',
    },
    testText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8B93A8',
        letterSpacing: 0.5,
    },
    testTextActive: {
        color: '#F5A623',
    },
    settingsLink: {
        fontSize: 11,
        fontWeight: '600',
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 20,
        textDecorationLine: 'underline',
    },
});

export default BluetoothStatus;
