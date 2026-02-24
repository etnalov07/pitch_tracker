import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { Team } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../src/state';

export default function NewGameScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { user } = useAppSelector((state) => state.auth);
    const teams = useAppSelector((state) => state.teams.teams) || [];
    const [loadingTeams, setLoadingTeams] = useState(true);

    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [isHomeGame, setIsHomeGame] = useState(true);
    const [opponentName, setOpponentName] = useState('');
    const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
    const [gameTime, setGameTime] = useState('18:00');
    const [location, setLocation] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        dispatch(fetchAllTeams()).finally(() => setLoadingTeams(false));
    }, [dispatch]);

    // Filter to user's teams and auto-select if only one
    const userTeams = teams.filter((t) => t.owner_id === user?.id);

    useEffect(() => {
        if (userTeams.length === 1 && !selectedTeamId) {
            setSelectedTeamId(userTeams[0].id);
        }
    }, [userTeams, selectedTeamId]);

    const handleCreate = async () => {
        if (!selectedTeamId) {
            Alert.alert('Missing Info', 'Please select your team');
            return;
        }
        if (!opponentName.trim()) {
            Alert.alert('Missing Info', 'Please enter the opponent name');
            return;
        }

        setCreating(true);
        try {
            const gameDateTime = new Date(`${gameDate}T${gameTime}`);
            const newGame = await dispatch(
                createGame({
                    home_team_id: selectedTeamId,
                    opponent_name: opponentName.trim(),
                    is_home_game: isHomeGame,
                    game_date: gameDateTime.toISOString(),
                    location: location.trim() || undefined,
                })
            ).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game/${newGame.id}/lineup` as any);
        } catch {
            Alert.alert('Error', 'Failed to create game');
        } finally {
            setCreating(false);
        }
    };

    const getTeamLabel = (team: Team) => {
        return `${team.city ? team.city + ' ' : ''}${team.name}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="titleLarge">New Game</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {loadingTeams ? (
                    <ActivityIndicator style={{ marginVertical: 40 }} />
                ) : userTeams.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text variant="titleMedium" style={styles.emptyTitle}>
                            No Teams Found
                        </Text>
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            You need to create a team before starting a game.
                        </Text>
                        <Button mode="contained" onPress={() => router.push('/teams')} style={styles.emptyButton}>
                            Create Team
                        </Button>
                    </View>
                ) : (
                    <>
                        {/* Your Team */}
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Your Team
                        </Text>
                        <View style={styles.chipGrid}>
                            {userTeams.map((team) => (
                                <Button
                                    key={team.id}
                                    mode={selectedTeamId === team.id ? 'contained' : 'outlined'}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedTeamId(team.id);
                                    }}
                                    compact
                                    style={styles.teamButton}
                                >
                                    {getTeamLabel(team)}
                                </Button>
                            ))}
                        </View>

                        {/* Home / Away */}
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Home / Away
                        </Text>
                        <SegmentedButtons
                            value={isHomeGame ? 'home' : 'away'}
                            onValueChange={(value) => {
                                Haptics.selectionAsync();
                                setIsHomeGame(value === 'home');
                            }}
                            buttons={[
                                { value: 'home', label: 'Home' },
                                { value: 'away', label: 'Away' },
                            ]}
                            style={styles.segmented}
                        />

                        {/* Opponent */}
                        <TextInput
                            label="Opponent Name"
                            value={opponentName}
                            onChangeText={setOpponentName}
                            mode="outlined"
                            placeholder="e.g., Tigers, Eagles"
                            style={styles.input}
                        />

                        {/* Date */}
                        <TextInput
                            label="Game Date"
                            value={gameDate}
                            onChangeText={setGameDate}
                            mode="outlined"
                            placeholder="YYYY-MM-DD"
                            style={styles.input}
                        />

                        {/* Time */}
                        <TextInput
                            label="Game Time"
                            value={gameTime}
                            onChangeText={setGameTime}
                            mode="outlined"
                            placeholder="HH:MM"
                            style={styles.input}
                        />

                        {/* Location */}
                        <TextInput
                            label="Location (optional)"
                            value={location}
                            onChangeText={setLocation}
                            mode="outlined"
                            placeholder="e.g., Main Field"
                            style={styles.input}
                        />

                        {/* Create Button */}
                        <Button
                            mode="contained"
                            onPress={handleCreate}
                            disabled={!selectedTeamId || !opponentName.trim() || creating}
                            loading={creating}
                            style={styles.createButton}
                            contentStyle={styles.createButtonContent}
                            icon="baseball"
                        >
                            Create Game
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
        borderBottomColor: '#e5e7eb',
    },
    content: {
        padding: 16,
        gap: 16,
    },
    sectionLabel: {
        color: '#374151',
        marginBottom: 4,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    teamButton: {
        marginBottom: 0,
    },
    segmented: {
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#ffffff',
    },
    createButton: {
        marginTop: 8,
    },
    createButtonContent: {
        paddingVertical: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        marginBottom: 8,
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyButton: {
        marginTop: 8,
    },
});
