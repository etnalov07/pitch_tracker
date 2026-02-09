import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, useTheme } from 'react-native-paper';
import { Pitch, PitchType, Player } from '@pitch-tracker/shared';

interface PitcherStatsProps {
    pitcher?: Player | null;
    pitches: Pitch[];
    compact?: boolean;
}

const PITCH_TYPE_LABELS: Record<PitchType, string> = {
    fastball: 'Fastball',
    '4-seam': '4-Seam',
    '2-seam': '2-Seam',
    cutter: 'Cutter',
    sinker: 'Sinker',
    slider: 'Slider',
    curveball: 'Curveball',
    changeup: 'Changeup',
    splitter: 'Splitter',
    knuckleball: 'Knuckleball',
    screwball: 'Screwball',
    other: 'Other',
};

const PitcherStats: React.FC<PitcherStatsProps> = ({ pitcher, pitches, compact = false }) => {
    const theme = useTheme();

    const totalPitches = pitches.length;

    // Calculate strikes and balls
    const strikes = pitches.filter(
        (p) =>
            p.pitch_result === 'called_strike' ||
            p.pitch_result === 'swinging_strike' ||
            p.pitch_result === 'foul' ||
            p.pitch_result === 'in_play'
    ).length;
    const balls = pitches.filter((p) => p.pitch_result === 'ball').length;

    const strikePercentage = totalPitches > 0 ? strikes / totalPitches : 0;

    // Group by pitch type
    const pitchTypeBreakdown = pitches.reduce(
        (acc, p) => {
            const type = p.pitch_type;
            if (!acc[type]) {
                acc[type] = { total: 0, strikes: 0 };
            }
            acc[type].total++;
            if (
                p.pitch_result === 'called_strike' ||
                p.pitch_result === 'swinging_strike' ||
                p.pitch_result === 'foul' ||
                p.pitch_result === 'in_play'
            ) {
                acc[type].strikes++;
            }
            return acc;
        },
        {} as Record<string, { total: number; strikes: number }>
    );

    const pitchTypes = Object.entries(pitchTypeBreakdown)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, compact ? 3 : 5);

    if (compact) {
        return (
            <View style={styles.compactContainer}>
                <View style={styles.compactRow}>
                    <View style={styles.compactStat}>
                        <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                            {totalPitches}
                        </Text>
                        <Text variant="labelSmall">Pitches</Text>
                    </View>
                    <View style={styles.compactStat}>
                        <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
                            {Math.round(strikePercentage * 100)}%
                        </Text>
                        <Text variant="labelSmall">Strikes</Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <Card style={styles.container}>
            <Card.Content>
                <Text variant="titleMedium" style={styles.title}>
                    {pitcher ? `${pitcher.first_name} ${pitcher.last_name}` : 'Pitcher Stats'}
                </Text>

                {/* Overview Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                            {totalPitches}
                        </Text>
                        <Text variant="labelMedium">Total</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text variant="headlineMedium" style={{ color: '#10b981' }}>
                            {strikes}
                        </Text>
                        <Text variant="labelMedium">Strikes</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text variant="headlineMedium" style={{ color: '#ef4444' }}>
                            {balls}
                        </Text>
                        <Text variant="labelMedium">Balls</Text>
                    </View>
                </View>

                {/* Strike Percentage Bar */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text variant="labelMedium">Strike %</Text>
                        <Text variant="labelMedium">{Math.round(strikePercentage * 100)}%</Text>
                    </View>
                    <ProgressBar
                        progress={strikePercentage}
                        color={strikePercentage >= 0.6 ? '#10b981' : strikePercentage >= 0.5 ? '#f59e0b' : '#ef4444'}
                        style={styles.progressBar}
                    />
                </View>

                {/* Pitch Type Breakdown */}
                {pitchTypes.length > 0 && (
                    <View style={styles.breakdownSection}>
                        <Text variant="labelMedium" style={styles.breakdownTitle}>
                            Pitch Mix
                        </Text>
                        {pitchTypes.map(([type, data]) => (
                            <View key={type} style={styles.pitchTypeRow}>
                                <Text variant="bodyMedium" style={styles.pitchTypeName}>
                                    {PITCH_TYPE_LABELS[type as PitchType] || type}
                                </Text>
                                <View style={styles.pitchTypeStats}>
                                    <Text variant="bodyMedium">{data.total}</Text>
                                    <Text variant="bodySmall" style={styles.pitchTypePercentage}>
                                        ({Math.round((data.strikes / data.total) * 100)}% K)
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#ffffff',
    },
    compactContainer: {
        padding: 8,
    },
    compactRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    compactStat: {
        alignItems: 'center',
    },
    title: {
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    progressSection: {
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
    },
    breakdownSection: {
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 16,
    },
    breakdownTitle: {
        marginBottom: 12,
        color: '#6b7280',
    },
    pitchTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    pitchTypeName: {
        flex: 1,
    },
    pitchTypeStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pitchTypePercentage: {
        color: '#6b7280',
    },
});

export default PitcherStats;
