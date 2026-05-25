// Mobile dashboard for users registered as 'player' (UX-DB-10).
// Mirrors the web PlayerDashboard layout: team switcher, batting + pitching
// aggregate cards, recent-games rows. No game-management affordances — players
// don't chart, they review their own line.

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import type { MyPlayerStats } from '@pitch-tracker/shared';

import { useAppSelector } from '../../state';
import { type MyPlayerRecord, playersApi } from '../../state/players/api/playersApi';

const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const PlayerDashboardScreen: React.FC = () => {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAppSelector((state) => state.auth);

    const [records, setRecords] = useState<MyPlayerRecord[] | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [recordsError, setRecordsError] = useState<string | null>(null);

    const [stats, setStats] = useState<MyPlayerStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    const loadRecords = useCallback(() => {
        setRecordsError(null);
        return playersApi
            .getMyPlayers()
            .then((rows) => {
                setRecords(rows);
            })
            .catch((err: unknown) => {
                setRecordsError(err instanceof Error ? err.message : 'Failed to load your teams');
                setRecords([]);
            });
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const activeRecord = records && records.length > 0 ? records[Math.min(activeIdx, records.length - 1)] : null;
    const activeTeamId = activeRecord?.team_id;

    const loadStats = useCallback((teamId: string) => {
        setStats(null);
        setStatsError(null);
        setStatsLoading(true);
        return playersApi
            .getMyStats(teamId)
            .then((s) => setStats(s))
            .catch((err: unknown) => {
                setStatsError(err instanceof Error ? err.message : 'Failed to load your stats');
            })
            .finally(() => setStatsLoading(false));
    }, []);

    useEffect(() => {
        if (!activeTeamId) return;
        loadStats(activeTeamId);
    }, [activeTeamId, loadStats]);

    const onRefresh = useCallback(() => {
        loadRecords().then(() => {
            if (activeTeamId) loadStats(activeTeamId);
        });
    }, [loadRecords, loadStats, activeTeamId]);

    if (records === null) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.centered}>
                    <ActivityIndicator />
                </View>
            </SafeAreaView>
        );
    }

    // No team membership — waiting for a coach to add them, or paste invite link.
    if (records.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Card>
                        <Card.Content>
                            <Text variant="titleLarge">Hi {user?.first_name || 'there'}</Text>
                            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                                {recordsError ||
                                    'No team yet. Ask your coach to add you, or paste your invite link to get connected.'}
                            </Text>
                            <Button mode="contained" onPress={() => router.push('/join-team' as any)} style={{ marginTop: 12 }}>
                                Paste invite link
                            </Button>
                        </Card.Content>
                    </Card>
                </ScrollView>
            </SafeAreaView>
        );
    }

    const batting = stats?.batting ?? null;
    const pitching = stats?.pitching ?? null;
    const hasStats = !!batting || !!pitching;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={statsLoading} onRefresh={onRefresh} />}
            >
                <View style={styles.header}>
                    <Text variant="headlineSmall">{activeRecord?.team_name || 'My Team'}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {user?.first_name} {user?.last_name}
                        {activeRecord?.jersey_number != null ? ` · #${activeRecord.jersey_number}` : ''}
                        {activeRecord?.primary_position ? ` · ${activeRecord.primary_position}` : ''}
                    </Text>
                </View>

                {records.length > 1 && (
                    <View style={styles.teamChipRow}>
                        {records.map((r, i) => (
                            <Chip
                                key={r.id}
                                selected={i === activeIdx}
                                onPress={() => setActiveIdx(i)}
                                style={[styles.teamChip, i === activeIdx && { backgroundColor: theme.colors.primary }]}
                                textStyle={i === activeIdx ? { color: theme.colors.onPrimary } : undefined}
                                compact
                            >
                                {r.team_name || 'Team'}
                            </Chip>
                        ))}
                    </View>
                )}

                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            My Stats
                        </Text>
                        {statsLoading && <Text style={styles.muted}>Loading your stats…</Text>}
                        {!statsLoading && statsError && (
                            <Text style={[styles.muted, { color: theme.colors.error }]}>{statsError}</Text>
                        )}
                        {!statsLoading && !statsError && !hasStats && (
                            <Text style={styles.muted}>
                                No game stats recorded yet. Your batting and pitching lines show up here once your coach charts a
                                game you played in.
                            </Text>
                        )}
                        {!statsLoading && !statsError && batting && (
                            <View style={styles.statBlock}>
                                <Text variant="labelLarge" style={[styles.blockTitle, { color: theme.colors.onSurfaceVariant }]}>
                                    Batting
                                </Text>
                                <View style={styles.statGrid}>
                                    <StatTile label="AVG" value={String(batting.batting_average)} />
                                    <StatTile label="G" value={String(batting.games)} />
                                    <StatTile label="AB" value={String(batting.at_bats)} />
                                    <StatTile label="H" value={String(batting.hits)} />
                                    <StatTile label="RBI" value={String(batting.rbi)} />
                                    <StatTile label="R" value={String(batting.runs)} />
                                    <StatTile label="BB" value={String(batting.walks)} />
                                    <StatTile label="K" value={String(batting.strikeouts)} />
                                </View>
                            </View>
                        )}
                        {!statsLoading && !statsError && pitching && (
                            <View style={styles.statBlock}>
                                <Text variant="labelLarge" style={[styles.blockTitle, { color: theme.colors.onSurfaceVariant }]}>
                                    Pitching
                                </Text>
                                <View style={styles.statGrid}>
                                    <StatTile label="K%" value={`${pitching.strike_percentage}%`} />
                                    <StatTile label="G" value={String(pitching.games)} />
                                    <StatTile label="BF" value={String(pitching.batters_faced)} />
                                    <StatTile label="P" value={String(pitching.total_pitches)} />
                                    <StatTile label="Strikes" value={String(pitching.strikes)} />
                                    <StatTile label="Balls" value={String(pitching.balls)} />
                                </View>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Recent Games
                        </Text>
                        {statsLoading && <Text style={styles.muted}>Loading…</Text>}
                        {!statsLoading && (!stats || stats.games.length === 0) && (
                            <Text style={styles.muted}>No games played yet.</Text>
                        )}
                        {!statsLoading &&
                            stats &&
                            stats.games.length > 0 &&
                            stats.games.map((game) => {
                                const scoreText =
                                    game.team_score !== null && game.opponent_score !== null
                                        ? `${game.result ?? ''} ${game.team_score}-${game.opponent_score}`.trim()
                                        : '—';
                                return (
                                    <View key={game.game_id} style={styles.gameRow}>
                                        <View style={styles.gameRowLeft}>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                                {formatDate(game.game_date)}
                                            </Text>
                                            <Text variant="bodyMedium">{game.opponent_name || 'Opponent'}</Text>
                                            {game.batting_line && <Text variant="bodySmall">{game.batting_line}</Text>}
                                            {game.pitching_line && <Text variant="bodySmall">{game.pitching_line}</Text>}
                                        </View>
                                        <Text variant="bodyMedium" style={styles.gameRowRight}>
                                            {scoreText}
                                        </Text>
                                    </View>
                                );
                            })}
                    </Card.Content>
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
};

const StatTile: React.FC<{ label: string; value: string }> = ({ label, value }) => {
    const theme = useTheme();
    return (
        <View style={[styles.statTile, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleMedium">{value}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' }}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 12, gap: 12, paddingBottom: 40 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 4 },
    teamChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    teamChip: {},
    card: {},
    sectionTitle: { marginBottom: 8 },
    statBlock: { marginTop: 8 },
    blockTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    statTile: {
        flexBasis: '23%',
        flexGrow: 1,
        minWidth: 70,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    muted: { opacity: 0.7 },
    emptyText: { marginTop: 6 },
    gameRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
        gap: 8,
    },
    gameRowLeft: { flex: 1 },
    gameRowRight: { fontWeight: '700' },
});

export default PlayerDashboardScreen;
