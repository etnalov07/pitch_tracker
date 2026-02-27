import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Text, Button, useTheme, IconButton, Card, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { useAppDispatch, useAppSelector, fetchGameById, toggleHomeAway, startGame } from '../../../src/state';

export default function GameDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { selectedGame, loading, error } = useAppSelector((state) => state.games);

    useEffect(() => {
        if (id) {
            dispatch(fetchGameById(id));
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
                        <Text variant="bodySmall" style={{ color: '#ef4444', marginTop: 8 }}>
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
                return '#10b981';
            case 'cancelled':
                return '#ef4444';
            default:
                return '#6b7280';
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

    const [starting, setStarting] = useState(false);

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
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">Game Details</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Score Card */}
                <Card style={styles.scoreCard}>
                    <Card.Content>
                        <View style={styles.statusRow}>
                            <Chip compact textStyle={{ fontSize: 11, color: '#fff' }} style={{ backgroundColor: getStatusColor() }}>
                                {getStatusLabel()}
                            </Chip>
                            {game.status === 'in_progress' && (
                                <Text variant="bodySmall" style={styles.inningLabel}>
                                    {game.inning_half === 'top' ? '▲' : '▼'} Inning {game.current_inning}
                                </Text>
                            )}
                            {game.status === 'completed' && (
                                <Text variant="bodySmall" style={styles.inningLabel}>
                                    {game.current_inning} Innings
                                </Text>
                            )}
                            {!game.total_pitches && <IconButton icon="swap-horizontal" size={20} onPress={handleToggleHomeAway} />}
                        </View>

                        <View style={styles.scoreRow}>
                            <View style={styles.teamScore}>
                                <Text variant="titleMedium" style={styles.teamName}>
                                    {game.is_home_game === false ? game.home_team_name || 'Your Team' : 'Home'}
                                </Text>
                                <Text variant="displaySmall" style={[styles.score, { color: theme.colors.primary }]}>
                                    {game.is_home_game === false ? game.away_score : game.home_score}
                                </Text>
                            </View>

                            <Text variant="titleLarge" style={styles.vs}>
                                -
                            </Text>

                            <View style={styles.teamScore}>
                                <Text variant="titleMedium" style={styles.teamName}>
                                    {game.is_home_game === false ? 'Your Team' : game.opponent_name || 'Away'}
                                </Text>
                                <Text variant="displaySmall" style={[styles.score, { color: theme.colors.primary }]}>
                                    {game.is_home_game === false ? game.home_score : game.away_score}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* Game Info Card */}
                <Card style={styles.infoCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Game Info
                        </Text>
                        <Divider style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text variant="bodyMedium" style={styles.infoLabel}>
                                Date
                            </Text>
                            <Text variant="bodyMedium">{formatDate(game.game_date)}</Text>
                        </View>

                        {game.game_time && (
                            <View style={styles.infoRow}>
                                <Text variant="bodyMedium" style={styles.infoLabel}>
                                    Time
                                </Text>
                                <Text variant="bodyMedium">{game.game_time}</Text>
                            </View>
                        )}

                        {game.location && (
                            <View style={styles.infoRow}>
                                <Text variant="bodyMedium" style={styles.infoLabel}>
                                    Location
                                </Text>
                                <Text variant="bodyMedium">{game.location}</Text>
                            </View>
                        )}

                        <View style={styles.infoRow}>
                            <Text variant="bodyMedium" style={styles.infoLabel}>
                                Innings
                            </Text>
                            <Text variant="bodyMedium">{game.current_inning}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Actions */}
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
                    <Button
                        mode="outlined"
                        icon="eye"
                        onPress={handleLivePress}
                        style={styles.actionButton}
                        contentStyle={styles.actionButtonContent}
                    >
                        View Pitch Data
                    </Button>
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
        borderBottomColor: '#e5e7eb',
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
    scoreCard: {
        backgroundColor: '#ffffff',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    inningLabel: {
        color: '#6b7280',
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
        color: '#9ca3af',
        marginHorizontal: 16,
    },
    infoCard: {
        backgroundColor: '#ffffff',
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
        borderBottomColor: '#f3f4f6',
    },
    infoLabel: {
        color: '#6b7280',
    },
    actionButton: {
        marginTop: 8,
    },
    actionButtonContent: {
        paddingVertical: 8,
    },
});
