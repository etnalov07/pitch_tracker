import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, Menu, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import {
    Game,
    SCOUTING_POSITIONS,
    ScoutingLineupEntry,
    emptyScoutingLineup,
    buildScoutingLineupPayload,
} from '@pitch-tracker/shared';
import { useAppDispatch, fetchGameById, createOpponentLineup, createOpposingPitcher } from '../../../src/state';
import { gamesApi } from '../../../src/state/games/api/gamesApi';

const POSITIONS = SCOUTING_POSITIONS;
type LineupEntry = ScoutingLineupEntry;
type TeamSide = 'away' | 'home';
const emptyLineup = emptyScoutingLineup;

export default function ScoutingLineupScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSide, setActiveSide] = useState<TeamSide>('away');

    const [awayLineup, setAwayLineup] = useState<LineupEntry[]>(emptyLineup(9));
    const [awayPitcher, setAwayPitcher] = useState('');
    const [awayPitcherJersey, setAwayPitcherJersey] = useState('');
    const [awayPitcherThrows, setAwayPitcherThrows] = useState<'R' | 'L'>('R');
    const [awaySaved, setAwaySaved] = useState(false);
    const [awayPitcherId, setAwayPitcherId] = useState<string | null>(null);
    const [awaySubmitting, setAwaySubmitting] = useState(false);

    const [homeLineup, setHomeLineup] = useState<LineupEntry[]>(emptyLineup(9));
    const [homePitcher, setHomePitcher] = useState('');
    const [homePitcherJersey, setHomePitcherJersey] = useState('');
    const [homePitcherThrows, setHomePitcherThrows] = useState<'R' | 'L'>('R');
    const [homeSaved, setHomeSaved] = useState(false);
    const [homePitcherId, setHomePitcherId] = useState<string | null>(null);
    const [homeSubmitting, setHomeSubmitting] = useState(false);

    const [positionMenuIndex, setPositionMenuIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!id) return;
        dispatch(fetchGameById(id))
            .unwrap()
            .then((g) => {
                setGame(g);
                const size = g.lineup_size ?? 9;
                setAwayLineup(emptyLineup(size));
                setHomeLineup(emptyLineup(size));
            })
            .catch(() => Alert.alert('Error', 'Failed to load game'))
            .finally(() => setLoading(false));
    }, [dispatch, id]);

    const goToGame = () => router.replace(`/game/${id}/live` as any);

    const handleLineupChange = (side: TeamSide, index: number, field: keyof LineupEntry, value: string) => {
        const setter = side === 'away' ? setAwayLineup : setHomeLineup;
        setter((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSave = async (side: TeamSide) => {
        if (!id || !game) return;
        const lineup = side === 'away' ? awayLineup : homeLineup;
        const pitcherName = side === 'away' ? awayPitcher : homePitcher;
        const pitcherJersey = side === 'away' ? awayPitcherJersey : homePitcherJersey;
        const pitcherThrows = side === 'away' ? awayPitcherThrows : homePitcherThrows;
        const teamName = side === 'away' ? (game.opponent_name ?? 'Away') : (game.scouting_home_team ?? 'Home');

        const filledPlayers = buildScoutingLineupPayload(lineup, side);

        if (filledPlayers.length === 0 && !pitcherName.trim()) {
            Alert.alert('Nothing to Save', 'Enter at least one player or pitcher name');
            return;
        }

        const setSubmitting = side === 'away' ? setAwaySubmitting : setHomeSubmitting;
        const setSaved = side === 'away' ? setAwaySaved : setHomeSaved;
        const existingPitcherId = side === 'away' ? awayPitcherId : homePitcherId;
        const setPitcherId = side === 'away' ? setAwayPitcherId : setHomePitcherId;
        setSubmitting(true);

        try {
            if (filledPlayers.length > 0) {
                await dispatch(createOpponentLineup({ gameId: id, players: filledPlayers })).unwrap();
            }
            if (pitcherName.trim()) {
                const pitcherParams = {
                    game_id: id,
                    team_name: teamName,
                    pitcher_name: pitcherName.trim(),
                    jersey_number: pitcherJersey.trim() ? parseInt(pitcherJersey.trim(), 10) : null,
                    throws: pitcherThrows,
                    team_side: side,
                };
                if (existingPitcherId) {
                    await gamesApi.updateOpposingPitcher(existingPitcherId, pitcherParams);
                } else {
                    const pitcher = await dispatch(createOpposingPitcher(pitcherParams)).unwrap();
                    setPitcherId(pitcher.id);
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSaved(true);
            if (side === 'away' && !homeSaved) {
                setActiveSide('home');
            }
        } catch {
            Alert.alert('Error', `Failed to save ${side} lineup`);
        } finally {
            setSubmitting(false);
        }
    };

    const renderLineupForm = (side: TeamSide) => {
        const lineup = side === 'away' ? awayLineup : homeLineup;
        const pitcher = side === 'away' ? awayPitcher : homePitcher;
        const pitcherJersey = side === 'away' ? awayPitcherJersey : homePitcherJersey;
        const pitcherThrows = side === 'away' ? awayPitcherThrows : homePitcherThrows;
        const saved = side === 'away' ? awaySaved : homeSaved;
        const submitting = side === 'away' ? awaySubmitting : homeSubmitting;
        const teamName = side === 'away' ? (game?.opponent_name ?? 'Away') : (game?.scouting_home_team ?? 'Home');

        return (
            <View>
                <Text variant="bodySmall" style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                    Enter {teamName}&apos;s starting lineup. Leave rows blank for players you don&apos;t know yet.
                </Text>

                {/* Starting Pitcher */}
                <View style={[styles.pitcherSection, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Starting Pitcher
                    </Text>
                    <TextInput
                        label="Pitcher Name"
                        value={pitcher}
                        onChangeText={(v) => (side === 'away' ? setAwayPitcher(v) : setHomePitcher(v))}
                        mode="outlined"
                        placeholder="e.g. Smith"
                        style={styles.nameInput}
                        dense
                    />
                    <View style={styles.pitcherBottomRow}>
                        <TextInput
                            label="Jersey #"
                            value={pitcherJersey}
                            onChangeText={(v) => (side === 'away' ? setAwayPitcherJersey(v) : setHomePitcherJersey(v))}
                            mode="outlined"
                            keyboardType="numeric"
                            style={styles.jerseyInput}
                            dense
                        />
                        <View style={styles.throwsContainer}>
                            <Text variant="bodySmall" style={[styles.throwsLabel, { color: theme.colors.onSurfaceVariant }]}>
                                Throws
                            </Text>
                            <SegmentedButtons
                                value={pitcherThrows}
                                onValueChange={(v) =>
                                    side === 'away' ? setAwayPitcherThrows(v as 'R' | 'L') : setHomePitcherThrows(v as 'R' | 'L')
                                }
                                buttons={[
                                    {
                                        value: 'R',
                                        label: 'R',
                                        checkedColor: '#ffffff',
                                        style: pitcherThrows === 'R' ? styles.batsSelected : styles.batsUnselected,
                                        labelStyle:
                                            pitcherThrows === 'R'
                                                ? styles.batsLabelSelected
                                                : [styles.batsLabelUnselected, { color: theme.colors.onSurface }],
                                    },
                                    {
                                        value: 'L',
                                        label: 'L',
                                        checkedColor: '#ffffff',
                                        style: pitcherThrows === 'L' ? styles.batsSelected : styles.batsUnselected,
                                        labelStyle:
                                            pitcherThrows === 'L'
                                                ? styles.batsLabelSelected
                                                : [styles.batsLabelUnselected, { color: theme.colors.onSurface }],
                                    },
                                ]}
                                style={styles.batsToggle}
                                density="small"
                            />
                        </View>
                    </View>
                </View>

                {/* Batting Order */}
                <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Batting Order
                </Text>
                {lineup.map((entry, index) => (
                    <View key={index} style={styles.row}>
                        <View style={styles.orderBadge}>
                            <Text variant="titleMedium" style={styles.orderText}>
                                {entry.batting_order}
                            </Text>
                        </View>
                        <View style={styles.rowFields}>
                            <TextInput
                                label="Player Name"
                                value={entry.player_name}
                                onChangeText={(v) => handleLineupChange(side, index, 'player_name', v)}
                                mode="outlined"
                                placeholder={`Batter ${entry.batting_order}`}
                                style={styles.nameInput}
                                dense
                            />
                            <View style={styles.bottomRow}>
                                <Menu
                                    visible={positionMenuIndex === index}
                                    onDismiss={() => setPositionMenuIndex(null)}
                                    anchor={
                                        <Button
                                            mode="outlined"
                                            onPress={() => setPositionMenuIndex(index)}
                                            compact
                                            style={styles.positionButton}
                                            labelStyle={styles.positionLabel}
                                        >
                                            {entry.position || 'Pos'}
                                        </Button>
                                    }
                                >
                                    <Menu.Item
                                        onPress={() => {
                                            handleLineupChange(side, index, 'position', '');
                                            setPositionMenuIndex(null);
                                        }}
                                        title="--"
                                    />
                                    {POSITIONS.map((pos) => (
                                        <Menu.Item
                                            key={pos}
                                            onPress={() => {
                                                handleLineupChange(side, index, 'position', pos);
                                                setPositionMenuIndex(null);
                                            }}
                                            title={pos}
                                        />
                                    ))}
                                </Menu>
                                <SegmentedButtons
                                    value={entry.bats}
                                    onValueChange={(v) => {
                                        Haptics.selectionAsync();
                                        handleLineupChange(side, index, 'bats', v);
                                    }}
                                    buttons={[
                                        {
                                            value: 'R',
                                            label: 'R',
                                            checkedColor: '#ffffff',
                                            style: entry.bats === 'R' ? styles.batsSelected : styles.batsUnselected,
                                            labelStyle:
                                                entry.bats === 'R'
                                                    ? styles.batsLabelSelected
                                                    : [styles.batsLabelUnselected, { color: theme.colors.onSurface }],
                                        },
                                        {
                                            value: 'L',
                                            label: 'L',
                                            checkedColor: '#ffffff',
                                            style: entry.bats === 'L' ? styles.batsSelected : styles.batsUnselected,
                                            labelStyle:
                                                entry.bats === 'L'
                                                    ? styles.batsLabelSelected
                                                    : [styles.batsLabelUnselected, { color: theme.colors.onSurface }],
                                        },
                                        {
                                            value: 'S',
                                            label: 'S',
                                            checkedColor: '#ffffff',
                                            style: entry.bats === 'S' ? styles.batsSelected : styles.batsUnselected,
                                            labelStyle:
                                                entry.bats === 'S'
                                                    ? styles.batsLabelSelected
                                                    : [styles.batsLabelUnselected, { color: theme.colors.onSurface }],
                                        },
                                    ]}
                                    style={styles.batsToggle}
                                    density="small"
                                />
                            </View>
                        </View>
                    </View>
                ))}

                {/* Actions */}
                <View style={styles.actions}>
                    {saved && <Text style={styles.savedBadge}>✓ Saved</Text>}
                    {side === 'away' ? (
                        <Button
                            mode="contained"
                            onPress={() => handleSave('away')}
                            disabled={awaySubmitting}
                            loading={awaySubmitting}
                            style={styles.saveButton}
                        >
                            {awaySaved ? 'Update Away' : 'Save Away → Home'}
                        </Button>
                    ) : (
                        <View style={styles.homeActions}>
                            <Button
                                mode="contained"
                                onPress={() => handleSave('home')}
                                disabled={homeSubmitting}
                                loading={homeSubmitting}
                                style={[styles.saveButton, { backgroundColor: '#16a34a' }]}
                            >
                                {homeSaved ? 'Update Home' : 'Save & Start Game'}
                            </Button>
                            {homeSaved && (
                                <Button
                                    mode="contained"
                                    onPress={goToGame}
                                    style={[styles.saveButton, { backgroundColor: '#16a34a' }]}
                                >
                                    Go to Game →
                                </Button>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge">Scouting Lineup</Text>
                    {game && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {game.opponent_name ?? 'Away'} @ {game.scouting_home_team ?? 'Home'}
                        </Text>
                    )}
                </View>
                <TouchableOpacity onPress={goToGame} style={styles.skipButton}>
                    <Text style={[styles.skipText, { color: theme.colors.onSurfaceVariant }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginVertical: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Away / Home tab toggle */}
                    <SegmentedButtons
                        value={activeSide}
                        onValueChange={(v) => {
                            Haptics.selectionAsync();
                            setActiveSide(v as TeamSide);
                        }}
                        buttons={[
                            {
                                value: 'away',
                                label: `Away${awaySaved ? ' ✓' : ''}`,
                                checkedColor: '#ffffff',
                                style: activeSide === 'away' ? styles.tabSelected : styles.tabUnselected,
                                labelStyle:
                                    activeSide === 'away'
                                        ? styles.tabLabelSelected
                                        : [styles.tabLabelUnselected, { color: theme.colors.onSurface }],
                            },
                            {
                                value: 'home',
                                label: `Home${homeSaved ? ' ✓' : ''}`,
                                checkedColor: '#ffffff',
                                style: activeSide === 'home' ? styles.tabSelected : styles.tabUnselected,
                                labelStyle:
                                    activeSide === 'home'
                                        ? styles.tabLabelSelected
                                        : [styles.tabLabelUnselected, { color: theme.colors.onSurface }],
                            },
                        ]}
                        style={styles.tabToggle}
                        density="regular"
                    />

                    {renderLineupForm(activeSide)}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    skipButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    tabToggle: {
        marginBottom: 20,
    },
    tabSelected: {
        backgroundColor: '#334e68',
    },
    tabUnselected: {},
    tabLabelSelected: {
        color: '#ffffff',
        fontWeight: '700',
    },
    tabLabelUnselected: {
        fontWeight: '500',
    },
    helpText: {
        marginBottom: 12,
    },
    pitcherSection: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionTitle: {
        fontWeight: '600',
        marginBottom: 8,
    },
    pitcherBottomRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginTop: 4,
    },
    jerseyInput: {
        width: 90,
    },
    throwsContainer: { flex: 1 },
    throwsLabel: {
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    orderBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 10,
    },
    orderText: {
        fontWeight: '700',
        color: '#374151',
    },
    rowFields: { flex: 1 },
    nameInput: {
        marginBottom: 4,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    positionButton: { minWidth: 60 },
    positionLabel: { fontSize: 13 },
    batsToggle: { flex: 1 },
    batsSelected: { backgroundColor: '#1d4ed8' },
    batsUnselected: {},
    batsLabelSelected: { color: '#ffffff', fontWeight: '700' },
    batsLabelUnselected: { fontWeight: '500' },
    actions: {
        marginTop: 20,
        gap: 8,
    },
    homeActions: {
        gap: 8,
    },
    savedBadge: {
        color: '#16a34a',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    saveButton: { borderRadius: 8 },
});
