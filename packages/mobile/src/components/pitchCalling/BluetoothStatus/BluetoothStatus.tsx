import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { IconButton } from 'react-native-paper';

interface BluetoothStatusProps {
    connected: boolean;
    onToggle?: () => void;
}

const BluetoothStatus: React.FC<BluetoothStatusProps> = ({ connected, onToggle }) => {
    const statusColor = connected ? '#22C55E' : '#EF4444';

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={[styles.text, { color: statusColor }]}>
                    {connected ? 'Earpiece Connected' : 'Earpiece Disconnected'}
                </Text>
            </View>
            {onToggle && (
                <IconButton icon={connected ? 'bluetooth' : 'bluetooth-off'} size={18} iconColor={statusColor} onPress={onToggle} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#132240',
        borderRadius: 8,
        paddingLeft: 14,
        paddingRight: 4,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#2A3A55',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default BluetoothStatus;
