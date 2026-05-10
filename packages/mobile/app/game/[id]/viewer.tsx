import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BatterBreakdown, CountBucketBreakdown, PerformanceSummary, PitcherGameStats } from '@pitch-tracker/shared';
import {
    useAppDispatch,
    useAppSelector,
    fetchCurrentGameState,
    fetchGamePitchers,
    fetchOpposingPitchers,
} from '../../../src/state';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import { BatterBreakdownView } from '../../../src/components/performanceSummary';
import PerformanceSummaryView from '../../../src/components/performanceSummary/PerformanceSummaryView';
import { performanceSummaryApi } from '../../../src/state/performanceSummary/api/performanceSummaryApi';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import api from '../../../src/services/api';

type ViewerTab = 'stats' | 'counts' | 'breakdown' | 'summary';
type BreakdownTab = 'opponent' | 'our_team';

const NARRATIVE_POLL_INTERVAL_MS = 3000;
const NARRATIVE_POLL_MAX_ATTEMPTS = 10;

// ── Pitcher Stats ─────────────────────────────────────────────────────────────

function PitcherStatsTab({
    pitcherId,
    gameId,
    pitcherName,
    refreshTrigger,
}: {
    pitcherId: string;
    gameId: string;
    pitcherName: string;
    refreshTrigger: number;
}) {
    const theme = useTheme();
    const [stats, setStats] = useState<PitcherGameStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get<{ stats: PitcherGameStats }>(`/players/${pitcherId}/game-stats/${gameId}`)
            .then((r) => setStats(r.data.stats))
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    }, [pitcherId, gameId, refreshTrigger]);

    if (loading) return <ActivityIndicator style={styles.centered} />;
    if (!stats) return <Text style={styles.emptyText}>No pitches recorded yet.</Text>;

    const strikeRate = stats.total_pitches > 0 ? Math.round((stats.strikes / stats.total_pitches) * 100) : 0;
    const sortedTypes = Object.entries(stats.pitch_type_breakdown).sort(([, a], [, b]) => b.total - a.total);

    return (
        <View style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={styles.statsCardTitle}>{pitcherName}'s Stats</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#1d4ed8' }]}>{stats.total_pitches}</Text>
                    <Text style={styles.statLabel}>Pitches</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.strikes}</Text>
                    <Text style={styles.statLabel}>Strikes</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.balls}</Text>
                    <Text style={styles.statLabel}>Balls</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#6b7280' }]}>{strikeRate}%</Text>
                    <Text style={styles.statLabel}>K%</Text>
                </View>
            </View>
            {sortedTypes.length > 0 && (
                <View style={styles.pitchMixTable}>
                    <View style={styles.pitchMixHeader}>
                        <Text style={[styles.pitchMixCell, { flex: 2 }]}>Type</Text>
                        <Text style={styles.pitchMixCell}>#</Text>
                        <Text style={styles.pitchMixCell}>Ball</Text>
                        <Text style={styles.pitchMixCell}>K</Text>
                        <Text style={styles.pitchMixCell}>K%</Text>
                        <Text style={styles.pitchMixCell}>Top</Text>
                        <Text style={styles.pitchMixCell}>Avg</Text>
                    </View>
                    {sortedTypes.map(([type, d]) => {
                        const pct = d.total > 0 ? Math.round((d.strikes / d.total) * 100) : 0;
                        return (
                            <View key={type} style={styles.pitchMixRow}>
                                <Text style={[styles.pitchMixCell, { flex: 2, fontWeight: '600' }]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                                <Text style={styles.pitchMixCell}>{d.total}</Text>
                                <Text style={styles.pitchMixCell}>{d.balls}</Text>
                                <Text style={[styles.pitchMixCell, { color: '#16a34a' }]}>{d.strikes}</Text>
                                <Text style={styles.pitchMixCell}>{pct}%</Text>
                                <Text style={[styles.pitchMixCell, { color: '#6b7280' }]}>{d.top_velocity ?? '–'}</Text>
                                <Text style={[styles.pitchMixCell, { color: '#6b7280' }]}>{d.avg_velocity ?? '–'}</Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

// ── Count Breakdown ───────────────────────────────────────────────────────────

const BUCKET_LABELS: Record<string, string> = {
    '1st_pitch': '1st Pitch (0-0)',
    ahead: 'Ahead (K > B)',
    even: 'Even',
    behind: 'Behind (B > K)',
};

function CountBreakdownTab({
    gameId,
    pitcherId,
    opposingPitcherId,
    refreshTrigger,
}: {
    gameId: string;
    pitcherId?: string;
    opposingPitcherId?: string;
    refreshTrigger: number;
}) {
    const theme = useTheme();
    const [data, setData] = useState<CountBucketBreakdown | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        gamesApi
            .getCountBreakdown(gameId, opposingPitcherId ? undefined : pitcherId, undefined, opposingPitcherId)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, [gameId, pitcherId, opposingPitcherId, refreshTrigger]);

    const buckets = ['1st_pitch', 'ahead', 'even', 'behind'] as const;

    if (loading) return <ActivityIndicator style={styles.centered} />;
    if (!data || buckets.every((k) => data[k].total === 0)) {
        return <Text style={styles.emptyText}>No pitches recorded yet.</Text>;
    }

    return (
        <View style={{ gap: 12 }}>
            {buckets.map((key) => {
                const bucket = data![key];
                if (bucket.total === 0) return null;
                return (
                    <View key={key} style={[styles.countBucket, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <View style={styles.countBucketHeader}>
                            <Text style={styles.countBucketLabel}>{BUCKET_LABELS[key]}</Text>
                            <Text style={styles.countBucketTotal}>{bucket.total} pitches</Text>
                            <Text
                                style={[
                                    styles.countStrikeRate,
                                    {
                                        color:
                                            bucket.strike_percentage >= 60
                                                ? '#16a34a'
                                                : bucket.strike_percentage >= 45
                                                  ? '#ca8a04'
                                                  : '#dc2626',
                                    },
                                ]}
                            >
                                {bucket.strike_percentage}% K
                            </Text>
                        </View>
                        {bucket.pitch_type_breakdown
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 4)
                            .map((t) => (
                                <View key={t.pitch_type} style={styles.countTypeRow}>
                                    <Text style={styles.countTypeLabel}>{t.pitch_type}</Text>
                                    <Text style={styles.countTypeStats}>
                                        {t.count} ({t.strike_percentage}% K)
                                    </Text>
                                </View>
                            ))}
                    </View>
                );
            })}
        </View>
    );
}

// ── Performance Summary ───────────────────────────────────────────────────────

function SummaryTab({ gameId }: { gameId: string }) {
    const theme = useTheme();
    const [summaries, setSummaries] = useState<PerformanceSummary[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const pollAttemptsRef = useRef(0);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setLoading(true);
        performanceSummaryApi
            .getGamePitcherSummaries(gameId)
            .then((s) => setSummaries(s))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [gameId]);

    const summary = summaries[selectedIdx] ?? null;

    // Poll until narrative arrives
    useEffect(() => {
        if (!summary || summary.narrative) {
            pollAttemptsRef.current = 0;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
            return;
        }
        if (pollAttemptsRef.current >= NARRATIVE_POLL_MAX_ATTEMPTS) return;
        pollTimerRef.current = setTimeout(() => {
            pollAttemptsRef.current += 1;
            performanceSummaryApi
                .getGamePitcherSummaries(gameId)
                .then((s) => {
                    if (s.length > 0) setSummaries(s);
                })
                .catch(() => {});
        }, NARRATIVE_POLL_INTERVAL_MS);
        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [summary, gameId]);

    const handleRegenerate = async () => {
        if (!summary) return;
        setRegenerating(true);
        try {
            await performanceSummaryApi.regenerateNarrative(summary.id);
            const updated = await performanceSummaryApi.getGamePitcherSummaries(gameId);
            setSummaries(updated);
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) return <ActivityIndicator style={styles.centered} />;
    if (!summary) return <Text style={styles.emptyText}>No performance data available for this game.</Text>;

    return (
        <View>
            {summaries.length > 1 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillRow}
                    style={styles.pillRowWrap}
                >
                    {summaries.map((s, i) => (
                        <TouchableOpacity
                            key={s.id}
                            style={[styles.pill, { backgroundColor: theme.colors.surface }, selectedIdx === i && styles.pillActive]}
                            onPress={() => setSelectedIdx(i)}
                        >
                            <Text style={[styles.pillText, selectedIdx === i && styles.pillTextActive]}>{s.pitcher_name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
            <PerformanceSummaryView summary={summary} onRegenerate={handleRegenerate} regenerating={regenerating} />
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ViewerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { selectedGame, currentGameState, gamePitchers, opposingPitchers } = useAppSelector((state) => state.games);
    const game = currentGameState?.game || selectedGame;

    const [activeTab, setActiveTab] = useState<ViewerTab>('stats');
    const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('opponent');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [oppBreakdown, setOppBreakdown] = useState<BatterBreakdown[]>([]);
    const [myTeamBreakdown, setMyTeamBreakdown] = useState<BatterBreakdown[]>([]);
    const [breakdownLoading, setBreakdownLoading] = useState(false);
    const [selectedPitcherIdx, setSelectedPitcherIdx] = useState(0);
    const [selectedOppPitcherIdx, setSelectedOppPitcherIdx] = useState(0);
    const [countsMode, setCountsMode] = useState<'our' | 'opp'>('our');

    // Default to last opposing pitcher (most recent) once list loads
    useEffect(() => {
        if (opposingPitchers.length > 0) {
            setSelectedOppPitcherIdx(opposingPitchers.length - 1);
        }
    }, [opposingPitchers.length]);

    const selectedPitcher = gamePitchers[selectedPitcherIdx] ?? gamePitchers.find((p) => !p.inning_exited) ?? gamePitchers[0];
    const pitcherId = selectedPitcher?.player_id;
    const pitcherName = selectedPitcher?.player
        ? `${selectedPitcher.player.first_name} ${selectedPitcher.player.last_name}`
        : 'Pitcher';
    const selectedOppPitcher = opposingPitchers[selectedOppPitcherIdx] ?? null;
    const opponentPitcherName = selectedOppPitcher?.pitcher_name ?? 'Opponent Pitcher';

    useEffect(() => {
        if (id) {
            dispatch(fetchCurrentGameState(id)).catch(() => {});
            dispatch(fetchGamePitchers(id));
            dispatch(fetchOpposingPitchers(id));
        }
    }, [id, dispatch]);

    const fetchBreakdown = useCallback(async () => {
        if (!id) return;
        setBreakdownLoading(true);
        try {
            const [opp, mine] = await Promise.all([
                performanceSummaryApi.getBatterBreakdown(id),
                game?.charting_mode === 'both' ? performanceSummaryApi.getMyTeamBatterBreakdown(id) : Promise.resolve([]),
            ]);
            setOppBreakdown(opp);
            setMyTeamBreakdown(mine);
        } catch {
            // leave previous data on error
        } finally {
            setBreakdownLoading(false);
        }
    }, [id, game?.charting_mode]);

    useEffect(() => {
        if (activeTab === 'breakdown') fetchBreakdown();
    }, [activeTab, refreshTrigger, fetchBreakdown]);

    useGameWebSocket(id ?? null, {
        pitch_logged: () => {
            setRefreshTrigger((prev) => prev + 1);
            if (id) dispatch(fetchCurrentGameState(id)).catch(() => {});
        },
        at_bat_ended: () => setRefreshTrigger((prev) => prev + 1),
        inning_changed: () => {
            setRefreshTrigger((prev) => prev + 1);
            if (id) dispatch(fetchCurrentGameState(id)).catch(() => {});
        },
        runners_updated: () => setRefreshTrigger((prev) => prev + 1),
    });

    if (!game) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.centered}>
                    <Text variant="titleMedium">Loading game...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const inningLabel = `${game.inning_half === 'top' ? '▲' : '▼'} ${game.current_inning}`;

    const tabs: { value: ViewerTab; label: string }[] = [
        { value: 'stats', label: 'Pitcher Stats' },
        { value: 'counts', label: 'Count Breakdown' },
        { value: 'breakdown', label: 'Batter Breakdown' },
        ...(game.status === 'completed' ? [{ value: 'summary' as ViewerTab, label: 'Summary' }] : []),
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>
                <Text variant="titleMedium" style={styles.headerTitle} numberOfLines={1}>
                    {game.opponent_name ?? 'Live Game'}
                </Text>
                <View style={styles.viewerBadge}>
                    <Text style={styles.viewerBadgeText}>VIEWER</Text>
                </View>
            </View>

            {/* Score strip */}
            <View style={[styles.scoreStrip, { backgroundColor: theme.colors.surface }]}>
                <Text variant="bodySmall" style={styles.teamLabel}>
                    {game.home_team_name ?? 'Home'}
                </Text>
                <Text variant="headlineSmall" style={styles.score}>
                    {game.home_score} – {game.away_score}
                </Text>
                <Text variant="bodySmall" style={styles.teamLabel}>
                    {game.opponent_name ?? 'Away'}
                </Text>
                <Text variant="bodyMedium" style={styles.inning}>
                    {inningLabel}
                </Text>
            </View>

            {/* Tab bar — horizontal scroll so 4 tabs fit on any screen */}
            <View style={[styles.tabBarWrap, { backgroundColor: theme.colors.surface }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.value}
                            style={[styles.tabBtn, activeTab === tab.value && styles.tabBtnActive]}
                            onPress={() => setActiveTab(tab.value)}
                        >
                            <Text style={[styles.tabBtnText, activeTab === tab.value && styles.tabBtnTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === 'stats' && (
                    <>
                        {gamePitchers.length > 1 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}
                                style={styles.pillRowWrap}
                            >
                                {gamePitchers.map((p, i) => {
                                    const name = p.player ? `${p.player.first_name} ${p.player.last_name}` : `Pitcher ${i + 1}`;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.pill,
                                                { backgroundColor: theme.colors.surface },
                                                selectedPitcherIdx === i && styles.pillActive,
                                            ]}
                                            onPress={() => setSelectedPitcherIdx(i)}
                                        >
                                            <Text style={[styles.pillText, selectedPitcherIdx === i && styles.pillTextActive]}>
                                                {name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                        {pitcherId && id ? (
                            <PitcherStatsTab
                                pitcherId={pitcherId}
                                gameId={id}
                                pitcherName={pitcherName}
                                refreshTrigger={refreshTrigger}
                            />
                        ) : (
                            <Text style={styles.emptyText}>No pitcher data available.</Text>
                        )}
                    </>
                )}

                {activeTab === 'counts' && id && (
                    <>
                        {gamePitchers.length > 1 && countsMode === 'our' && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}
                                style={styles.pillRowWrap}
                            >
                                {gamePitchers.map((p, i) => {
                                    const name = p.player ? `${p.player.first_name} ${p.player.last_name}` : `Pitcher ${i + 1}`;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.pill,
                                                { backgroundColor: theme.colors.surface },
                                                selectedPitcherIdx === i && styles.pillActive,
                                            ]}
                                            onPress={() => setSelectedPitcherIdx(i)}
                                        >
                                            <Text style={[styles.pillText, selectedPitcherIdx === i && styles.pillTextActive]}>
                                                {name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                        {game.charting_mode === 'both' && (
                            <View style={styles.countsModeRow}>
                                {(['our', 'opp'] as const).map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            styles.countsModeBtn,
                                            { backgroundColor: theme.colors.surfaceVariant },
                                            countsMode === m && styles.countsModeBtnActive,
                                        ]}
                                        onPress={() => setCountsMode(m)}
                                    >
                                        <Text
                                            style={[styles.countsModeBtnText, countsMode === m && styles.countsModeBtnTextActive]}
                                        >
                                            {m === 'our' ? 'Our Pitcher' : 'Opp Pitcher'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {countsMode === 'opp' && opposingPitchers.length > 1 && (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.pillRow}
                                style={styles.pillRowWrap}
                            >
                                {opposingPitchers.map((p, i) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[
                                            styles.pill,
                                            { backgroundColor: theme.colors.surface },
                                            selectedOppPitcherIdx === i && styles.pillActive,
                                        ]}
                                        onPress={() => setSelectedOppPitcherIdx(i)}
                                    >
                                        <Text style={[styles.pillText, selectedOppPitcherIdx === i && styles.pillTextActive]}>
                                            {p.pitcher_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                        <CountBreakdownTab
                            gameId={id}
                            pitcherId={countsMode === 'our' ? pitcherId : undefined}
                            opposingPitcherId={countsMode === 'opp' ? selectedOppPitcher?.id : undefined}
                            refreshTrigger={refreshTrigger}
                        />
                    </>
                )}

                {activeTab === 'breakdown' && (
                    <View style={styles.breakdownContainer}>
                        {game.charting_mode === 'both' && (
                            <View style={styles.breakdownTabRow}>
                                {(['opponent', 'our_team'] as BreakdownTab[]).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.breakdownTabBtn, breakdownTab === t && styles.breakdownTabBtnActive]}
                                        onPress={() => setBreakdownTab(t)}
                                    >
                                        <Text
                                            style={[styles.breakdownTabText, breakdownTab === t && styles.breakdownTabTextActive]}
                                        >
                                            {t === 'opponent' ? 'Opponent Lineup' : 'Our Lineup'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {breakdownLoading && oppBreakdown.length === 0 ? (
                            <ActivityIndicator style={styles.centered} />
                        ) : breakdownTab === 'opponent' || game.charting_mode !== 'both' ? (
                            <BatterBreakdownView
                                breakdown={oppBreakdown}
                                title={`Opponent Lineup vs. ${pitcherName}`}
                                pitcherId={pitcherId}
                                gameId={id}
                            />
                        ) : (
                            <BatterBreakdownView
                                breakdown={myTeamBreakdown}
                                title={`Our Lineup vs. ${opponentPitcherName}`}
                                gameId={id}
                            />
                        )}
                    </View>
                )}

                {activeTab === 'summary' && id && <SummaryTab gameId={id} />}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: { paddingRight: 8 },
    backBtnText: { fontSize: 14, color: '#1d4ed8' },
    headerTitle: { flex: 1, fontWeight: '600', textAlign: 'center' },
    viewerBadge: {
        backgroundColor: '#6b7280',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    viewerBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    scoreStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    teamLabel: { color: '#6b7280' },
    score: { fontWeight: '700', letterSpacing: 2 },
    inning: { color: '#1d4ed8', fontWeight: '600', marginLeft: 8 },
    tabBarWrap: {
        borderBottomWidth: 2,
        borderBottomColor: '#e5e7eb',
    },
    tabBar: {
        paddingHorizontal: 12,
        flexDirection: 'row',
        gap: 0,
    },
    tabBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginBottom: -2,
    },
    tabBtnActive: {
        borderBottomColor: '#1d4ed8',
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    tabBtnTextActive: {
        color: '#1d4ed8',
        fontWeight: '600',
    },
    content: { flex: 1, padding: 12 },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        marginTop: 32,
        fontSize: 14,
        fontStyle: 'italic',
    },

    // Pitcher stats
    statsCard: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statsCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700' },
    statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
    pitchMixTable: { gap: 0 },
    pitchMixHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    pitchMixRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    pitchMixCell: {
        flex: 1,
        fontSize: 12,
        color: '#374151',
        textAlign: 'center',
    },

    // Count breakdown
    countBucket: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        padding: 12,
    },
    countBucketHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        flexWrap: 'wrap',
    },
    countBucketLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    countBucketTotal: { fontSize: 13, fontWeight: '600', color: '#111827' },
    countStrikeRate: { fontSize: 12, fontWeight: '600' },
    countTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    countTypeLabel: { fontSize: 12, color: '#6b7280' },
    countTypeStats: { fontSize: 12, color: '#6b7280' },

    // Breakdown
    breakdownContainer: { gap: 0 },
    breakdownTabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        marginBottom: 12,
    },
    breakdownTabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
        marginBottom: -1,
    },
    breakdownTabBtnActive: { borderBottomColor: '#1d4ed8' },
    breakdownTabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
    breakdownTabTextActive: { color: '#1d4ed8', fontWeight: '600' },

    // Pitcher / opponent pitcher pill selectors
    pillRowWrap: { marginBottom: 10 },
    pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    pillActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    pillText: { fontSize: 13, fontWeight: '500', color: '#374151' },
    pillTextActive: { color: 'white', fontWeight: '600' },

    // Counts mode toggle (Our Pitcher / Opp Pitcher)
    countsModeRow: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    countsModeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    countsModeBtnActive: { backgroundColor: '#1d4ed8' },
    countsModeBtnText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
    countsModeBtnTextActive: { color: 'white', fontWeight: '600' },
});
