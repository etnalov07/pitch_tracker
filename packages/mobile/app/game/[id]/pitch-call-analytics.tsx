import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS, PitchCallAbbrev, PitchCallZone } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchGameAnalytics } from '../../../src/state';

export default function PitchCallAnalyticsScreen() {
    const { id: gameId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const { gameAnalytics } = useAppSelector((state) => state.pitchCalling);

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameAnalytics(gameId));
        }
    }, [gameId, dispatch]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="#F0EDE6" onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Call Analytics</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                {!gameAnalytics ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No pitch call data for this game yet.</Text>
                        <Text style={styles.emptySubtext}>
                            Send pitch calls during the game and log results to see execution analytics.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Summary stats */}
                        <View style={styles.summaryRow}>
                            <StatCard label="Total Calls" value={String(gameAnalytics.total_calls)} />
                            <StatCard label="Linked" value={String(gameAnalytics.total_linked)} />
                            <StatCard
                                label="Type Acc."
                                value={`${gameAnalytics.type_accuracy}%`}
                                color={gameAnalytics.type_accuracy >= 70 ? '#22C55E' : '#F5A623'}
                            />
                            <StatCard
                                label="Zone Acc."
                                value={`${gameAnalytics.zone_accuracy}%`}
                                color={gameAnalytics.zone_accuracy >= 50 ? '#22C55E' : '#F5A623'}
                            />
                        </View>

                        {/* Result breakdown */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>RESULTS</Text>
                            <View style={styles.resultRow}>
                                <ResultChip label="Strike" count={gameAnalytics.results.strike} color="#EF4444" />
                                <ResultChip label="Ball" count={gameAnalytics.results.ball} color="#3B82F6" />
                                <ResultChip label="Foul" count={gameAnalytics.results.foul} color="#F5A623" />
                                <ResultChip label="In Play" count={gameAnalytics.results.in_play} color="#22C55E" />
                            </View>
                        </View>

                        {/* Per-pitcher breakdown */}
                        {gameAnalytics.by_pitcher.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>BY PITCHER</Text>
                                {gameAnalytics.by_pitcher.map((p) => (
                                    <View key={p.pitcher_id} style={styles.pitcherRow}>
                                        <Text style={styles.pitcherName}>{p.pitcher_name || 'Unknown'}</Text>
                                        <View style={styles.pitcherStats}>
                                            <Text style={styles.pitcherStat}>{p.total} calls</Text>
                                            <Text
                                                style={[
                                                    styles.pitcherStat,
                                                    { color: p.type_accuracy >= 70 ? '#22C55E' : '#F5A623' },
                                                ]}
                                            >
                                                Type: {p.type_accuracy}%
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.pitcherStat,
                                                    { color: p.zone_accuracy >= 50 ? '#22C55E' : '#F5A623' },
                                                ]}
                                            >
                                                Zone: {p.zone_accuracy}%
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Sub-components

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
        </View>
    );
}

function ResultChip({ label, count, color }: { label: string; count: number; color: string }) {
    return (
        <View style={[styles.resultChip, { borderColor: color + '60' }]}>
            <Text style={[styles.resultCount, { color }]}>{count}</Text>
            <Text style={styles.resultLabel}>{label}</Text>
        </View>
    );
}

const NAVY = '#0A1628';
const NAVY_LIGHT = '#132240';
const CHALK = '#F0EDE6';
const CHALK_DIM = '#C8C3BA';
const BORDER = '#2A3A55';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NAVY,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CHALK,
        letterSpacing: 0.5,
    },
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        padding: 16,
        gap: 16,
    },
    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: CHALK_DIM,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#5A6278',
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    // Summary stats row
    summaryRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: NAVY_LIGHT,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: BORDER,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: CHALK_DIM,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: CHALK,
    },
    // Sections
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: CHALK_DIM,
        letterSpacing: 1.5,
    },
    // Results
    resultRow: {
        flexDirection: 'row',
        gap: 8,
    },
    resultChip: {
        flex: 1,
        backgroundColor: NAVY_LIGHT,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    resultCount: {
        fontSize: 18,
        fontWeight: '800',
    },
    resultLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: CHALK_DIM,
        marginTop: 2,
    },
    // Per-pitcher
    pitcherRow: {
        backgroundColor: NAVY_LIGHT,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 6,
    },
    pitcherName: {
        fontSize: 14,
        fontWeight: '700',
        color: CHALK,
    },
    pitcherStats: {
        flexDirection: 'row',
        gap: 16,
    },
    pitcherStat: {
        fontSize: 12,
        fontWeight: '600',
        color: CHALK_DIM,
    },
});
