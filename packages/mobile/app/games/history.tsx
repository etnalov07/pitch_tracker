import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { useAppSelector, useAppDispatch, fetchAllGames } from '../../src/state';
import { Game } from '@pitch-tracker/shared';

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const GameRow: React.FC<{ game: Game; onPress: () => void }> = ({ game, onPress }) => {
    const homeScore = game.home_score ?? 0;
    const awayScore = game.away_score ?? 0;
    const isHome = game.is_home_game !== false;
    const myScore = isHome ? homeScore : awayScore;
    const oppScore = isHome ? awayScore : homeScore;
    const won = myScore > oppScore;
    const tied = myScore === oppScore;

    return (
        <Pressable onPress={onPress}>
            <Card style={styles.row}>
                <Card.Content style={styles.rowContent}>
                    <View style={styles.rowLeft}>
                        <Text style={styles.opponent}>
                            {game.charting_mode === 'scouting'
                                ? `${game.opponent_name || 'Away'} @ ${game.scouting_home_team || 'Home'}`
                                : `${isHome ? 'vs' : '@'} ${game.opponent_name || 'TBD'}`}
                        </Text>
                        <Text style={styles.date}>{formatDate(game.game_date)}</Text>
                    </View>
                    <View style={styles.rowRight}>
                        <Text style={[styles.score, { color: won ? '#10b981' : tied ? '#6b7280' : '#ef4444' }]}>
                            {myScore} – {oppScore}
                        </Text>
                        <Chip
                            compact
                            textStyle={{ fontSize: 10, color: '#fff' }}
                            style={{ backgroundColor: won ? '#10b981' : tied ? '#6b7280' : '#ef4444' }}
                        >
                            {won ? 'W' : tied ? 'T' : 'L'}
                        </Chip>
                    </View>
                </Card.Content>
            </Card>
        </Pressable>
    );
};

export default function GameHistoryScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { games, loading } = useAppSelector((state) => state.games);

    const completedGames = [...games]
        .filter((g) => g.status === 'completed')
        .sort((a, b) => {
            const da = new Date(a.game_date).getTime();
            const db = new Date(b.game_date).getTime();
            return db - da;
        });

    const handleRefresh = useCallback(() => {
        dispatch(fetchAllGames());
    }, [dispatch]);

    const handlePress = (game: Game) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/game/${game.id}` as any);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
            >
                {loading && completedGames.length === 0 ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
                ) : completedGames.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No completed games yet.</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.count}>{completedGames.length} completed games</Text>
                        {completedGames.map((game) => (
                            <GameRow key={game.id} game={game} onPress={() => handlePress(game)} />
                        ))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

export const unstable_settings = {
    initialRouteName: '(tabs)',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    count: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 12,
    },
    row: {
        backgroundColor: '#ffffff',
        marginBottom: 8,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    rowLeft: {
        flex: 1,
        gap: 2,
    },
    rowRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    opponent: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    date: {
        fontSize: 12,
        color: '#6b7280',
    },
    score: {
        fontSize: 16,
        fontWeight: '700',
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },
});
