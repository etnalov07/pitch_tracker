import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RadarStatus } from '../../../utils/stalkerRadar/stalkerRadarService';

interface Props {
    status: RadarStatus;
    lastVelocity: number | null;
}

const STATUS_COLOR: Record<RadarStatus, string> = {
    idle: '#9ca3af',
    scanning: '#f59e0b',
    connecting: '#f59e0b',
    connected: '#10b981',
    disconnected: '#ef4444',
    error: '#ef4444',
};

const STATUS_TEXT: Record<RadarStatus, string> = {
    idle: 'Radar off',
    scanning: 'Radar…',
    connecting: 'Radar…',
    connected: 'Radar',
    disconnected: 'No radar',
    error: 'Radar error',
};

/** Compact, read-only connection indicator shown beside the velocity field. */
const RadarStatusPill: React.FC<Props> = ({ status, lastVelocity }) => {
    const color = STATUS_COLOR[status];
    const label = status === 'connected' && lastVelocity != null ? `Radar ${lastVelocity}` : STATUS_TEXT[status];
    return (
        <View style={[styles.pill, { borderColor: color }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.text, { color }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default RadarStatusPill;
