import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, Divider, useTheme } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import { OpponentPitcherProfile, OpponentPitcherTendencies } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchOpponentById } from '../../../../src/state';
import opponentsApi from '../../../../src/state/opponents/api/opponentsApi';
import { LoadingScreen } from '../../../../src/components/common';
import * as Haptics from '../../../../src/utils/haptics';

function fmt(n: number | null | undefined, suffix = '%'): string {
    if (n == null) return '—';
    return `${n}${suffix}`;
}

function PitcherCard({ pitcher, teamId }: { pitcher: OpponentPitcherProfile; teamId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [tendencies, setTendencies] = useState<OpponentPitcherTendencies | null | 'loading'>(null);
    const [recalcing, setRecalcing] = useState(false);
    const theme = useTheme();

    const loadTendencies = useCallback(async () => {
        setTendencies('loading');
        try {
            const { tendencies: t } = await opponentsApi.getPitcherProfile(pitcher.id);
            setTendencies(t);
        } catch {
            setTendencies(null);
        }
    }, [pitcher.id]);

    const handleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!expanded) loadTendencies();
        setExpanded((e) => !e);
    };

    const handleRecalc = async () => {
        setRecalcing(true);
        try {
            const updated = await opponentsApi.recalculateTendencies(pitcher.id);
            setTendencies(updated);
        } finally {
            setRecalcing(false);
        }
    };

    return (
        <Card style={styles.rosterCard} onPress={handleExpand}>
            <Card.Content>
                <View style={styles.rosterRow}>
                    <View>
                        <Text variant="titleSmall">{pitcher.pitcher_name}</Text>
                        <Text variant="bodySmall" style={styles.meta}>
                            {pitcher.throws}HP · {pitcher.games_pitched}G
                        </Text>
                    </View>
                    <Text style={{ color: theme.colors.primary, fontSize: 12 }}>{expanded ? '▲' : '▽'}</Text>
                </View>
                {expanded && (
                    <View style={styles.tendenciesBox}>
                        {tendencies === 'loading' ? (
                            <Text style={styles.meta}>Loading…</Text>
                        ) : !tendencies || tendencies.total_pitches === 0 ? (
                            <Text style={styles.meta}>No pitch data yet.</Text>
                        ) : (
                            <>
                                <View style={styles.statRow}>
                                    <StatCell label="Pitches" value={String(tendencies.total_pitches)} />
                                    <StatCell label="Strike%" value={fmt(tendencies.strike_percentage)} />
                                    <StatCell label="F-Strike%" value={fmt(tendencies.first_pitch_strike_pct)} />
                                </View>
                                <View style={styles.statRow}>
                                    <StatCell label="FB%" value={fmt(tendencies.fastball_pct)} />
                                    <StatCell label="Break%" value={fmt(tendencies.breaking_pct)} />
                                    <StatCell label="OS%" value={fmt(tendencies.offspeed_pct)} />
                                </View>
                                {tendencies.early_count_fastball_pct != null && (
                                    <Text style={styles.note}>Early count: {fmt(tendencies.early_count_fastball_pct)} FB</Text>
                                )}
                                {tendencies.two_strike_offspeed_pct != null && (
                                    <Text style={styles.note}>Two-strike: {fmt(tendencies.two_strike_offspeed_pct)} offspeed</Text>
                                )}
                                <Button
                                    mode="text"
                                    compact
                                    onPress={handleRecalc}
                                    loading={recalcing}
                                    style={{ marginTop: 4, alignSelf: 'flex-start' }}
                                >
                                    Recalculate
                                </Button>
                            </>
                        )}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
}

function StatCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.statCell}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

export default function OpponentDetailScreen() {
    const { id: teamId, opponentId } = useLocalSearchParams<{ id: string; opponentId: string }>();
    const dispatch = useAppDispatch();

    const { selectedOpponent, detailLoading } = useAppSelector((state) => state.opponents);

    const load = useCallback(() => {
        if (teamId && opponentId) dispatch(fetchOpponentById({ teamId, id: opponentId }));
    }, [teamId, opponentId, dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    if (detailLoading && !selectedOpponent) return <LoadingScreen message="Loading…" />;
    if (!selectedOpponent) return null;

    return (
        <>
            <Stack.Screen options={{ title: selectedOpponent.name, headerBackTitle: 'Opponents' }} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={detailLoading} onRefresh={load} />}
            >
                <View style={styles.metaRow}>
                    {[selectedOpponent.city, selectedOpponent.level].filter(Boolean).map((v, i) => (
                        <Text key={i} style={styles.badge}>
                            {v}
                        </Text>
                    ))}
                    {selectedOpponent.games_played > 0 && (
                        <Text style={styles.badge}>{selectedOpponent.games_played}G charted</Text>
                    )}
                </View>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Pitchers
                </Text>
                {selectedOpponent.pitchers.length === 0 ? (
                    <Text style={styles.empty}>No pitchers yet — they appear after charting games vs. this team.</Text>
                ) : (
                    selectedOpponent.pitchers.map((p) => <PitcherCard key={p.id} pitcher={p} teamId={teamId!} />)
                )}

                <Divider style={{ marginVertical: 16 }} />

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Batters
                </Text>
                {selectedOpponent.batters.length === 0 ? (
                    <Text style={styles.empty}>No batters yet — they appear after entering opponent lineups.</Text>
                ) : (
                    <Card style={styles.rosterCard}>
                        {selectedOpponent.batters.map((b, idx) => (
                            <React.Fragment key={b.id}>
                                <Card.Content style={styles.rosterRow}>
                                    <Text variant="bodyMedium">{b.player_name}</Text>
                                    <Text style={styles.meta}>{b.bats}HH</Text>
                                </Card.Content>
                                {idx < selectedOpponent.batters.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </Card>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    badge: {
        backgroundColor: '#e5e7eb',
        color: '#374151',
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    sectionTitle: { color: '#374151', marginBottom: 8 },
    rosterCard: { backgroundColor: '#fff', marginBottom: 10 },
    rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    meta: { color: '#6b7280', fontSize: 12 },
    tendenciesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    statRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    statCell: { alignItems: 'center', minWidth: 64 },
    statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
    statLabel: { fontSize: 11, color: '#6b7280', marginTop: 1 },
    note: { fontSize: 12, color: '#4b5563', marginBottom: 4 },
    empty: { color: '#9ca3af', fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
});
