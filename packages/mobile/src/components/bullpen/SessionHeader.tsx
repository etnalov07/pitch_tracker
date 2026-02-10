import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { BullpenIntensity } from '@pitch-tracker/shared';

interface SessionHeaderProps {
    pitcherName: string;
    jerseyNumber?: number;
    totalPitches: number;
    strikes?: number;
    balls?: number;
    intensity: BullpenIntensity;
}

const INTENSITY_COLORS: Record<BullpenIntensity, { bg: string; text: string }> = {
    low: { bg: '#dcfce7', text: '#16a34a' },
    medium: { bg: '#fef9c3', text: '#ca8a04' },
    high: { bg: '#fee2e2', text: '#dc2626' },
};

const SessionHeader: React.FC<SessionHeaderProps> = ({
    pitcherName,
    jerseyNumber,
    totalPitches,
    strikes = 0,
    balls = 0,
    intensity,
}) => {
    const colors = INTENSITY_COLORS[intensity];
    const strikePercentage = totalPitches > 0 ? Math.round((strikes / totalPitches) * 100) : 0;

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <View style={styles.pitcherInfo}>
                    {jerseyNumber != null && <Text style={styles.jerseyNumber}>#{jerseyNumber}</Text>}
                    <Text variant="titleMedium" style={styles.pitcherName}>
                        {pitcherName}
                    </Text>
                </View>
                <Chip
                    compact
                    textStyle={{ fontSize: 11, color: colors.text, fontWeight: '600' }}
                    style={{ backgroundColor: colors.bg }}
                >
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </Chip>
            </View>
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{totalPitches}</Text>
                    <Text style={styles.statLabel}>Pitches</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: '#22c55e' }]}>{strikes}</Text>
                    <Text style={styles.statLabel}>Strikes</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: '#6b7280' }]}>{balls}</Text>
                    <Text style={styles.statLabel}>Balls</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: '#486581' }]}>{strikePercentage}%</Text>
                    <Text style={styles.statLabel}>Strike %</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pitcherInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    jerseyNumber: {
        fontSize: 13,
        fontWeight: '700',
        color: '#486581',
    },
    pitcherName: {
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 10,
        color: '#9ca3af',
        fontWeight: '500',
    },
});

export default SessionHeader;
