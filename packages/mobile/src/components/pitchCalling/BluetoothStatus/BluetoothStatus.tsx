import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { IconButton } from 'react-native-paper';

interface BluetoothStatusProps {
    connected: boolean;
    hfpActive: boolean;
    onToggle?: () => void;
    onTestAudio?: () => Promise<void>;
}

const BluetoothStatus: React.FC<BluetoothStatusProps> = ({ connected, hfpActive, onToggle, onTestAudio }) => {
    const [testing, setTesting] = useState(false);
    const statusColor = connected ? '#22C55E' : '#EF4444';

    const handleTest = async () => {
        if (!onTestAudio || testing) return;
        setTesting(true);
        try {
            await onTestAudio();
        } finally {
            setTesting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={styles.left}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {connected ? 'Earpiece Connected' : 'Earpiece Disconnected'}
                    </Text>
                </View>
                <View style={styles.right}>
                    {onTestAudio && (
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
                    {onToggle && (
                        <IconButton
                            icon={connected ? 'bluetooth' : 'bluetooth-off'}
                            size={18}
                            iconColor={statusColor}
                            onPress={onToggle}
                        />
                    )}
                </View>
            </View>
            {hfpActive && <Text style={styles.hfpText}>HFP audio active — only pitch calls reach earpiece</Text>}
            {!connected && <Text style={styles.hintText}>Pair earpiece via Settings &gt; Bluetooth, then toggle on</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#132240',
        borderRadius: 8,
        paddingLeft: 14,
        paddingRight: 4,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#2A3A55',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
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
    hfpText: {
        fontSize: 10,
        color: '#5A6278',
        marginTop: 2,
        marginLeft: 16,
    },
    hintText: {
        fontSize: 10,
        color: '#EF444480',
        marginTop: 2,
        marginLeft: 16,
    },
});

export default BluetoothStatus;
