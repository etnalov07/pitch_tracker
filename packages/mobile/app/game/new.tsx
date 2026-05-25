import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, Pressable } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from '../../src/utils/haptics';
import { OpponentTeam, Team } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchAllTeams, createGame } from '../../src/state';
import { opponentsApi } from '../../src/state/opponents/api/opponentsApi';
import { useToast } from '../../src/hooks/useToast';

export default function NewGameScreen() {
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();

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
    const [chartingMode, setChartingMode] = useState<'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting' | 'scrimmage'>(
        'our_pitcher'
    );
    const [scoutingFocus, setScoutingFocus] = useState<'both' | 'home' | 'away'>('both');
    // Game date+time stored as a single Date; rendered via Pressable + native picker (UX-NG-08/09).
    const initialDateTime = (() => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        return d;
    })();
    const [gameDateTime, setGameDateTime] = useState<Date>(initialDateTime);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [location, setLocation] = useState('');
    const [creating, setCreating] = useState(false);

    const isScoutingMode = chartingMode === 'scouting';
    const isScrimmageMode = chartingMode === 'scrimmage';

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
            toast.show({ message: 'Please select your team', type: 'error' });
            return;
        }
        if (isScoutingMode) {
            if (!opponentName.trim()) {
                toast.show({ message: 'Please enter the away team name', type: 'error' });
                return;
            }
            if (!scoutingHomeTeam.trim()) {
                toast.show({ message: 'Please enter the home team name', type: 'error' });
                return;
            }
        } else if (!isScrimmageMode && !opponentName.trim()) {
            // Scrimmage allows blank opponent — defaults to "Scrimmage" below.
            toast.show({ message: 'Please enter the opponent name', type: 'error' });
            return;
        }

        setCreating(true);
        try {
            // Scrimmage defaults: opponent_name -> "Scrimmage" if blank,
            // is_home_game forced true so deriveGameMode -> 'our_pitcher' every inning.
            const resolvedOpponentName = isScrimmageMode ? opponentName.trim() || 'Scrimmage' : opponentName.trim() || undefined;
            const resolvedIsHomeGame = isScrimmageMode ? true : isHomeGame;
            const newGame = await dispatch(
                createGame({
                    home_team_id: selectedTeamId,
                    opponent_name: resolvedOpponentName,
                    scouting_home_team: isScoutingMode ? scoutingHomeTeam.trim() : undefined,
                    is_home_game: resolvedIsHomeGame,
                    lineup_size: parseInt(lineupSize, 10),
                    total_innings: parseInt(totalInnings, 10),
                    charting_mode: chartingMode,
                    scouting_focus: isScoutingMode ? scoutingFocus : undefined,
                    game_date: gameDateTime.toISOString(),
                    location: location.trim() || undefined,
                    opponent_team_id: opponentTeamId || undefined,
                } as Parameters<typeof createGame>[0])
            ).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (isScoutingMode && scoutingFocus === 'both') {
                router.replace(`/game/${newGame.id}/scouting-lineup` as any);
            } else if (isScoutingMode || isScrimmageMode) {
                // Scrimmage skips my-lineup setup — coach picks a pitcher
                // from the pitcher modal once they're in live.
                router.replace(`/game/${newGame.id}/live` as any);
            } else {
                router.replace(`/game/${newGame.id}/my-lineup` as any);
            }
        } catch {
            toast.show({ message: 'Failed to create game', type: 'error' });
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
                        <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                            You need to create a team before starting a game.
                        </Text>
                        <Button mode="contained" onPress={() => router.push('/teams')} style={styles.emptyButton}>
                            Create Team
                        </Button>
                    </View>
                ) : (
                    <>
                        {/* Your Team */}
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
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

                        {/* Home / Away — hidden in scouting + scrimmage modes (both force our team fielding) */}
                        {!isScoutingMode && !isScrimmageMode && (
                            <>
                                <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
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
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
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
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
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
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                            Charting Mode
                        </Text>
                        <SegmentedButtons
                            value={chartingMode}
                            onValueChange={(value) => {
                                Haptics.selectionAsync();
                                setChartingMode(value as 'our_pitcher' | 'opp_pitcher' | 'both' | 'scouting' | 'scrimmage');
                            }}
                            buttons={[
                                { value: 'our_pitcher', label: 'Our P' },
                                { value: 'both', label: 'Both' },
                                { value: 'opp_pitcher', label: 'Opp P' },
                                { value: 'scouting', label: '🔍 Scout' },
                                { value: 'scrimmage', label: 'Scrim' },
                            ]}
                            style={styles.segmented}
                        />
                        {isScrimmageMode && (
                            <Text variant="bodySmall" style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
                                Intrasquad / practice: no fixed innings, no score, manual end-half.
                            </Text>
                        )}

                        {/* Scout Focus — shown only in scouting mode */}
                        {isScoutingMode && (
                            <>
                                <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onSurface }]}>
                                    Scout Which Team
                                </Text>
                                <SegmentedButtons
                                    value={scoutingFocus}
                                    onValueChange={(value) => {
                                        Haptics.selectionAsync();
                                        setScoutingFocus(value as 'both' | 'home' | 'away');
                                    }}
                                    buttons={[
                                        { value: 'both', label: 'Both' },
                                        { value: 'away', label: 'Away Pitcher' },
                                        { value: 'home', label: 'Home Pitcher' },
                                    ]}
                                    style={styles.segmented}
                                />
                            </>
                        )}

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
                                    testID="new-game-opponent-input"
                                    label={isScrimmageMode ? 'Opponent Name (optional)' : 'Opponent Name'}
                                    value={opponentName}
                                    onChangeText={(text) => {
                                        setOpponentName(text);
                                        setOpponentTeamId('');
                                    }}
                                    mode="outlined"
                                    placeholder={
                                        isScrimmageMode ? 'e.g., Red squad (defaults to "Scrimmage")' : 'e.g., Tigers, Eagles'
                                    }
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
                                                    { backgroundColor: theme.colors.surfaceVariant },
                                                    opponentTeamId === opp.id && styles.opponentChipSelected,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.opponentChipText,
                                                        { color: theme.colors.onSurface },
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

                        {/* Date + Time — native pickers (UX-NG-08/09) */}
                        <View style={styles.dateTimeRow}>
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setShowDatePicker(true);
                                }}
                                style={[
                                    styles.dateTimeButton,
                                    { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                                ]}
                                testID="new-game-date-picker"
                            >
                                <Text style={[styles.dateTimeLabel, { color: theme.colors.onSurfaceVariant }]}>Date</Text>
                                <Text style={[styles.dateTimeValue, { color: theme.colors.onSurface }]}>
                                    {gameDateTime.toLocaleDateString(undefined, {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setShowTimePicker(true);
                                }}
                                style={[
                                    styles.dateTimeButton,
                                    { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                                ]}
                                testID="new-game-time-picker"
                            >
                                <Text style={[styles.dateTimeLabel, { color: theme.colors.onSurfaceVariant }]}>Time</Text>
                                <Text style={[styles.dateTimeValue, { color: theme.colors.onSurface }]}>
                                    {gameDateTime.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </Text>
                            </Pressable>
                        </View>
                        {showDatePicker && (
                            <DateTimePicker
                                value={gameDateTime}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={(_event: DateTimePickerEvent, selected?: Date) => {
                                    // Android closes on selection; iOS inline stays open until user dismisses.
                                    if (Platform.OS !== 'ios') setShowDatePicker(false);
                                    if (selected) {
                                        const next = new Date(gameDateTime);
                                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                                        setGameDateTime(next);
                                    }
                                }}
                            />
                        )}
                        {Platform.OS === 'ios' && showDatePicker && (
                            <Button mode="text" onPress={() => setShowDatePicker(false)} compact>
                                Done
                            </Button>
                        )}
                        {showTimePicker && (
                            <DateTimePicker
                                value={gameDateTime}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_event: DateTimePickerEvent, selected?: Date) => {
                                    if (Platform.OS !== 'ios') setShowTimePicker(false);
                                    if (selected) {
                                        const next = new Date(gameDateTime);
                                        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                                        setGameDateTime(next);
                                    }
                                }}
                            />
                        )}
                        {Platform.OS === 'ios' && showTimePicker && (
                            <Button mode="text" onPress={() => setShowTimePicker(false)} compact>
                                Done
                            </Button>
                        )}

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
                            testID="new-game-create-button"
                            mode="contained"
                            onPress={handleCreate}
                            disabled={
                                !selectedTeamId ||
                                (!isScrimmageMode && !opponentName.trim()) ||
                                (isScoutingMode && !scoutingHomeTeam.trim()) ||
                                creating
                            }
                            loading={creating}
                            style={styles.createButton}
                            contentStyle={styles.createButtonContent}
                            icon="baseball"
                        >
                            {isScoutingMode ? 'Start Scouting' : isScrimmageMode ? 'Start Scrimmage' : 'Create Game'}
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
        marginBottom: 4,
    },
    helperText: {
        marginTop: -8,
        marginBottom: 4,
        fontSize: 12,
        fontStyle: 'italic',
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
    input: {},
    opponentChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    opponentChipSelected: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    opponentChipText: {
        fontSize: 13,
    },
    opponentChipTextSelected: {
        color: '#1d4ed8',
        fontWeight: '600',
    },
    dateTimeRow: { flexDirection: 'row', gap: 8 },
    dateTimeButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    dateTimeLabel: { fontSize: 11, marginBottom: 2 },
    dateTimeValue: { fontSize: 15, fontWeight: '600' },
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
        textAlign: 'center',
        marginBottom: 16,
    },
    emptyButton: {
        marginTop: 8,
    },
});
