import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button, useTheme, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BatterBreakdown } from '@pitch-tracker/shared';
import {
    useAppDispatch,
    useAppSelector,
    fetchCurrentGameState,
    fetchGamePitchers,
    fetchOpposingPitchers,
} from '../../../src/state';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import { BatterBreakdownView } from '../../../src/components/performanceSummary';
import { performanceSummaryApi } from '../../../src/state/performanceSummary/api/performanceSummaryApi';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';

type ViewerTab = 'pitcher' | 'breakdown';
type BreakdownTab = 'opponent' | 'our_team';

export default function ViewerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { selectedGame, currentGameState, gamePitchers, opposingPitchers } = useAppSelector((state) => state.games);
    const game = currentGameState?.game || selectedGame;

    const [activeTab, setActiveTab] = useState<ViewerTab>('pitcher');
    const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('opponent');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showCountBreakdown, setShowCountBreakdown] = useState(false);
    const [oppBreakdown, setOppBreakdown] = useState<BatterBreakdown[]>([]);
    const [myTeamBreakdown, setMyTeamBreakdown] = useState<BatterBreakdown[]>([]);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    const activePitcher = gamePitchers.find((p) => !p.inning_exited);
    const pitcherId = activePitcher?.player_id;
    const pitcherName = activePitcher?.player ? `${activePitcher.player.first_name} ${activePitcher.player.last_name}` : 'Pitcher';
    const currentOpposingPitcher = opposingPitchers[opposingPitchers.length - 1] ?? null;
    const opponentPitcherName = currentOpposingPitcher?.pitcher_name ?? 'Opponent Pitcher';

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
            // leave previous data in place on error
        } finally {
            setBreakdownLoading(false);
        }
    }, [id, game?.charting_mode]);

    // Re-fetch breakdown whenever on that tab and any pitch is logged
    useEffect(() => {
        if (activeTab === 'breakdown') {
            fetchBreakdown();
        }
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
                <View style={styles.center}>
                    <Text variant="titleMedium">Loading game...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const inningLabel = `${game.inning_half === 'top' ? '▲' : '▼'} ${game.current_inning}`;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Button icon="arrow-left" onPress={() => router.back()} compact>
                    Back
                </Button>
                <Text variant="titleMedium" style={styles.headerTitle}>
                    {game.opponent_name ?? 'Live Game'}
                </Text>
                <View style={styles.viewerBadge}>
                    <Text style={styles.viewerBadgeText}>VIEWER</Text>
                </View>
            </View>

            <View style={styles.scoreStrip}>
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

            <View style={styles.tabRow}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as ViewerTab)}
                    buttons={[
                        { value: 'pitcher', label: 'Pitcher Info' },
                        { value: 'breakdown', label: 'Batter Breakdown' },
                    ]}
                    style={styles.segmented}
                />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {activeTab === 'pitcher' && (
                    <>
                        {activePitcher && (
                            <View style={styles.statsCard}>
                                <Text variant="titleSmall" style={styles.cardTitle}>
                                    Now Pitching: {pitcherName}
                                </Text>
                                <Text variant="bodySmall" style={styles.statLabel}>
                                    {activePitcher.player?.throws === 'L' ? 'Left-handed' : 'Right-handed'} •{' '}
                                    {activePitcher.player?.jersey_number ? `#${activePitcher.player.jersey_number}` : ''}
                                </Text>
                            </View>
                        )}
                        <Button
                            mode="outlined"
                            icon="chart-bar"
                            onPress={() => setShowCountBreakdown(true)}
                            style={styles.countBtn}
                        >
                            Count Breakdown
                        </Button>
                    </>
                )}

                {activeTab === 'breakdown' && (
                    <View style={styles.breakdownContainer}>
                        {game.charting_mode === 'both' && (
                            <SegmentedButtons
                                value={breakdownTab}
                                onValueChange={(v) => setBreakdownTab(v as BreakdownTab)}
                                buttons={[
                                    { value: 'opponent', label: 'Opponent Lineup' },
                                    { value: 'our_team', label: 'Our Lineup' },
                                ]}
                                style={styles.breakdownSegmented}
                            />
                        )}
                        {breakdownLoading && oppBreakdown.length === 0 ? (
                            <Text style={styles.loadingText}>Loading batter breakdown…</Text>
                        ) : breakdownTab === 'opponent' || game.charting_mode !== 'both' ? (
                            <BatterBreakdownView breakdown={oppBreakdown} title={`Opponent Lineup vs. ${pitcherName}`} />
                        ) : (
                            <BatterBreakdownView breakdown={myTeamBreakdown} title={`Our Lineup vs. ${opponentPitcherName}`} />
                        )}
                    </View>
                )}
            </ScrollView>

            <CountBreakdownModal
                visible={showCountBreakdown}
                onDismiss={() => setShowCountBreakdown(false)}
                gameId={id ?? ''}
                pitcherId={pitcherId}
                refreshTrigger={refreshTrigger}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: { fontWeight: '600' },
    viewerBadge: {
        backgroundColor: '#6b7280',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    viewerBadgeText: { color: 'white', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    scoreStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    teamLabel: { color: '#6b7280' },
    score: { fontWeight: '700', letterSpacing: 2 },
    inning: { color: '#1d4ed8', fontWeight: '600', marginLeft: 8 },
    tabRow: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    segmented: { height: 36 },
    content: { flex: 1, padding: 12 },
    statsCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: { fontWeight: '600', marginBottom: 4, color: '#1f2937' },
    statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4 },
    countBtn: { marginTop: 4 },
    breakdownContainer: { gap: 0 },
    breakdownSegmented: { marginBottom: 12 },
    loadingText: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14 },
});
