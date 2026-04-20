import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, FAB, Portal, Button, TextInput, useTheme, ActivityIndicator, Dialog } from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ScoutingReport } from '@pitch-tracker/shared';
import scoutingReportsApi from '../../../../src/state/scouting/api/scoutingReportsApi';

export default function ScoutingReportsListScreen() {
    const { id: teamId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();

    const [reports, setReports] = useState<ScoutingReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [opponentName, setOpponentName] = useState('');
    const [gameDate, setGameDate] = useState('');

    const load = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const data = await scoutingReportsApi.listByTeam(teamId);
            setReports(data);
        } catch {
            Alert.alert('Error', 'Failed to load scouting reports');
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleCreate = async () => {
        if (!teamId || !opponentName.trim()) return;
        setCreating(true);
        try {
            const created = await scoutingReportsApi.create(teamId, {
                opponent_name: opponentName.trim(),
                game_date: gameDate || null,
            });
            setShowDialog(false);
            setOpponentName('');
            setGameDate('');
            router.push(`/team/${teamId}/scouting/${created.id}` as any);
        } catch {
            Alert.alert('Error', 'Failed to create scouting report');
        } finally {
            setCreating(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Scouting Reports', headerBackTitle: 'Team' }} />
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                >
                    {loading && reports.length === 0 ? (
                        <ActivityIndicator style={{ marginTop: 40 }} />
                    ) : reports.length === 0 ? (
                        <Card style={styles.emptyCard}>
                            <Card.Content>
                                <Text variant="titleMedium">No scouting reports yet</Text>
                                <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                                    Create a report to pre-fill opponent batter tendencies.
                                </Text>
                            </Card.Content>
                        </Card>
                    ) : (
                        reports.map((r) => (
                            <Card
                                key={r.id}
                                style={styles.reportCard}
                                onPress={() => router.push(`/team/${teamId}/scouting/${r.id}` as any)}
                            >
                                <Card.Content>
                                    <Text variant="titleMedium">{r.opponent_name}</Text>
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                        {r.game_date ? new Date(r.game_date).toLocaleDateString() : 'No game linked'}
                                        {r.created_by_name ? ` · ${r.created_by_name}` : ''}
                                    </Text>
                                </Card.Content>
                            </Card>
                        ))
                    )}
                </ScrollView>

                <Portal>
                    <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
                        <Dialog.Title>New Scouting Report</Dialog.Title>
                        <Dialog.Content>
                            <TextInput
                                label="Opponent name"
                                value={opponentName}
                                onChangeText={setOpponentName}
                                mode="outlined"
                                style={{ marginBottom: 12 }}
                            />
                            <TextInput
                                label="Game date (YYYY-MM-DD, optional)"
                                value={gameDate}
                                onChangeText={setGameDate}
                                mode="outlined"
                                placeholder="2026-05-15"
                            />
                        </Dialog.Content>
                        <Dialog.Actions>
                            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
                            <Button onPress={handleCreate} disabled={!opponentName.trim() || creating} loading={creating}>
                                Create
                            </Button>
                        </Dialog.Actions>
                    </Dialog>
                </Portal>

                <FAB icon="plus" style={styles.fab} onPress={() => setShowDialog(true)} label="New Report" />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 96 },
    emptyCard: { marginTop: 24 },
    reportCard: { marginBottom: 12 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});
