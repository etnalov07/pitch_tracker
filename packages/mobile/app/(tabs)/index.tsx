import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, useTheme, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { useAppSelector, useAppDispatch, fetchAllGames, startGame } from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';
import { SyncStatusBadge, EmptyState } from '../../src/components/common';
import { Game } from '@pitch-tracker/shared';

const GameCard: React.FC<{ game: Game; onPress: () => void }> = ({ game, onPress }) => {
    const theme = useTheme();

    const getStatusColor = () => {
        switch (game.status) {
            case 'in_progress':
                return theme.colors.primary;
            case 'completed':
                return '#10b981';
            default:
                return '#6b7280';
        }
    };

    const getStatusLabel = () => {
        switch (game.status) {
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Completed';
            case 'scheduled':
                return 'Scheduled';
            default:
                return game.status;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <Pressable onPress={onPress}>
            <Card style={styles.gameCard}>
                <Card.Content>
                    <View style={styles.gameHeader}>
                        <Text variant="titleMedium" numberOfLines={1} style={styles.gameTitle}>
                            {game.is_home_game === false ? '@' : 'vs'} {game.opponent_name || 'TBD'}
                        </Text>
                        <Chip compact textStyle={{ fontSize: 10, color: '#fff' }} style={{ backgroundColor: getStatusColor() }}>
                            {getStatusLabel()}
                        </Chip>
                    </View>
                    <View style={styles.gameDetails}>
                        <Text variant="bodySmall" style={styles.gameDate}>
                            {formatDate(game.game_date)}
                        </Text>
                        {game.status !== 'scheduled' && (
                            <Text variant="titleLarge" style={styles.score}>
                                {game.home_score ?? 0} - {game.away_score ?? 0}
                            </Text>
                        )}
                    </View>
                    {game.status === 'in_progress' && (
                        <Text variant="bodySmall" style={styles.inningText}>
                            {game.inning_half === 'top' ? '▲' : '▼'} {game.current_inning || 1}
                        </Text>
                    )}
                </Card.Content>
            </Card>
        </Pressable>
    );
};

export default function DashboardScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { games, loading } = useAppSelector((state) => state.games);
    const { isTablet } = useDeviceType();

    const loadGames = useCallback(() => {
        dispatch(fetchAllGames());
    }, [dispatch]);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    const activeGames = games.filter((g) => g.status === 'in_progress');
    const recentGames = games.filter((g) => g.status === 'completed').slice(0, 5);
    const scheduledGames = games.filter((g) => g.status === 'scheduled').slice(0, 3);

    const [startingGameId, setStartingGameId] = useState<string | null>(null);

    const handleGamePress = (game: Game) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (game.status === 'in_progress') {
            router.push(`/game/${game.id}/live`);
        } else {
            router.push(`/game/${game.id}` as any);
        }
    };

    const handleStartGame = async (game: Game) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStartingGameId(game.id);
        try {
            await dispatch(startGame(game.id)).unwrap();
            router.push(`/game/${game.id}/live` as any);
        } catch (_err) {
            // Error handled by Redux slice
        } finally {
            setStartingGameId(null);
        }
    };

    const handleFabPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/game/new' as any);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadGames} />}
            >
                <View style={styles.headerRow}>
                    <Text variant="headlineSmall" style={styles.greeting}>
                        Welcome, {user?.first_name || 'Coach'}!
                    </Text>
                    <SyncStatusBadge />
                </View>

                {/* Active Games Section */}
                {activeGames.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Active Games
                        </Text>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {activeGames.map((game) => (
                                <GameCard key={game.id} game={game} onPress={() => handleGamePress(game)} />
                            ))}
                        </View>
                    </View>
                )}

                {/* Scheduled Games Section */}
                {scheduledGames.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Upcoming Games
                        </Text>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {scheduledGames.map((game) => (
                                <Pressable key={game.id} onPress={() => handleGamePress(game)}>
                                    <Card style={styles.gameCard}>
                                        <Card.Content>
                                            <View style={styles.gameHeader}>
                                                <Text variant="titleMedium" numberOfLines={1} style={styles.gameTitle}>
                                                    {game.is_home_game === false ? '@' : 'vs'} {game.opponent_name || 'TBD'}
                                                </Text>
                                                <Text variant="bodySmall" style={styles.gameDate}>
                                                    {new Date(game.game_date).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </Text>
                                            </View>
                                            <Button
                                                mode="contained"
                                                icon="play"
                                                loading={startingGameId === game.id}
                                                disabled={startingGameId !== null}
                                                onPress={() => handleStartGame(game)}
                                                compact
                                                style={{ marginTop: 8 }}
                                            >
                                                Start Game
                                            </Button>
                                        </Card.Content>
                                    </Card>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* Stats Cards */}
                <View style={[styles.cardGrid, isTablet && styles.cardGridTablet]}>
                    <Card style={[styles.card, isTablet && styles.cardTablet]}>
                        <Card.Title title="Games" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                {games.length}
                            </Text>
                            <Text variant="bodyMedium" style={styles.cardSubtext}>
                                {activeGames.length} active, {recentGames.length} completed
                            </Text>
                        </Card.Content>
                    </Card>

                    <Card style={[styles.card, isTablet && styles.cardTablet]}>
                        <Card.Title title="Scheduled" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                {scheduledGames.length}
                            </Text>
                            <Text variant="bodyMedium" style={styles.cardSubtext}>
                                Upcoming games
                            </Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button onPress={() => router.push('/teams')}>View Schedule</Button>
                        </Card.Actions>
                    </Card>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <Button
                        mode="outlined"
                        icon="baseball-bat"
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push('/bullpen/new' as any);
                        }}
                        style={styles.quickAction}
                    >
                        Start Bullpen
                    </Button>
                    <Button
                        mode="outlined"
                        icon="magnify"
                        onPress={() => router.push('/join-team' as any)}
                        style={styles.quickAction}
                    >
                        Find a Team
                    </Button>
                </View>

                {/* Recent Games Section */}
                {recentGames.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Recent Games
                        </Text>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {recentGames.map((game) => (
                                <GameCard key={game.id} game={game} onPress={() => handleGamePress(game)} />
                            ))}
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {games.length === 0 && !loading && (
                    <EmptyState
                        icon="baseball"
                        title="No games yet"
                        message="Create a team and start tracking your games"
                        actionLabel="Get Started"
                        onAction={() => router.push('/teams')}
                    />
                )}
            </ScrollView>

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color={theme.colors.onPrimary}
                onPress={handleFabPress}
                label={isTablet ? 'New Game' : undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 80,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 12,
        color: '#374151',
    },
    gameList: {
        gap: 12,
    },
    gameListTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gameCard: {
        backgroundColor: '#ffffff',
    },
    gameHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    gameTitle: {
        flex: 1,
        marginRight: 8,
    },
    gameDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    gameDate: {
        color: '#6b7280',
    },
    score: {
        fontWeight: 'bold',
    },
    inningText: {
        color: '#6b7280',
        marginTop: 4,
    },
    cardGrid: {
        gap: 16,
        marginBottom: 24,
    },
    cardGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    card: {
        backgroundColor: '#ffffff',
    },
    cardTablet: {
        flex: 1,
        minWidth: 280,
        maxWidth: '48%',
    },
    cardSubtext: {
        color: '#6b7280',
        marginTop: 4,
    },
    emptyCard: {
        backgroundColor: '#ffffff',
        marginTop: 20,
    },
    emptyContent: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: 16,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 24,
    },
    quickAction: {
        flex: 1,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
});
