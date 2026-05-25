import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, Card, Button, useTheme, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { useAppSelector, useAppDispatch, fetchAllGames, startGame, deleteGame } from '../../src/state';
import { useDeviceType } from '../../src/hooks/useDeviceType';
import { useToast } from '../../src/hooks/useToast';
import { useConfirm } from '../../src/hooks/useConfirm';
import { SyncStatusBadge, EmptyState } from '../../src/components/common';
import { PlayerDashboardScreen } from '../../src/components/playerDashboard';
import { Game } from '@pitch-tracker/shared';

const GameCard: React.FC<{ game: Game; onPress: () => void; onLongPress: () => void }> = ({ game, onPress, onLongPress }) => {
    const theme = useTheme();

    const getStatusColor = () => {
        switch (game.status) {
            case 'in_progress':
                return theme.colors.primary;
            case 'completed':
                return theme.colors.tertiary;
            default:
                return theme.colors.onSurfaceVariant;
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
        <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={400}>
            <Card>
                <Card.Content>
                    <View style={styles.gameHeader}>
                        <Text variant="titleMedium" numberOfLines={1} style={styles.gameTitle}>
                            {game.charting_mode === 'scouting'
                                ? `${game.opponent_name || 'Away'} @ ${game.scouting_home_team || 'Home'}`
                                : `${game.is_home_game === false ? '@' : 'vs'} ${game.opponent_name || 'TBD'}`}
                        </Text>
                        <Chip compact textStyle={{ fontSize: 10, color: '#fff' }} style={{ backgroundColor: getStatusColor() }}>
                            {getStatusLabel()}
                        </Chip>
                    </View>
                    <View style={styles.gameDetails}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatDate(game.game_date)}
                        </Text>
                        {game.status !== 'scheduled' && (
                            <Text variant="titleLarge" style={styles.score}>
                                {game.home_score ?? 0} - {game.away_score ?? 0}
                            </Text>
                        )}
                    </View>
                    {game.status === 'in_progress' && (
                        <Text variant="bodySmall" style={[styles.inningText, { color: theme.colors.onSurfaceVariant }]}>
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
    const toast = useToast();
    const confirm = useConfirm();
    const { user } = useAppSelector((state) => state.auth);
    const { games, loading } = useAppSelector((state) => state.games);
    const { isTablet } = useDeviceType();

    // Route on registration_type — players see their own stats / recent games
    // instead of the coach-shaped game-management surface. Mirrors web's
    // Dashboard router (packages/web/src/pages/Dashboard/Dashboard.tsx). NULL
    // falls through to the coach view so every pre-existing mobile user lands
    // exactly where they did before this slice. org_admin would also benefit
    // from a dedicated view, but that's a follow-up — mobile has no
    // OrgDashboard screen yet.
    if (user?.registration_type === 'player') {
        return <PlayerDashboardScreen />;
    }

    const loadGames = useCallback(() => {
        dispatch(fetchAllGames());
    }, [dispatch]);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    const activeGames = games.filter((g) => g.status === 'in_progress');
    const completedGames = games.filter((g) => g.status === 'completed');
    const recentGames = completedGames.slice(0, 5);
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

    const handleDeleteGame = async (game: Game) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const opponent =
            game.charting_mode === 'scouting'
                ? `${game.opponent_name || 'Away'} @ ${game.scouting_home_team || 'Home'}`
                : game.opponent_name || 'this game';
        const ok = await confirm({
            title: 'Delete game?',
            message: `Delete ${opponent}? This permanently removes all pitches, at-bats, lineups, and scoring data. This cannot be undone.`,
            destructive: true,
            confirmLabel: 'Delete',
        });
        if (!ok) return;
        try {
            await dispatch(deleteGame(game.id)).unwrap();
        } catch (err) {
            toast.show({
                message: err instanceof Error ? err.message : 'Failed to delete game',
                type: 'error',
            });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                            Active Games
                        </Text>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {activeGames.map((game) => (
                                <GameCard
                                    key={game.id}
                                    game={game}
                                    onPress={() => handleGamePress(game)}
                                    onLongPress={() => handleDeleteGame(game)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Scheduled Games Section */}
                {scheduledGames.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                            Upcoming Games
                        </Text>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {scheduledGames.map((game) => (
                                <Pressable
                                    key={game.id}
                                    onPress={() => handleGamePress(game)}
                                    onLongPress={() => handleDeleteGame(game)}
                                    delayLongPress={400}
                                >
                                    <Card>
                                        <Card.Content>
                                            <View style={styles.gameHeader}>
                                                <Text variant="titleMedium" numberOfLines={1} style={styles.gameTitle}>
                                                    {game.charting_mode === 'scouting'
                                                        ? `${game.opponent_name || 'Away'} @ ${game.scouting_home_team || 'Home'}`
                                                        : `${game.is_home_game === false ? '@' : 'vs'} ${game.opponent_name || 'TBD'}`}
                                                </Text>
                                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
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
                    <Card style={isTablet ? styles.cardTablet : undefined}>
                        <Card.Title title="Games" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                {games.length}
                            </Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                {activeGames.length} active, {completedGames.length} completed
                            </Text>
                        </Card.Content>
                    </Card>

                    <Card style={isTablet ? styles.cardTablet : undefined}>
                        <Card.Title title="Scheduled" />
                        <Card.Content>
                            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                                {scheduledGames.length}
                            </Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
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
                        <View style={styles.sectionHeader}>
                            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                                Recent Games
                            </Text>
                            {completedGames.length > 5 && (
                                <Pressable onPress={() => router.push('/games/history' as any)}>
                                    <Text style={[styles.viewAll, { color: theme.colors.primary }]}>
                                        View All ({completedGames.length})
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                        <View style={[styles.gameList, isTablet && styles.gameListTablet]}>
                            {recentGames.map((game) => (
                                <GameCard
                                    key={game.id}
                                    game={game}
                                    onPress={() => handleGamePress(game)}
                                    onLongPress={() => handleDeleteGame(game)}
                                />
                            ))}
                        </View>
                        {completedGames.length > 5 && (
                            <Pressable
                                style={[
                                    styles.viewAllButton,
                                    { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
                                ]}
                                onPress={() => router.push('/games/history' as any)}
                            >
                                <Text style={[styles.viewAllButtonText, { color: theme.colors.onPrimaryContainer }]}>
                                    View all {completedGames.length} games →
                                </Text>
                            </Pressable>
                        )}
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
                testID="dashboard-new-game-fab"
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {},
    viewAll: {
        fontSize: 13,
        fontWeight: '600',
    },
    viewAllButton: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    viewAllButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    gameList: {
        gap: 12,
    },
    gameListTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
    score: {
        fontWeight: 'bold',
    },
    inningText: {
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
    cardTablet: {
        flex: 1,
        minWidth: 280,
        maxWidth: '48%',
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
