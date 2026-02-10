import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton, ActivityIndicator, TextInput, Menu, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { Game } from '@pitch-tracker/shared';
import { useAppDispatch, fetchGameById, createOpponentLineup } from '../../../src/state';

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
            .then((g) => setGame(g))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [dispatch, id]);

    const handlePlayerChange = (index: number, field: keyof LineupEntry, value: string) => {
        setLineup((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
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

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator style={{ marginVertical: 40 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <View style={{ flex: 1 }}>
                    <Text variant="titleLarge">Opponent Lineup</Text>
                    {game?.opponent_name && (
                        <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                            vs {game.opponent_name}
                        </Text>
                    )}
                </View>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text variant="bodyMedium" style={styles.helpText}>
                    Enter the opposing team's batting order. You can add or change players during the game.
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
                                onChangeText={(text) => handlePlayerChange(index, 'player_name', text)}
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
                                        { value: 'R', label: 'R' },
                                        { value: 'L', label: 'L' },
                                        { value: 'S', label: 'S' },
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
        borderBottomColor: '#e5e7eb',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    helpText: {
        color: '#6b7280',
        marginBottom: 16,
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
    rowFields: {
        flex: 1,
    },
    nameInput: {
        backgroundColor: '#ffffff',
        marginBottom: 4,
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
