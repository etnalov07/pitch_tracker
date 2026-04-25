import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from '../../src/utils/haptics';
import { OpponentTeam, Team } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../src/state';
import { opponentsApi } from '../../src/state/opponents/api/opponentsApi';

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
    const [opponentTeamId, setOpponentTeamId] = useState<string>('');
    const [knownOpponents, setKnownOpponents] = useState<OpponentTeam[]>([]);
    const [scoutingHomeTeam, setScoutingHomeTeam] = useState('');
    const [lineupSize, setLineupSize] = useState('9');
    const [totalInnings, setTotalInnings] = useState('7');
    const [chartingMode, setChartingMode] = useState<'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting'>('our_pitcher');
    const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
    const [gameTime, setGameTime] = useState('18:00');
    const [location, setLocation] = useState('');
    const [creating, setCreating] = useState(false);

    const isScoutingMode = chartingMode === 'scouting';

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

    // Auto-set innings default based on team type
    useEffect(() => {
        if (!selectedTeamId) return;
        const team = userTeams.find((t) => t.id === selectedTeamId);
        if (team?.team_type === 'college') {
            setTotalInnings('9');
        } else {
            setTotalInnings('7');
        }
    }, [selectedTeamId, userTeams]);

    // Load known opponents when team is selected
    useEffect(() => {
        if (!selectedTeamId) {
            setKnownOpponents([]);
            return;
        }
        opponentsApi
            .list(selectedTeamId)
            .then(setKnownOpponents)
            .catch(() => {});
    }, [selectedTeamId]);

    const handleCreate = async () => {
        if (!selectedTeamId) {
            Alert.alert('Missing Info', 'Please select your team');
            return;
        }
        if (isScoutingMode) {
            if (!opponentName.trim()) {
                Alert.alert('Missing Info', 'Please enter the away team name');
                return;
            }
            if (!scoutingHomeTeam.trim()) {
                Alert.alert('Missing Info', 'Please enter the home team name');
                return;
            }
        } else if (!opponentName.trim()) {
            Alert.alert('Missing Info', 'Please enter the opponent name');
            return;
        }

        setCreating(true);
        try {
            const gameDateTime = new Date(`${gameDate}T${gameTime}`);
            const newGame = await dispatch(
                createGame({
                    home_team_id: selectedTeamId,
                    opponent_name: opponentName.trim() || undefined,
                    scouting_home_team: isScoutingMode ? scoutingHomeTeam.trim() : undefined,
                    is_home_game: isHomeGame,
                    lineup_size: parseInt(lineupSize, 10),
                    total_innings: parseInt(totalInnings, 10),
                    charting_mode: chartingMode,
                    game_date: gameDateTime.toISOString(),
                    location: location.trim() || undefined,
                    opponent_team_id: opponentTeamId || undefined,
                } as Parameters<typeof createGame>[0])
            ).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (isScoutingMode) {
                router.replace(`/game/${newGame.id}/live` as any);
            } else {
                router.replace(`/game/${newGame.id}/my-lineup` as any);
            }
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

                        {/* Home / Away — hidden in scouting mode */}
                        {!isScoutingMode && (
                            <>
                                <Text variant="labelLarge" style={styles.sectionLabel}>
                                    Your team is playing:
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
                            </>
                        )}

                        {/* Lineup Size */}
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Lineup Size
                        </Text>
                        <SegmentedButtons
                            value={lineupSize}
                            onValueChange={(value) => {
                                Haptics.selectionAsync();
                                setLineupSize(value);
                            }}
                            buttons={[
                                { value: '9', label: '9' },
                                { value: '10', label: '10 (EH)' },
                                { value: '11', label: '11' },
                                { value: '12', label: '12' },
                            ]}
                            style={styles.segmented}
                        />

                        {/* Total Innings */}
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Innings
                        </Text>
                        <SegmentedButtons
                            value={totalInnings}
                            onValueChange={(value) => {
                                Haptics.selectionAsync();
                                setTotalInnings(value);
                            }}
                            buttons={[
                                { value: '5', label: '5' },
                                { value: '6', label: '6' },
                                { value: '7', label: '7' },
                                { value: '9', label: '9' },
                            ]}
                            style={styles.segmented}
                        />

                        {/* Charting Mode */}
                        <Text variant="labelLarge" style={styles.sectionLabel}>
                            Charting Mode
                        </Text>
                        <SegmentedButtons
                            value={chartingMode}
                            onValueChange={(value) => {
                                Haptics.selectionAsync();
                                setChartingMode(value as 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting');
                            }}
                            buttons={[
                                { value: 'our_pitcher', label: 'Our P' },
                                { value: 'both', label: 'Both' },
                                { value: 'opp_pitcher', label: 'Opp P' },
                                { value: 'scouting', label: '🔍 Scout' },
                            ]}
                            style={styles.segmented}
                        />

                        {/* Team names — conditional based on scouting mode */}
                        {isScoutingMode ? (
                            <>
                                <TextInput
                                    label="Away Team"
                                    value={opponentName}
                                    onChangeText={setOpponentName}
                                    mode="outlined"
                                    placeholder="e.g., Eagles"
                                    style={styles.input}
                                />
                                <TextInput
                                    label="Home Team"
                                    value={scoutingHomeTeam}
                                    onChangeText={setScoutingHomeTeam}
                                    mode="outlined"
                                    placeholder="e.g., Tigers"
                                    style={styles.input}
                                />
                            </>
                        ) : (
                            <>
                                <TextInput
                                    label="Opponent Name"
                                    value={opponentName}
                                    onChangeText={(text) => {
                                        setOpponentName(text);
                                        setOpponentTeamId('');
                                    }}
                                    mode="outlined"
                                    placeholder="e.g., Tigers, Eagles"
                                    style={styles.input}
                                />
                                {knownOpponents.length > 0 && (
                                    <View style={styles.chipGrid}>
                                        {knownOpponents.map((opp) => (
                                            <TouchableOpacity
                                                key={opp.id}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setOpponentName(opp.name);
                                                    setOpponentTeamId(opp.id);
                                                }}
                                                style={[
                                                    styles.opponentChip,
                                                    opponentTeamId === opp.id && styles.opponentChipSelected,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.opponentChipText,
                                                        opponentTeamId === opp.id && styles.opponentChipTextSelected,
                                                    ]}
                                                >
                                                    {opp.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

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
                            disabled={
                                !selectedTeamId || !opponentName.trim() || (isScoutingMode && !scoutingHomeTeam.trim()) || creating
                            }
                            loading={creating}
                            style={styles.createButton}
                            contentStyle={styles.createButtonContent}
                            icon="baseball"
                        >
                            {isScoutingMode ? 'Start Scouting' : 'Create Game'}
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
    opponentChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#d1d5db',
        backgroundColor: '#f9fafb',
    },
    opponentChipSelected: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    opponentChipText: {
        fontSize: 13,
        color: '#374151',
    },
    opponentChipTextSelected: {
        color: '#1d4ed8',
        fontWeight: '600',
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
