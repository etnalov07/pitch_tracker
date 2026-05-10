import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, Menu, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { BatterScoutingProfile, Game, OpponentPitcherProfile } from '@pitch-tracker/shared';
import { useAppDispatch, fetchGameById, createOpponentLineup, createOpposingPitcher } from '../../../src/state';
import { gamesApi } from '../../../src/state/games/api/gamesApi';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface LineupEntry {
    player_name: string;
    batting_order: number;
    position: string;
    bats: 'R' | 'L' | 'S';
}

export default function LineupScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [positionMenuIndex, setPositionMenuIndex] = useState<number | null>(null);
    const [knownPitchers, setKnownPitchers] = useState<OpponentPitcherProfile[]>([]);
    const [knownBatters, setKnownBatters] = useState<BatterScoutingProfile[]>([]);

    const [pitcherName, setPitcherName] = useState('');
    const [pitcherJersey, setPitcherJersey] = useState('');
    const [pitcherThrows, setPitcherThrows] = useState<'R' | 'L'>('R');

    const [lineup, setLineup] = useState<LineupEntry[]>(
        Array.from({ length: 9 }, (_, i) => ({
            player_name: '',
            batting_order: i + 1,
            position: '',
            bats: 'R' as const,
        }))
    );

    useEffect(() => {
        if (!id) return;
        dispatch(fetchGameById(id))
            .unwrap()
            .then((g) => {
                setGame(g);
                const size = g.lineup_size ?? 9;
                setLineup(
                    Array.from({ length: size }, (_, i) => ({
                        player_name: '',
                        batting_order: i + 1,
                        position: '',
                        bats: 'R' as const,
                    }))
                );
                gamesApi
                    .getOpponentRoster(id)
                    .then((roster) => {
                        setKnownPitchers(roster.pitchers);
                        setKnownBatters(roster.batters);
                    })
                    .catch(() => {});
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [dispatch, id]);

    const handlePlayerChange = (index: number, field: keyof LineupEntry, value: string) => {
        setLineup((prev) => {
            const updated = [...prev];
            if (field === 'player_name') {
                const known = knownBatters.find((b) => b.player_name === value);
                updated[index] = {
                    ...updated[index],
                    player_name: value,
                    bats: known ? (known.bats as 'R' | 'L' | 'S') : updated[index].bats,
                };
            } else {
                updated[index] = { ...updated[index], [field]: value };
            }
            return updated;
        });
    };

    const handleSelectKnownBatter = (batter: BatterScoutingProfile, index: number) => {
        Haptics.selectionAsync();
        setLineup((prev) => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                player_name: batter.player_name,
                bats: batter.bats as 'R' | 'L' | 'S',
            };
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!id) return;

        const filledEntries = lineup.filter((entry) => entry.player_name.trim());
        if (filledEntries.length === 0) {
            Alert.alert('Missing Info', 'Please enter at least one player name');
            return;
        }

        setSubmitting(true);
        try {
            if (pitcherName.trim()) {
                await dispatch(
                    createOpposingPitcher({
                        game_id: id,
                        team_name: game?.opponent_name ?? 'Opponent',
                        pitcher_name: pitcherName.trim(),
                        jersey_number: pitcherJersey.trim() ? parseInt(pitcherJersey.trim(), 10) : null,
                        throws: pitcherThrows,
                    })
                ).unwrap();
            }

            const players = filledEntries.map((entry) => ({
                player_name: entry.player_name.trim(),
                batting_order: entry.batting_order,
                position: entry.position || undefined,
                bats: entry.bats,
                is_starter: true,
            }));

            await dispatch(createOpponentLineup({ gameId: id, players })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game/${id}` as any);
        } catch {
            Alert.alert('Error', 'Failed to save lineup');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        router.replace(`/game/${id}` as any);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge">Opponent Lineup</Text>
                    {game?.opponent_name && (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            vs {game.opponent_name}
                        </Text>
                    )}
                </View>
                <View style={{ width: 48 }} />
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginVertical: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <Text variant="bodyMedium" style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
                        Enter the opposing team's batting order. You can add or change players during the game.
                    </Text>

                    <View
                        style={[
                            styles.pitcherSection,
                            { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline },
                        ]}
                    >
                        <Text variant="titleSmall" style={[styles.pitcherSectionTitle, { color: theme.colors.onSurface }]}>
                            Starting Pitcher
                        </Text>
                        <TextInput
                            label="Pitcher Name"
                            value={pitcherName}
                            onChangeText={setPitcherName}
                            mode="outlined"
                            placeholder="e.g. Smith"
                            style={styles.nameInput}
                            dense
                        />
                        {knownPitchers.length > 0 && (
                            <View style={styles.chipRow}>
                                {knownPitchers.map((p) => {
                                    const selected = pitcherName === p.pitcher_name;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setPitcherName(p.pitcher_name);
                                            }}
                                            style={[
                                                styles.chip,
                                                {
                                                    borderColor: selected ? theme.colors.primary : theme.colors.outline,
                                                    backgroundColor: selected
                                                        ? theme.colors.primaryContainer
                                                        : theme.colors.surfaceVariant,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.chipText,
                                                    {
                                                        color: selected
                                                            ? theme.colors.onPrimaryContainer
                                                            : theme.colors.onSurfaceVariant,
                                                        fontWeight: selected ? '600' : 'normal',
                                                    },
                                                ]}
                                            >
                                                {p.pitcher_name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                        <View style={styles.pitcherBottomRow}>
                            <TextInput
                                label="Jersey #"
                                value={pitcherJersey}
                                onChangeText={setPitcherJersey}
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
                                    onValueChange={(v) => setPitcherThrows(v as 'R' | 'L')}
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

                    <Text variant="titleSmall" style={[styles.battingOrderTitle, { color: theme.colors.onSurface }]}>
                        Batting Order
                    </Text>

                    {lineup.map((entry, index) => (
                        <View key={index} style={styles.row}>
                            <View style={[styles.orderBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                                <Text variant="titleMedium" style={[styles.orderText, { color: theme.colors.onSurfaceVariant }]}>
                                    {entry.batting_order}
                                </Text>
                            </View>

                            <View style={styles.rowFields}>
                                <TextInput
                                    label="Player Name"
                                    value={entry.player_name}
                                    onChangeText={(text) => handlePlayerChange(index, 'player_name', text)}
                                    mode="outlined"
                                    placeholder={`Batter ${entry.batting_order}`}
                                    style={styles.nameInput}
                                    dense
                                />
                                {knownBatters.length > 0 && !entry.player_name && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                                        <View style={styles.chipRow}>
                                            {knownBatters.map((b) => (
                                                <TouchableOpacity
                                                    key={b.id}
                                                    onPress={() => handleSelectKnownBatter(b, index)}
                                                    style={[
                                                        styles.chip,
                                                        {
                                                            borderColor: theme.colors.outline,
                                                            backgroundColor: theme.colors.surfaceVariant,
                                                        },
                                                    ]}
                                                >
                                                    <Text style={[styles.chipText, { color: theme.colors.onSurfaceVariant }]}>
                                                        {b.player_name}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}

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
                                                handlePlayerChange(index, 'position', '');
                                                setPositionMenuIndex(null);
                                            }}
                                            title="--"
                                        />
                                        {POSITIONS.map((pos) => (
                                            <Menu.Item
                                                key={pos}
                                                onPress={() => {
                                                    handlePlayerChange(index, 'position', pos);
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
                                            handlePlayerChange(index, 'bats', v);
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

                    <View style={styles.actions}>
                        <Button mode="outlined" onPress={handleSkip} style={styles.skipButton}>
                            Skip for Now
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            disabled={submitting}
                            loading={submitting}
                            style={styles.saveButton}
                        >
                            Save & Continue
                        </Button>
                    </View>
                </ScrollView>
            )}
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
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    helpText: {
        marginBottom: 16,
    },
    pitcherSection: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    pitcherSectionTitle: {
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
    throwsContainer: {
        flex: 1,
    },
    throwsLabel: {
        marginBottom: 4,
    },
    battingOrderTitle: {
        fontWeight: '600',
        marginBottom: 12,
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
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 10,
    },
    orderText: {
        fontWeight: '700',
    },
    rowFields: {
        flex: 1,
    },
    nameInput: {
        marginBottom: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 4,
    },
    chipScroll: {
        marginBottom: 4,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 12,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    positionButton: {
        minWidth: 60,
    },
    positionLabel: {
        fontSize: 13,
    },
    batsToggle: {
        flex: 1,
    },
    batsSelected: {
        backgroundColor: '#1d4ed8',
    },
    batsUnselected: {},
    batsLabelSelected: {
        color: '#ffffff',
        fontWeight: '700',
    },
    batsLabelUnselected: {
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        gap: 12,
    },
    skipButton: {
        flex: 1,
    },
    saveButton: {
        flex: 1,
    },
});
