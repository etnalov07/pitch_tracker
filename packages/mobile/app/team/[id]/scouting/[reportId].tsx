import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
    Text,
    Card,
    Button,
    TextInput,
    useTheme,
    ActivityIndicator,
    Dialog,
    Portal,
    SegmentedButtons,
    IconButton,
    Chip,
} from 'react-native-paper';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import {
    HandednessType,
    ScoutingReportBatter,
    ScoutingReportBatterInput,
    ScoutingReportInput,
    ScoutingReportWithBatters,
    ScoutingZoneCell,
    TeamTendencyFrequency,
} from '@pitch-tracker/shared';
import scoutingReportsApi from '../../../../src/state/scouting/api/scoutingReportsApi';

const FREQUENCY_OPTIONS = [
    { value: '', label: '—' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
];

const COMMON_VULNS = [
    'fastball_high',
    'fastball_low',
    'fastball_inside',
    'fastball_outside',
    'breaking_low',
    'breaking_outside',
    'changeup',
    'first_pitch',
];

const ZONE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const cycleZoneState = (s: ScoutingZoneCell | undefined): ScoutingZoneCell => {
    if (s === 'hot') return 'cold';
    if (s === 'cold') return 'neutral';
    return 'hot';
};

export default function ScoutingReportEditorScreen() {
    const { id: teamId, reportId } = useLocalSearchParams<{ id: string; reportId: string }>();
    const router = useRouter();
    const theme = useTheme();

    const [report, setReport] = useState<ScoutingReportWithBatters | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<ScoutingReportInput>({ opponent_name: '' });

    const [addBatterOpen, setAddBatterOpen] = useState(false);
    const [newBatter, setNewBatter] = useState<ScoutingReportBatterInput>({ player_name: '', bats: 'R' });

    const [editingBatter, setEditingBatter] = useState<ScoutingReportBatter | null>(null);

    const load = useCallback(async () => {
        if (!reportId) return;
        setLoading(true);
        try {
            const data = await scoutingReportsApi.getById(reportId);
            setReport(data);
            setDraft({
                opponent_name: data.opponent_name,
                game_date: data.game_date ?? null,
                notes: data.notes ?? '',
                steal_frequency: data.steal_frequency ?? null,
                bunt_frequency: data.bunt_frequency ?? null,
                hit_and_run_frequency: data.hit_and_run_frequency ?? null,
            });
        } catch {
            Alert.alert('Error', 'Failed to load scouting report');
        } finally {
            setLoading(false);
        }
    }, [reportId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveReport = async () => {
        if (!reportId) return;
        setSaving(true);
        try {
            await scoutingReportsApi.update(reportId, draft);
            await load();
        } catch {
            Alert.alert('Error', 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const deleteReport = () => {
        if (!reportId) return;
        Alert.alert('Delete report?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await scoutingReportsApi.delete(reportId);
                        router.back();
                    } catch {
                        Alert.alert('Error', 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const addBatter = async () => {
        if (!reportId || !newBatter.player_name.trim()) return;
        try {
            await scoutingReportsApi.addBatter(reportId, newBatter);
            setNewBatter({ player_name: '', bats: 'R' });
            setAddBatterOpen(false);
            await load();
        } catch {
            Alert.alert('Error', 'Failed to add batter');
        }
    };

    const deleteBatter = (batter: ScoutingReportBatter) => {
        Alert.alert('Delete batter?', batter.player_name, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await scoutingReportsApi.deleteBatter(batter.id);
                        await load();
                    } catch {
                        Alert.alert('Error', 'Failed to delete batter');
                    }
                },
            },
        ]);
    };

    if (loading && !report) {
        return <ActivityIndicator style={{ flex: 1, marginTop: 80 }} />;
    }
    if (!report) {
        return (
            <View style={styles.container}>
                <Text>Report not found</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: report.opponent_name,
                    headerBackTitle: 'Scouting',
                    headerRight: () => <IconButton icon="delete" onPress={deleteReport} />,
                }}
            />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            >
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium">Report details</Text>
                        <TextInput
                            label="Opponent name"
                            value={draft.opponent_name}
                            onChangeText={(v) => setDraft({ ...draft, opponent_name: v })}
                            mode="outlined"
                            style={styles.field}
                        />
                        <TextInput
                            label="Game date (YYYY-MM-DD)"
                            value={draft.game_date ?? ''}
                            onChangeText={(v) => setDraft({ ...draft, game_date: v || null })}
                            mode="outlined"
                            style={styles.field}
                        />
                        <TextInput
                            label="Team-level notes"
                            value={draft.notes ?? ''}
                            onChangeText={(v) => setDraft({ ...draft, notes: v })}
                            mode="outlined"
                            multiline
                            numberOfLines={3}
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Steal frequency
                        </Text>
                        <SegmentedButtons
                            value={draft.steal_frequency ?? ''}
                            onValueChange={(v) =>
                                setDraft({ ...draft, steal_frequency: (v || null) as TeamTendencyFrequency | null })
                            }
                            buttons={FREQUENCY_OPTIONS}
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Bunt frequency
                        </Text>
                        <SegmentedButtons
                            value={draft.bunt_frequency ?? ''}
                            onValueChange={(v) =>
                                setDraft({ ...draft, bunt_frequency: (v || null) as TeamTendencyFrequency | null })
                            }
                            buttons={FREQUENCY_OPTIONS}
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Hit & run frequency
                        </Text>
                        <SegmentedButtons
                            value={draft.hit_and_run_frequency ?? ''}
                            onValueChange={(v) =>
                                setDraft({
                                    ...draft,
                                    hit_and_run_frequency: (v || null) as TeamTendencyFrequency | null,
                                })
                            }
                            buttons={FREQUENCY_OPTIONS}
                            style={styles.field}
                        />
                        <Button mode="contained" onPress={saveReport} loading={saving} style={{ marginTop: 12 }}>
                            Save details
                        </Button>
                    </Card.Content>
                </Card>

                <Card style={styles.card}>
                    <Card.Content>
                        <View style={styles.row}>
                            <Text variant="titleMedium">Opponent batters ({report.batters.length})</Text>
                            <Button mode="contained-tonal" onPress={() => setAddBatterOpen(true)} compact>
                                + Add
                            </Button>
                        </View>
                        {report.batters.length === 0 ? (
                            <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
                                No batters yet.
                            </Text>
                        ) : (
                            report.batters.map((b) => (
                                <View key={b.id} style={styles.batterRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="titleSmall" onPress={() => setEditingBatter(b)}>
                                            {b.jersey_number ? `#${b.jersey_number} ` : ''}
                                            {b.player_name} ({b.bats})
                                        </Text>
                                        {b.notes ? (
                                            <Text
                                                variant="bodySmall"
                                                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                                            >
                                                {b.notes}
                                            </Text>
                                        ) : null}
                                        {b.pitch_vulnerabilities && b.pitch_vulnerabilities.length > 0 && (
                                            <View style={styles.chips}>
                                                {b.pitch_vulnerabilities.map((v) => (
                                                    <Chip key={v} compact style={styles.chip}>
                                                        {v.replace(/_/g, ' ')}
                                                    </Chip>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                    <IconButton icon="pencil" onPress={() => setEditingBatter(b)} />
                                    <IconButton icon="delete" onPress={() => deleteBatter(b)} />
                                </View>
                            ))
                        )}
                    </Card.Content>
                </Card>
            </ScrollView>

            <Portal>
                <Dialog visible={addBatterOpen} onDismiss={() => setAddBatterOpen(false)}>
                    <Dialog.Title>Add batter</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Name"
                            value={newBatter.player_name}
                            onChangeText={(v) => setNewBatter({ ...newBatter, player_name: v })}
                            mode="outlined"
                            style={styles.field}
                        />
                        <TextInput
                            label="Jersey #"
                            value={newBatter.jersey_number != null ? String(newBatter.jersey_number) : ''}
                            onChangeText={(v) => setNewBatter({ ...newBatter, jersey_number: v ? Number(v) : null })}
                            mode="outlined"
                            keyboardType="number-pad"
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Bats
                        </Text>
                        <SegmentedButtons
                            value={newBatter.bats ?? 'R'}
                            onValueChange={(v) => setNewBatter({ ...newBatter, bats: v as HandednessType })}
                            buttons={[
                                { value: 'R', label: 'R' },
                                { value: 'L', label: 'L' },
                                { value: 'S', label: 'S' },
                            ]}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setAddBatterOpen(false)}>Cancel</Button>
                        <Button onPress={addBatter} disabled={!newBatter.player_name.trim()}>
                            Add
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {editingBatter && (
                <BatterEditDialog
                    batter={editingBatter}
                    onClose={() => setEditingBatter(null)}
                    onSaved={async () => {
                        setEditingBatter(null);
                        await load();
                    }}
                />
            )}
        </>
    );
}

interface BatterEditDialogProps {
    batter: ScoutingReportBatter;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
}

const BatterEditDialog: React.FC<BatterEditDialogProps> = ({ batter, onClose, onSaved }) => {
    const theme = useTheme();
    const [draft, setDraft] = useState<ScoutingReportBatterInput>({
        player_name: batter.player_name,
        jersey_number: batter.jersey_number ?? null,
        batting_order: batter.batting_order ?? null,
        bats: batter.bats,
        notes: batter.notes ?? '',
        zone_weakness: batter.zone_weakness ?? {},
        pitch_vulnerabilities: batter.pitch_vulnerabilities ?? [],
    });
    const [saving, setSaving] = useState(false);

    const toggleVuln = (v: string) => {
        const list = draft.pitch_vulnerabilities ?? [];
        setDraft({
            ...draft,
            pitch_vulnerabilities: list.includes(v) ? list.filter((x) => x !== v) : [...list, v],
        });
    };

    const cycleZone = (id: string) => {
        const zone = draft.zone_weakness ?? {};
        setDraft({ ...draft, zone_weakness: { ...zone, [id]: cycleZoneState(zone[id]) } });
    };

    const save = async () => {
        setSaving(true);
        try {
            await scoutingReportsApi.updateBatter(batter.id, draft);
            await onSaved();
        } catch {
            Alert.alert('Error', 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Portal>
            <Dialog visible onDismiss={onClose} style={{ maxHeight: '90%' }}>
                <Dialog.Title>Edit batter</Dialog.Title>
                <Dialog.ScrollArea>
                    <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
                        <TextInput
                            label="Name"
                            value={draft.player_name}
                            onChangeText={(v) => setDraft({ ...draft, player_name: v })}
                            mode="outlined"
                            style={styles.field}
                        />
                        <TextInput
                            label="Jersey #"
                            value={draft.jersey_number != null ? String(draft.jersey_number) : ''}
                            onChangeText={(v) => setDraft({ ...draft, jersey_number: v ? Number(v) : null })}
                            mode="outlined"
                            keyboardType="number-pad"
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Bats
                        </Text>
                        <SegmentedButtons
                            value={draft.bats ?? 'R'}
                            onValueChange={(v) => setDraft({ ...draft, bats: v as HandednessType })}
                            buttons={[
                                { value: 'R', label: 'R' },
                                { value: 'L', label: 'L' },
                                { value: 'S', label: 'S' },
                            ]}
                            style={styles.field}
                        />
                        <TextInput
                            label="Scouting notes"
                            value={draft.notes ?? ''}
                            onChangeText={(v) => setDraft({ ...draft, notes: v })}
                            mode="outlined"
                            multiline
                            numberOfLines={4}
                            style={styles.field}
                        />
                        <Text variant="bodySmall" style={styles.label}>
                            Zone weakness (tap to cycle hot → cold → neutral)
                        </Text>
                        <View style={styles.zoneGrid}>
                            {ZONE_IDS.map((id) => {
                                const s = (draft.zone_weakness?.[id] ?? 'neutral') as ScoutingZoneCell;
                                const bg =
                                    s === 'hot'
                                        ? theme.colors.error
                                        : s === 'cold'
                                          ? theme.colors.primary
                                          : theme.colors.surfaceVariant;
                                return (
                                    <View key={id} style={[styles.zoneCell, { backgroundColor: bg }]}>
                                        <Text
                                            style={{
                                                color: s === 'neutral' ? theme.colors.onSurfaceVariant : 'white',
                                                fontWeight: '600',
                                            }}
                                            onPress={() => cycleZone(id)}
                                        >
                                            {s === 'hot' ? '🔥' : s === 'cold' ? '❄' : id}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                        <Text variant="bodySmall" style={styles.label}>
                            Pitch vulnerabilities
                        </Text>
                        <View style={styles.chips}>
                            {COMMON_VULNS.map((v) => (
                                <Chip
                                    key={v}
                                    selected={draft.pitch_vulnerabilities?.includes(v)}
                                    onPress={() => toggleVuln(v)}
                                    style={styles.chip}
                                    compact
                                >
                                    {v.replace(/_/g, ' ')}
                                </Chip>
                            ))}
                        </View>
                    </ScrollView>
                </Dialog.ScrollArea>
                <Dialog.Actions>
                    <Button onPress={onClose}>Cancel</Button>
                    <Button onPress={save} loading={saving}>
                        Save
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    card: { marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    field: { marginTop: 12 },
    label: { marginTop: 12, marginBottom: 4, fontWeight: '500' },
    batterRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
    chip: { marginRight: 6, marginBottom: 6 },
    zoneGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 180,
        marginTop: 4,
    },
    zoneCell: {
        width: 56,
        height: 56,
        margin: 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
});
