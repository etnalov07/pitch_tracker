import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { Game, Player } from '@pitch-tracker/shared';
import { useAppDispatch, fetchGameById, createMyTeamLineup } from '../../../src/state';
import { gamesApi } from '../../../src/state/games/api/gamesApi';

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

interface LineupEntry {
    player_id: string;
    batting_order: number;
    position: string;
}

export default function MyTeamLineupScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const [game, setGame] = useState<Game | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [positionMenuIndex, setPositionMenuIndex] = useState<number | null>(null);
    const [playerMenuIndex, setPlayerMenuIndex] = useState<number | null>(null);

    const [lineup, setLineup] = useState<LineupEntry[]>(
        Array.from({ length: 9 }, (_, i) => ({
            player_id: '',
            batting_order: i + 1,
            position: '',
        }))
    );

    useEffect(() => {
        if (!id) return;
        dispatch(fetchGameById(id))
            .unwrap()
            .then(async (g) => {
                setGame(g);
                const size = g.lineup_size ?? 9;
                setLineup(
                    Array.from({ length: size }, (_, i) => ({
                        player_id: '',
                        batting_order: i + 1,
                        position: '',
                    }))
                );
                const players = await gamesApi.getTeamPlayers(g.home_team_id);
                setRoster(players || []);
            })
            .catch(() => Alert.alert('Error', 'Failed to load game'))
            .finally(() => setLoading(false));
    }, [dispatch, id]);

    const handleChange = (index: number, field: keyof LineupEntry, value: string) => {
        setLineup((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === 'player_id' && value && !updated[index].position) {
                const player = roster.find((p) => p.id === value);
                if (player) updated[index].position = player.primary_position;
            }
            return updated;
        });
    };

    const handleSubmit = async () => {
        if (!id) return;

        const filledEntries = lineup.filter((entry) => entry.player_id);
        if (filledEntries.length === 0) {
            Alert.alert('Missing Info', 'Please select at least one player');
            return;
        }

        setSubmitting(true);
        try {
            await dispatch(
                createMyTeamLineup({
                    gameId: id,
                    players: filledEntries.map((entry) => ({
                        player_id: entry.player_id,
                        batting_order: entry.batting_order,
                        position: entry.position || undefined,
                        is_starter: true,
                    })),
                })
            ).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game/${id}` as any);
        } catch {
            Alert.alert('Error', 'Failed to save lineup');
        } finally {
            setSubmitting(false);
        }
    };

    const playerLabel = (player_id: string) => {
        const p = roster.find((r) => r.id === player_id);
        if (!p) return '-- Select Player --';
        return `${p.jersey_number ? `#${p.jersey_number} ` : ''}${p.first_name} ${p.last_name} (${p.bats})`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge">My Team Lineup</Text>
                    {game?.opponent_name && (
                        <Text variant="bodySmall" style={{ color: '#6b7280' }}>
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
                    <Text variant="bodyMedium" style={styles.helpText}>
                        Select your team's batting order from your roster.
                    </Text>

                    {lineup.map((entry, index) => (
                        <View key={index} style={styles.row}>
                            <View style={styles.orderBadge}>
                                <Text variant="titleMedium" style={styles.orderText}>
                                    {entry.batting_order}
                                </Text>
                            </View>

                            <View style={styles.rowFields}>
                                <Menu
                                    visible={playerMenuIndex === index}
                                    onDismiss={() => setPlayerMenuIndex(null)}
                                    anchor={
                                        <Button
                                            mode="outlined"
                                            onPress={() => setPlayerMenuIndex(index)}
                                            style={styles.playerButton}
                                            contentStyle={{ justifyContent: 'flex-start' }}
                                            labelStyle={styles.playerLabel}
                                        >
                                            {playerLabel(entry.player_id)}
                                        </Button>
                                    }
                                >
                                    <Menu.Item
                                        onPress={() => {
                                            handleChange(index, 'player_id', '');
                                            setPlayerMenuIndex(null);
                                        }}
                                        title="-- None --"
                                    />
                                    {roster.map((p) => (
                                        <Menu.Item
                                            key={p.id}
                                            onPress={() => {
                                                handleChange(index, 'player_id', p.id);
                                                setPlayerMenuIndex(null);
                                            }}
                                            title={`${p.jersey_number ? `#${p.jersey_number} ` : ''}${p.first_name} ${p.last_name} (${p.bats})`}
                                        />
                                    ))}
                                </Menu>

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
                                                labelStyle={styles.positionLabelStyle}
                                            >
                                                {entry.position || 'Pos'}
                                            </Button>
                                        }
                                    >
                                        <Menu.Item
                                            onPress={() => {
                                                handleChange(index, 'position', '');
                                                setPositionMenuIndex(null);
                                            }}
                                            title="--"
                                        />
                                        {POSITIONS.map((pos) => (
                                            <Menu.Item
                                                key={pos}
                                                onPress={() => {
                                                    handleChange(index, 'position', pos);
                                                    setPositionMenuIndex(null);
                                                }}
                                                title={pos}
                                            />
                                        ))}
                                    </Menu>
                                </View>
                            </View>
                        </View>
                    ))}

                    <View style={styles.actions}>
                        <Button mode="outlined" onPress={() => router.replace(`/game/${id}` as any)} style={styles.skipButton}>
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
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    content: { padding: 16, paddingBottom: 40 },
    helpText: { color: '#6b7280', marginBottom: 16 },
    row: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
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
    orderText: { fontWeight: '700', color: '#374151' },
    rowFields: { flex: 1 },
    playerButton: { backgroundColor: '#ffffff', marginBottom: 4, width: '100%' },
    playerLabel: { fontSize: 13 },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    positionButton: { minWidth: 60 },
    positionLabelStyle: { fontSize: 13 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
    skipButton: { flex: 1 },
    saveButton: { flex: 1 },
});
