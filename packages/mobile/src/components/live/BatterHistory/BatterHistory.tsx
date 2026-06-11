import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';

import { BatterHistory as BatterHistoryType, PitchResult } from '@pitch-tracker/shared';

import api from '../../../services/api';
import { colors } from '../../../styles/theme';

interface BatterHistoryProps {
    batterId?: string;
    pitcherId?: string;
    limit?: number;
}

// Pitch-badge tint by result — mirrors the web BatterHistory badge coloring and
// the StrikeZone result palette (ball = gray, called = green, swinging = red,
// foul = amber, in play = blue).
function pitchBadgeColor(result: PitchResult | string | undefined): string {
    switch (result) {
        case 'called_strike':
            return colors.green[600];
        case 'swinging_strike':
            return colors.red[500];
        case 'foul':
            return colors.amber[600];
        case 'in_play':
            return '#3b82f6';
        case 'ball':
        default:
            return colors.gray[400];
    }
}

/**
 * Tablet (iPad) sidebar panel — recent at-bat history for the current batter,
 * mirroring the web `BatterHistory` left-panel component. The "All Time / vs
 * This Pitcher" toggle flips whether `pitcherId` scopes the query. Fetches via
 * the shared axios `api` instance directly (same one-off pattern PitcherStats
 * uses for eligibility) — mobile has no analyticsService.
 */
const BatterHistory: React.FC<BatterHistoryProps> = ({ batterId, pitcherId, limit = 10 }) => {
    const theme = useTheme();
    const [history, setHistory] = useState<BatterHistoryType | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAllTime, setShowAllTime] = useState(false);

    const loadHistory = useCallback(async () => {
        if (!batterId) {
            setHistory(null);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const params = new URLSearchParams({ limit: limit.toString() });
            const scopedPitcherId = showAllTime ? undefined : pitcherId;
            if (scopedPitcherId) params.append('pitcherId', scopedPitcherId);
            const res = await api.get<BatterHistoryType>(`/analytics/batter/${batterId}/history?${params}`);
            setHistory(res.data);
        } catch (error) {
            console.warn('Failed to load batter history:', error);
            setHistory(null);
        } finally {
            setLoading(false);
        }
    }, [batterId, pitcherId, showAllTime, limit]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const header = (
        <View style={styles.header}>
            <Text variant="titleSmall" style={styles.title}>
                Batter History
            </Text>
            {batterId && (
                <Button mode="text" compact onPress={() => setShowAllTime((v) => !v)} labelStyle={styles.toggleLabel}>
                    {showAllTime ? 'vs This Pitcher' : 'All Time'}
                </Button>
            )}
        </View>
    );

    if (loading || !history) {
        return (
            <Card style={styles.container}>
                <Card.Content>
                    {header}
                    <Text variant="bodySmall" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                        {loading ? 'Loading history...' : 'No history available'}
                    </Text>
                </Card.Content>
            </Card>
        );
    }

    const { stats, at_bats: atBats } = history;
    const avg =
        stats.batting_average !== undefined && stats.batting_average !== null ? Number(stats.batting_average).toFixed(3) : '---';

    const statCells: { label: string; value: string | number; highlighted?: boolean }[] = [
        { label: 'AB', value: stats.total_abs },
        { label: 'H', value: stats.hits },
        { label: 'BB', value: stats.walks },
        { label: 'K', value: stats.strikeouts },
        { label: 'AVG', value: avg, highlighted: true },
    ];

    return (
        <Card style={styles.container}>
            <Card.Content>
                {header}

                <View style={styles.statsGrid}>
                    {statCells.map((c) => (
                        <View
                            key={c.label}
                            style={[
                                styles.statCard,
                                { backgroundColor: theme.colors.surfaceVariant },
                                c.highlighted && { backgroundColor: colors.primary[600] },
                            ]}
                        >
                            <Text variant="labelSmall" style={[styles.statLabel, c.highlighted && styles.statLabelHi]}>
                                {c.label}
                            </Text>
                            <Text variant="titleMedium" style={[styles.statValue, c.highlighted && styles.statValueHi]}>
                                {c.value}
                            </Text>
                        </View>
                    ))}
                </View>

                <Text variant="labelMedium" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                    Recent At-Bats
                </Text>
                {atBats.length === 0 ? (
                    <Text variant="bodySmall" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                        No at-bats recorded
                    </Text>
                ) : (
                    atBats.map((ab, idx) => (
                        <View key={ab.id} style={[styles.atBat, { borderColor: colors.gray[200] }]}>
                            <View style={styles.atBatHeader}>
                                <Text variant="labelSmall" style={[styles.atBatNum, { color: theme.colors.onSurfaceVariant }]}>
                                    AB #{idx + 1}
                                </Text>
                                <Text variant="labelMedium" style={styles.atBatResult}>
                                    {ab.result || 'In Progress'}
                                </Text>
                            </View>
                            <View style={styles.atBatDetails}>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Count {ab.balls}-{ab.strikes}
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {ab.pitches?.length || 0} pitches
                                </Text>
                                {ab.rbi !== undefined && ab.rbi > 0 && (
                                    <Text variant="bodySmall" style={{ color: colors.green[600], fontWeight: '600' }}>
                                        {ab.rbi} RBI
                                    </Text>
                                )}
                            </View>
                            {ab.pitches && ab.pitches.length > 0 && (
                                <View style={styles.pitchSeq}>
                                    {ab.pitches.map((pitch, pIdx) => (
                                        <View
                                            key={pitch.id || pIdx}
                                            style={[styles.pitchBadge, { backgroundColor: pitchBadgeColor(pitch.pitch_result) }]}
                                        >
                                            <Text style={styles.pitchBadgeText}>
                                                {pitch.pitch_type.substring(0, 2).toUpperCase()}
                                                {pitch.velocity ? ` ${pitch.velocity}` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {},
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    title: {
        fontWeight: '700',
    },
    toggleLabel: {
        fontSize: 11,
    },
    empty: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 6,
    },
    statLabel: {
        opacity: 0.7,
    },
    statLabelHi: {
        color: '#ffffff',
        opacity: 0.85,
    },
    statValue: {
        fontWeight: '700',
    },
    statValueHi: {
        color: '#ffffff',
    },
    sectionTitle: {
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    atBat: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 6,
    },
    atBatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    atBatNum: {
        fontWeight: '600',
    },
    atBatResult: {
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    atBatDetails: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    pitchSeq: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    pitchBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pitchBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },
});

export default BatterHistory;
