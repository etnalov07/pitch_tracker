import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, Alert } from 'react-native';
import { Text, Card, Button, FAB, useTheme } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { CreateOpponentTeamParams, OpponentTeam } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchOpponents, createOpponent } from '../../../../src/state';
import { LoadingScreen } from '../../../../src/components/common';
import * as Haptics from '../../../../src/utils/haptics';

export default function OpponentsScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const { opponents, loading } = useAppSelector((state) => state.opponents);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [level, setLevel] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const load = useCallback(() => {
        if (teamId) dispatch(fetchOpponents(teamId));
    }, [teamId, dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = async () => {
        if (!teamId || !name.trim()) return;
        setSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const params: CreateOpponentTeamParams = {
                name: name.trim(),
                city: city.trim() || null,
                level: level.trim() || null,
            };
            await dispatch(createOpponent({ teamId, params })).unwrap();
            setShowForm(false);
            setName('');
            setCity('');
            setLevel('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to add opponent.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderOpponent = ({ item }: { item: OpponentTeam }) => (
        <Card
            style={styles.card}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/team/${teamId}/opponents/${item.id}` as any);
            }}
        >
            <Card.Content>
                <Text variant="titleMedium">{item.name}</Text>
                <Text variant="bodySmall" style={styles.meta}>
                    {[item.city, item.level].filter(Boolean).join(' · ')}
                    {item.games_played > 0 ? ` · ${item.games_played}G` : ''}
                </Text>
            </Card.Content>
        </Card>
    );

    if (loading && opponents.length === 0) return <LoadingScreen message="Loading opponents…" />;

    return (
        <>
            <Stack.Screen options={{ title: 'Opponent Teams', headerBackTitle: 'Team' }} />
            <View style={styles.container}>
                {showForm && (
                    <Card style={styles.formCard}>
                        <Card.Content>
                            <Text variant="titleSmall" style={styles.formLabel}>
                                Team Name *
                            </Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Johnson High School"
                                autoFocus
                            />
                            <Text variant="titleSmall" style={styles.formLabel}>
                                City
                            </Text>
                            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Houston" />
                            <Text variant="titleSmall" style={styles.formLabel}>
                                Level
                            </Text>
                            <TextInput style={styles.input} value={level} onChangeText={setLevel} placeholder="High School" />
                            <View style={styles.formActions}>
                                <Button onPress={() => setShowForm(false)}>Cancel</Button>
                                <Button
                                    mode="contained"
                                    onPress={handleCreate}
                                    disabled={submitting || !name.trim()}
                                    loading={submitting}
                                >
                                    Add Opponent
                                </Button>
                            </View>
                        </Card.Content>
                    </Card>
                )}

                <FlatList
                    data={opponents}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOpponent}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                No opponent teams yet. Tap + to add one and start building your scouting database.
                            </Text>
                        </View>
                    }
                    onRefresh={load}
                    refreshing={loading}
                />

                {!showForm && (
                    <FAB
                        icon="plus"
                        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                        color={theme.colors.onPrimary}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowForm(true);
                        }}
                    />
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    listContent: { padding: 16, paddingBottom: 80 },
    card: { marginBottom: 12, backgroundColor: '#fff' },
    meta: { color: '#6b7280', marginTop: 2 },
    formCard: { margin: 16, marginBottom: 0, backgroundColor: '#fff' },
    formLabel: { marginTop: 8, marginBottom: 4, color: '#374151' },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        backgroundColor: '#fff',
        marginBottom: 4,
    },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    empty: { alignItems: 'center', padding: 32 },
    emptyText: { color: '#9ca3af', textAlign: 'center', fontSize: 14 },
    fab: { position: 'absolute', right: 16, bottom: 16 },
});
