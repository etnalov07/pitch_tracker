import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button, useTheme, IconButton, Card, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import {
    useAppDispatch,
    useAppSelector,
    fetchGameById,
    toggleHomeAway,
    startGame,
    fetchOpponentLineup,
    fetchMyTeamLineup,
} from '../../../src/state';

export default function GameDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { selectedGame, loading, error, opponentLineup, myTeamLineup } = useAppSelector((state) => state.games);
    // All hooks must be declared before any conditional early-return below.
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (id) {
            dispatch(fetchGameById(id));
            dispatch(fetchOpponentLineup(id));
            dispatch(fetchMyTeamLineup(id));
        }
    }, [id, dispatch]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Game Details</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            </SafeAreaView>
        );
    }

    if (!selectedGame) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Game Details</Text>
                    <View style={{ width: 48 }} />
                </View>
                <View style={styles.centered}>
                    <Text variant="bodyLarge">Game not found</Text>
                    {error && (
                        <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8 }}>
                            {error}
                        </Text>
                    )}
                    <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 16 }}>
                        Go Back
                    </Button>
                    <Button mode="outlined" onPress={() => id && dispatch(fetchGameById(id))} style={{ marginTop: 8 }}>
                        Retry
                    </Button>
                </View>
            </SafeAreaView>
        );
    }

    const game = selectedGame;

    const getStatusColor = () => {
        switch (game.status) {
            case 'in_progress':
                return theme.colors.primary;
            case 'completed':
                return theme.colors.tertiary;
            case 'cancelled':
                return theme.colors.error;
            default:
                return theme.colors.onSurfaceVariant;
        }
    };

    const getStatusLabel = () => {
        switch (game.status) {
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Final';
            case 'scheduled':
                return 'Scheduled';
            case 'cancelled':
                return 'Cancelled';
            default:
                return game.status;
        }
    };

    const handleLivePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/game/${id}/live`);
    };

    const handleStartGame = async () => {
        if (!id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStarting(true);
        try {
            await dispatch(startGame(id)).unwrap();
            router.push(`/game/${id}/live` as any);
        } catch (_err) {
            // Error handled by Redux slice
        } finally {
            setStarting(false);
        }
    };

    const handleToggleHomeAway = async () => {
        if (!id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await dispatch(toggleHomeAway(id));
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Game Details</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Score Card */}
                <Card>
                    <Card.Content>
                        <View style={styles.statusRow}>
                            <Chip compact textStyle={{ fontSize: 11, color: '#fff' }} style={{ backgroundColor: getStatusColor() }}>
                                {getStatusLabel()}
                            </Chip>
                            {game.status === 'in_progress' && (
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {game.inning_half === 'top' ? '▲' : '▼'} Inning {game.current_inning}
                                </Text>
                            )}
                            {game.status === 'completed' && (
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    {game.current_inning} Innings
                                </Text>
                            )}
                            {!game.total_pitches && <IconButton icon="swap-horizontal" size={20} onPress={handleToggleHomeAway} />}
                        </View>

                        <View style={styles.scoreRow}>
                            {/* Scoreboard convention: visitor on the left, home on the right.
                                Note: home_team_id / home_score in the DB always refer to the USER's
                                team, regardless of is_home_game. The is_home_game flag only controls
                                who bats top vs bottom — it does NOT swap the column meanings. */}
                            <View style={styles.teamScore}>
                                <Text variant="titleMedium" style={styles.teamName}>
                                    {game.charting_mode === 'scouting'
                                        ? game.opponent_name || 'Away'
                                        : game.is_home_game === false
                                          ? game.home_team_name || 'Your Team'
                                          : game.opponent_name || 'Away'}
                                </Text>
                                <Text variant="displaySmall" style={[styles.score, { color: theme.colors.primary }]}>
                                    {game.is_home_game === false ? game.home_score : game.away_score}
                                </Text>
                            </View>

                            <Text variant="titleLarge" style={[styles.vs, { color: theme.colors.onSurfaceVariant }]}>
                                -
                            </Text>

                            <View style={styles.teamScore}>
                                <Text variant="titleMedium" style={styles.teamName}>
                                    {game.charting_mode === 'scouting'
                                        ? game.scouting_home_team || 'Home'
                                        : game.is_home_game === false
                                          ? game.opponent_name || 'Away'
                                          : game.home_team_name || 'Your Team'}
                                </Text>
                                <Text variant="displaySmall" style={[styles.score, { color: theme.colors.primary }]}>
                                    {game.is_home_game === false ? game.away_score : game.home_score}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Game Info Card */}
                <Card>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Game Info
                        </Text>
                        <Divider style={styles.divider} />

                        <View style={[styles.infoRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                Date
                            </Text>
                            <Text variant="bodyMedium">{formatDate(game.game_date)}</Text>
                        </View>

                        {game.game_time && (
                            <View style={[styles.infoRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Time
                                </Text>
                                <Text variant="bodyMedium">{game.game_time}</Text>
                            </View>
                        )}

                        {game.location && (
                            <View style={[styles.infoRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Location
                                </Text>
                                <Text variant="bodyMedium">{game.location}</Text>
                            </View>
                        )}

                        <View style={[styles.infoRow, { borderBottomColor: theme.colors.surfaceVariant }]}>
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                                Innings
                            </Text>
                            <Text variant="bodyMedium">{game.current_inning}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Actions */}
                {game.status === 'scheduled' &&
                    game.charting_mode !== 'scouting' &&
                    game.charting_mode !== 'opp_pitcher' &&
                    opponentLineup.length === 0 && (
                        <Button
                            mode="outlined"
                            icon="account-group"
                            onPress={() => router.push(`/game/${id}/lineup` as any)}
                            style={styles.actionButton}
                            contentStyle={styles.actionButtonContent}
                        >
                            Setup Opponent Lineup
                        </Button>
                    )}
                {game.status === 'scheduled' &&
                    game.charting_mode !== 'scouting' &&
                    game.charting_mode !== 'our_pitcher' &&
                    myTeamLineup.length === 0 && (
                        <Button
                            mode="outlined"
                            icon="account-group-outline"
                            onPress={() => router.push(`/game/${id}/my-lineup` as any)}
                            style={styles.actionButton}
                            contentStyle={styles.actionButtonContent}
                        >
                            Setup My Lineup
                        </Button>
                    )}
                {game.status === 'scheduled' && (
                    <Button
                        mode="contained"
                        icon="play"
                        loading={starting}
                        disabled={starting}
                        onPress={handleStartGame}
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                    >
                        Start Game
                    </Button>
                )}

                {game.status === 'in_progress' && (
                    <Button
                        mode="contained"
                        icon="baseball"
                        onPress={handleLivePress}
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                    >
                        Go to Live View
                    </Button>
                )}

                {game.status === 'completed' && (
                    <>
                        <Button
                            mode="contained"
                            icon="chart-box-outline"
                            onPress={() => router.push(`/game/${id}/performance-summary` as any)}
                            style={styles.actionButton}
                            contentStyle={styles.actionButtonContent}
                        >
                            View Performance Summary
                        </Button>
                        <Button
                            mode="outlined"
                            icon="eye"
                            onPress={handleLivePress}
                            style={styles.actionButton}
                            contentStyle={styles.actionButtonContent}
                        >
                            View Pitch Data
                        </Button>
                        <Button
                            mode="outlined"
                            icon="play-circle-outline"
                            onPress={() => router.push(`/game/${id}/replay` as any)}
                            style={styles.actionButton}
                            contentStyle={styles.actionButtonContent}
                        >
                            Replay Game
                        </Button>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 16,
        gap: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    teamScore: {
        alignItems: 'center',
        flex: 1,
    },
    teamName: {
        textAlign: 'center',
        marginBottom: 8,
    },
    score: {
        fontWeight: 'bold',
    },
    vs: {
        marginHorizontal: 16,
    },
    sectionTitle: {
        marginBottom: 8,
    },
    divider: {
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    actionButton: {
        marginTop: 8,
    },
    actionButtonContent: {
        paddingVertical: 8,
    },
});
