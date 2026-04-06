import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SuggestedPitch } from '@pitch-tracker/shared';

interface SuggestedSequenceProps {
    sequence: SuggestedPitch[];
}

const PITCH_COLORS: Record<string, string> = {
    fastball: '#1d4ed8',
    '4-seam': '#1d4ed8',
    '2-seam': '#2563eb',
    sinker: '#3b82f6',
    cutter: '#60a5fa',
    slider: '#16a34a',
    curveball: '#15803d',
    changeup: '#d97706',
    splitter: '#b45309',
    knuckleball: '#6b7280',
    screwball: '#6b7280',
    other: '#9ca3af',
};

const SuggestedSequence: React.FC<SuggestedSequenceProps> = ({ sequence }) => {
    if (sequence.length === 0) {
        return <Text style={styles.empty}>Insufficient data</Text>;
    }
    return (
        <View style={styles.container}>
            {sequence.map((pitch, i) => {
                const color = PITCH_COLORS[pitch.pitch_type] || '#6b7280';
                return (
                    <View key={i} style={[styles.row, { borderLeftColor: color }]}>
                        <View style={[styles.badge, { backgroundColor: color }]}>
                            <Text style={styles.badgeNum}>{i + 1}</Text>
                        </View>
                        <View style={styles.info}>
                            <View style={styles.topRow}>
                                <Text style={[styles.pitchType, { color }]}>{pitch.pitch_type}</Text>
                                <Text style={styles.zone}>{pitch.zone_label}</Text>
                            </View>
                            <Text style={styles.rationale}>{pitch.rationale}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { gap: 6 },
    empty: { color: '#9ca3af', fontSize: 13, paddingVertical: 8 },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        padding: 8,
        backgroundColor: '#f9fafb',
        borderRadius: 6,
        borderLeftWidth: 3,
    },
    badge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeNum: { color: 'white', fontSize: 11, fontWeight: '700' },
    info: { flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    pitchType: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
    zone: {
        fontSize: 11,
        color: '#6b7280',
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    rationale: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});

export default SuggestedSequence;
