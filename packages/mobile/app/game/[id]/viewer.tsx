import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector, fetchCurrentGameState, fetchGamePitchers } from '../../../src/state';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';

export default function ViewerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { selectedGame, currentGameState, gamePitchers } = useAppSelector((state) => state.games);
    const game = currentGameState?.game || selectedGame;

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showCountBreakdown, setShowCountBreakdown] = useState(false);

    const activePitcher = gamePitchers.find((p) => !p.inning_exited);
    const pitcherId = activePitcher?.player_id;
    const pitcherName = activePitcher?.player ? `${activePitcher.player.first_name} ${activePitcher.player.last_name}` : 'Pitcher';

    // Load game data on mount
    React.useEffect(() => {
        if (id) {
            dispatch(fetchCurrentGameState(id)).catch(() => {});
            dispatch(fetchGamePitchers(id));
        }
    }, [id, dispatch]);

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

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.scoreCard}>
                    <View style={styles.scoreRow}>
                        <Text variant="bodySmall" style={styles.teamLabel}>
                            {game.home_team_name ?? 'Home'}
                        </Text>
                        <Text variant="headlineMedium" style={styles.score}>
                            {game.home_score} – {game.away_score}
                        </Text>
                        <Text variant="bodySmall" style={styles.teamLabel}>
                            {game.opponent_name ?? 'Away'}
                        </Text>
                    </View>
                    <Text variant="bodyLarge" style={styles.inning}>
                        {inningLabel}
                    </Text>
                </View>

                {pitcherName && activePitcher && (
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

                <Button mode="outlined" icon="chart-bar" onPress={() => setShowCountBreakdown(true)} style={styles.countBtn}>
                    Count Breakdown
                </Button>
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
    viewerBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    content: { flex: 1, padding: 16 },
    scoreCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 8,
    },
    teamLabel: { color: '#6b7280' },
    score: { fontWeight: '700', letterSpacing: 2 },
    inning: { color: '#1d4ed8', fontWeight: '600' },
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
    cardTitle: {
        fontWeight: '600',
        marginBottom: 12,
        color: '#1f2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 4,
    },
    countBtn: { marginTop: 8 },
});
