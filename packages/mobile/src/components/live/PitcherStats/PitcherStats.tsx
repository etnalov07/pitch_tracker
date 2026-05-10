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

const STRIKE_RESULTS = new Set(['called_strike', 'swinging_strike', 'foul', 'in_play']);

interface PitchTypeAggregate {
    total: number;
    strikes: number;
    balls: number;
    velocities: number[];
}

const PitcherStats: React.FC<PitcherStatsProps> = ({ pitcher, pitches, compact = false }) => {
    const theme = useTheme();

    const totalPitches = pitches.length;

    const strikes = pitches.filter((p) => STRIKE_RESULTS.has(p.pitch_result)).length;
    const balls = pitches.filter((p) => p.pitch_result === 'ball').length;

    const strikePercentage = totalPitches > 0 ? strikes / totalPitches : 0;

    const pitchTypeBreakdown = pitches.reduce<Record<string, PitchTypeAggregate>>((acc, p) => {
        const type = p.pitch_type;
        if (!acc[type]) {
            acc[type] = { total: 0, strikes: 0, balls: 0, velocities: [] };
        }
        acc[type].total += 1;
        if (STRIKE_RESULTS.has(p.pitch_result)) acc[type].strikes += 1;
        if (p.pitch_result === 'ball') acc[type].balls += 1;
        if (typeof p.velocity === 'number' && p.velocity > 0) acc[type].velocities.push(p.velocity);
        return acc;
    }, {});

    const pitchTypes = Object.entries(pitchTypeBreakdown)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, compact ? 3 : undefined);

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

                {pitchTypes.length > 0 && (
                    <View style={styles.breakdownSection}>
                        <Text variant="labelMedium" style={styles.breakdownTitle}>
                            By Pitch Type
                        </Text>
                        <View style={styles.tableHeader}>
                            <Text variant="labelSmall" style={[styles.cellType, styles.headerText]}>
                                Type
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                #
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                Ball
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                Strike
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                %
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                Top
                            </Text>
                            <Text variant="labelSmall" style={[styles.cellNum, styles.headerText]}>
                                Avg
                            </Text>
                        </View>
                        {pitchTypes.map(([type, data]) => {
                            const pct = data.total > 0 ? Math.round((data.strikes / data.total) * 100) : 0;
                            const top = data.velocities.length > 0 ? Math.round(Math.max(...data.velocities)) : null;
                            const avg =
                                data.velocities.length > 0
                                    ? Math.round(data.velocities.reduce((s, v) => s + v, 0) / data.velocities.length)
                                    : null;
                            return (
                                <View key={type} style={styles.tableRow}>
                                    <Text variant="bodySmall" style={styles.cellType} numberOfLines={1}>
                                        {PITCH_TYPE_LABELS[type as PitchType] || type}
                                    </Text>
                                    <Text variant="bodySmall" style={styles.cellNum}>
                                        {data.total}
                                    </Text>
                                    <Text variant="bodySmall" style={styles.cellNum}>
                                        {data.balls}
                                    </Text>
                                    <Text variant="bodySmall" style={[styles.cellNum, styles.strikeCell]}>
                                        {data.strikes}
                                    </Text>
                                    <Text variant="bodySmall" style={styles.cellNum}>
                                        {pct}
                                    </Text>
                                    <Text variant="bodySmall" style={[styles.cellNum, styles.velocityCell]}>
                                        {top ?? '—'}
                                    </Text>
                                    <Text variant="bodySmall" style={[styles.cellNum, styles.velocityCell]}>
                                        {avg ?? '—'}
                                    </Text>
                                </View>
                            );
                        })}
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
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        marginBottom: 4,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    cellType: {
        flex: 1.6,
    },
    cellNum: {
        flex: 1,
        textAlign: 'right',
    },
    headerText: {
        color: '#6b7280',
    },
    strikeCell: {
        color: '#10b981',
        fontWeight: '600',
    },
    velocityCell: {
        color: '#3b82f6',
    },
});

export default PitcherStats;
