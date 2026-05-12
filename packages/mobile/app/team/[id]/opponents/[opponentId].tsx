import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, ActionSheetIOS, Platform } from 'react-native';
import { Text, Card, Button, Divider, IconButton, useTheme, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
    BatterScoutingProfile,
    HandednessType,
    OpponentPitcherProfile,
    OpponentPitcherTendencies,
    ThrowingHand,
} from '@pitch-tracker/shared';
import {
    useAppDispatch,
    useAppSelector,
    fetchOpponentById,
    addOpponentPitcher,
    updateOpponentPitcher,
    deleteOpponentPitcher,
    addOpponentBatter,
    updateOpponentBatter,
    deleteOpponentBatter,
} from '../../../../src/state';
import opponentsApi from '../../../../src/state/opponents/api/opponentsApi';
import { LoadingScreen } from '../../../../src/components/common';
import * as Haptics from '../../../../src/utils/haptics';
import { TextInput as RNTextInput } from 'react-native';

function fmt(n: number | null | undefined, suffix = '%'): string {
    if (n == null) return '—';
    return `${n}${suffix}`;
}

function PitcherCard({
    pitcher,
    onEdit,
    onDelete,
}: {
    pitcher: OpponentPitcherProfile;
    onEdit: (p: OpponentPitcherProfile) => void;
    onDelete: (p: OpponentPitcherProfile) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [tendencies, setTendencies] = useState<OpponentPitcherTendencies | null | 'loading'>(null);
    const [recalcing, setRecalcing] = useState(false);
    const theme = useTheme();

    const loadTendencies = useCallback(async () => {
        setTendencies('loading');
        try {
            const { tendencies: t } = await opponentsApi.getPitcherProfile(pitcher.id);
            setTendencies(t);
        } catch {
            setTendencies(null);
        }
    }, [pitcher.id]);

    const handleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!expanded) loadTendencies();
        setExpanded((e) => !e);
    };

    const handleRecalc = async () => {
        setRecalcing(true);
        try {
            const updated = await opponentsApi.recalculateTendencies(pitcher.id);
            setTendencies(updated);
        } finally {
            setRecalcing(false);
        }
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const options = ['Edit', 'Delete', 'Cancel'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, destructiveButtonIndex: 1, cancelButtonIndex: 2, title: pitcher.pitcher_name },
                (idx) => {
                    if (idx === 0) onEdit(pitcher);
                    else if (idx === 1) onDelete(pitcher);
                }
            );
        } else {
            Alert.alert(pitcher.pitcher_name, undefined, [
                { text: 'Edit', onPress: () => onEdit(pitcher) },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(pitcher) },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    return (
        <Card style={styles.rosterCard} onPress={handleExpand} onLongPress={handleLongPress}>
            <Card.Content>
                <View style={styles.rosterRow}>
                    <View style={{ flex: 1 }}>
                        <Text variant="titleSmall">{pitcher.pitcher_name}</Text>
                        <Text variant="bodySmall" style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                            {pitcher.throws}HP{pitcher.jersey_number != null ? ` · #${pitcher.jersey_number}` : ''} ·{' '}
                            {pitcher.games_pitched}G
                        </Text>
                    </View>
                    <Text style={{ color: theme.colors.primary, fontSize: 12 }}>{expanded ? '▲' : '▽'}</Text>
                </View>
                {expanded && (
                    <View style={styles.tendenciesBox}>
                        {tendencies === 'loading' ? (
                            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>Loading…</Text>
                        ) : !tendencies || tendencies.total_pitches === 0 ? (
                            <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>No pitch data yet.</Text>
                        ) : (
                            <>
                                <View style={styles.statRow}>
                                    <StatCell label="Pitches" value={String(tendencies.total_pitches)} />
                                    <StatCell label="Strike%" value={fmt(tendencies.strike_percentage)} />
                                    <StatCell label="F-Strike%" value={fmt(tendencies.first_pitch_strike_pct)} />
                                </View>
                                <View style={styles.statRow}>
                                    <StatCell label="FB%" value={fmt(tendencies.fastball_pct)} />
                                    <StatCell label="Break%" value={fmt(tendencies.breaking_pct)} />
                                    <StatCell label="OS%" value={fmt(tendencies.offspeed_pct)} />
                                </View>
                                <Button
                                    mode="text"
                                    compact
                                    onPress={handleRecalc}
                                    loading={recalcing}
                                    style={{ marginTop: 4, alignSelf: 'flex-start' }}
                                >
                                    Recalculate
                                </Button>
                            </>
                        )}
                    </View>
                )}
            </Card.Content>
        </Card>
    );
}

function StatCell({ label, value }: { label: string; value: string }) {
    const theme = useTheme();
    return (
        <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        </View>
    );
}

type PitcherFormState = { mode: 'add' | 'edit'; editingId?: string; name: string; throws: ThrowingHand; jersey: string };
type BatterFormState = { mode: 'add' | 'edit'; editingId?: string; name: string; bats: HandednessType; jersey: string };

function PitcherInlineForm({
    state,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    error,
}: {
    state: PitcherFormState;
    onChange: (next: PitcherFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitting: boolean;
    error: string;
}) {
    const theme = useTheme();
    return (
        <Card style={styles.formCard}>
            <Card.Content>
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Pitcher name *
                </Text>
                <RNTextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                    value={state.name}
                    onChangeText={(t) => onChange({ ...state, name: t })}
                    placeholder="Jake Garcia"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    autoFocus
                />
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Throws
                </Text>
                <SegmentedButtons
                    value={state.throws}
                    onValueChange={(v) => onChange({ ...state, throws: v as ThrowingHand })}
                    buttons={[
                        { value: 'R', label: 'Right' },
                        { value: 'L', label: 'Left' },
                    ]}
                />
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Jersey #
                </Text>
                <RNTextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                    value={state.jersey}
                    onChangeText={(t) => onChange({ ...state, jersey: t.replace(/[^\d]/g, '') })}
                    placeholder="17"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="number-pad"
                />
                {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
                <View style={styles.formActions}>
                    <Button onPress={onCancel}>Cancel</Button>
                    <Button mode="contained" onPress={onSubmit} disabled={submitting || !state.name.trim()} loading={submitting}>
                        {state.mode === 'add' ? 'Add Pitcher' : 'Save'}
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );
}

function BatterInlineForm({
    state,
    onChange,
    onSubmit,
    onCancel,
    submitting,
    error,
}: {
    state: BatterFormState;
    onChange: (next: BatterFormState) => void;
    onSubmit: () => void;
    onCancel: () => void;
    submitting: boolean;
    error: string;
}) {
    const theme = useTheme();
    return (
        <Card style={styles.formCard}>
            <Card.Content>
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Batter name *
                </Text>
                <RNTextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                    value={state.name}
                    onChangeText={(t) => onChange({ ...state, name: t })}
                    placeholder="Alex Wright"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    autoFocus
                />
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Bats
                </Text>
                <SegmentedButtons
                    value={state.bats}
                    onValueChange={(v) => onChange({ ...state, bats: v as HandednessType })}
                    buttons={[
                        { value: 'R', label: 'Right' },
                        { value: 'L', label: 'Left' },
                        { value: 'S', label: 'Switch' },
                    ]}
                />
                <Text variant="titleSmall" style={[styles.formLabel, { color: theme.colors.onSurface }]}>
                    Jersey #
                </Text>
                <RNTextInput
                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                    value={state.jersey}
                    onChangeText={(t) => onChange({ ...state, jersey: t.replace(/[^\d]/g, '') })}
                    placeholder="4"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="number-pad"
                />
                {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
                <View style={styles.formActions}>
                    <Button onPress={onCancel}>Cancel</Button>
                    <Button mode="contained" onPress={onSubmit} disabled={submitting || !state.name.trim()} loading={submitting}>
                        {state.mode === 'add' ? 'Add Batter' : 'Save'}
                    </Button>
                </View>
            </Card.Content>
        </Card>
    );
}

const emptyPitcherForm: PitcherFormState = { mode: 'add', name: '', throws: 'R', jersey: '' };
const emptyBatterForm: BatterFormState = { mode: 'add', name: '', bats: 'R', jersey: '' };

export default function OpponentDetailScreen() {
    const theme = useTheme();
    const { id: teamId, opponentId } = useLocalSearchParams<{ id: string; opponentId: string }>();
    const dispatch = useAppDispatch();

    const { selectedOpponent, detailLoading } = useAppSelector((state) => state.opponents);

    const [pitcherForm, setPitcherForm] = useState<PitcherFormState | null>(null);
    const [batterForm, setBatterForm] = useState<BatterFormState | null>(null);
    const [pitcherSubmitting, setPitcherSubmitting] = useState(false);
    const [batterSubmitting, setBatterSubmitting] = useState(false);
    const [pitcherError, setPitcherError] = useState('');
    const [batterError, setBatterError] = useState('');

    const load = useCallback(() => {
        if (teamId && opponentId) dispatch(fetchOpponentById({ teamId, id: opponentId }));
    }, [teamId, opponentId, dispatch]);

    useEffect(() => {
        load();
    }, [load]);

    const handlePitcherSubmit = async () => {
        if (!selectedOpponent || !pitcherForm) return;
        setPitcherSubmitting(true);
        setPitcherError('');
        const jerseyNum = pitcherForm.jersey.trim() === '' ? null : parseInt(pitcherForm.jersey, 10);
        try {
            if (pitcherForm.mode === 'add') {
                await dispatch(
                    addOpponentPitcher({
                        opponentTeamId: selectedOpponent.id,
                        params: { pitcher_name: pitcherForm.name.trim(), throws: pitcherForm.throws, jersey_number: jerseyNum },
                    })
                ).unwrap();
            } else if (pitcherForm.editingId) {
                await dispatch(
                    updateOpponentPitcher({
                        id: pitcherForm.editingId,
                        params: { pitcher_name: pitcherForm.name.trim(), throws: pitcherForm.throws, jersey_number: jerseyNum },
                    })
                ).unwrap();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPitcherForm(null);
        } catch (err) {
            setPitcherError(typeof err === 'string' ? err : 'Failed to save pitcher.');
        } finally {
            setPitcherSubmitting(false);
        }
    };

    const handlePitcherDelete = (p: OpponentPitcherProfile) => {
        Alert.alert('Remove pitcher', `Remove ${p.pitcher_name} from this opponent's roster?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    await dispatch(deleteOpponentPitcher(p.id));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const handleBatterSubmit = async () => {
        if (!selectedOpponent || !batterForm) return;
        setBatterSubmitting(true);
        setBatterError('');
        const jerseyNum = batterForm.jersey.trim() === '' ? null : parseInt(batterForm.jersey, 10);
        try {
            if (batterForm.mode === 'add') {
                await dispatch(
                    addOpponentBatter({
                        opponentTeamId: selectedOpponent.id,
                        params: { player_name: batterForm.name.trim(), bats: batterForm.bats, jersey_number: jerseyNum },
                    })
                ).unwrap();
            } else if (batterForm.editingId) {
                await dispatch(
                    updateOpponentBatter({
                        id: batterForm.editingId,
                        params: { player_name: batterForm.name.trim(), bats: batterForm.bats, jersey_number: jerseyNum },
                    })
                ).unwrap();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setBatterForm(null);
        } catch (err) {
            setBatterError(typeof err === 'string' ? err : 'Failed to save batter.');
        } finally {
            setBatterSubmitting(false);
        }
    };

    const handleBatterDelete = (b: BatterScoutingProfile) => {
        Alert.alert('Remove batter', `Remove ${b.player_name} from this opponent's roster?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    await dispatch(deleteOpponentBatter(b.id));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    };

    const handleBatterLongPress = (b: BatterScoutingProfile) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const editAction = () =>
            setBatterForm({
                mode: 'edit',
                editingId: b.id,
                name: b.player_name,
                bats: b.bats,
                jersey: b.jersey_number != null ? String(b.jersey_number) : '',
            });
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options: ['Edit', 'Delete', 'Cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2, title: b.player_name },
                (idx) => {
                    if (idx === 0) editAction();
                    else if (idx === 1) handleBatterDelete(b);
                }
            );
        } else {
            Alert.alert(b.player_name, undefined, [
                { text: 'Edit', onPress: editAction },
                { text: 'Delete', style: 'destructive', onPress: () => handleBatterDelete(b) },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    if (detailLoading && !selectedOpponent) return <LoadingScreen message="Loading…" />;
    if (!selectedOpponent) return null;

    return (
        <>
            <Stack.Screen options={{ title: selectedOpponent.name, headerBackTitle: 'Opponents' }} />
            <ScrollView
                style={[styles.container, { backgroundColor: theme.colors.background }]}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={detailLoading} onRefresh={load} />}
            >
                <View style={styles.metaRow}>
                    {[selectedOpponent.city, selectedOpponent.level].filter(Boolean).map((v, i) => (
                        <Text key={i} style={styles.badge}>
                            {v}
                        </Text>
                    ))}
                    {selectedOpponent.games_played > 0 && (
                        <Text style={styles.badge}>{selectedOpponent.games_played}G charted</Text>
                    )}
                </View>

                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Pitchers
                    </Text>
                    {!pitcherForm && (
                        <Button
                            mode="contained-tonal"
                            compact
                            icon="plus"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPitcherError('');
                                setPitcherForm(emptyPitcherForm);
                            }}
                        >
                            Add
                        </Button>
                    )}
                </View>

                {pitcherForm && (
                    <PitcherInlineForm
                        state={pitcherForm}
                        onChange={setPitcherForm}
                        onSubmit={handlePitcherSubmit}
                        onCancel={() => {
                            setPitcherForm(null);
                            setPitcherError('');
                        }}
                        submitting={pitcherSubmitting}
                        error={pitcherError}
                    />
                )}

                {selectedOpponent.pitchers.length === 0 ? (
                    <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                        No pitchers yet. Tap Add above, or chart a game to populate this roster automatically.
                    </Text>
                ) : (
                    selectedOpponent.pitchers.map((p) => (
                        <PitcherCard
                            key={p.id}
                            pitcher={p}
                            onEdit={(pp) =>
                                setPitcherForm({
                                    mode: 'edit',
                                    editingId: pp.id,
                                    name: pp.pitcher_name,
                                    throws: pp.throws,
                                    jersey: pp.jersey_number != null ? String(pp.jersey_number) : '',
                                })
                            }
                            onDelete={handlePitcherDelete}
                        />
                    ))
                )}

                <Divider style={{ marginVertical: 16 }} />

                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                        Batters
                    </Text>
                    {!batterForm && (
                        <Button
                            mode="contained-tonal"
                            compact
                            icon="plus"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setBatterError('');
                                setBatterForm(emptyBatterForm);
                            }}
                        >
                            Add
                        </Button>
                    )}
                </View>

                {batterForm && (
                    <BatterInlineForm
                        state={batterForm}
                        onChange={setBatterForm}
                        onSubmit={handleBatterSubmit}
                        onCancel={() => {
                            setBatterForm(null);
                            setBatterError('');
                        }}
                        submitting={batterSubmitting}
                        error={batterError}
                    />
                )}

                {selectedOpponent.batters.length === 0 ? (
                    <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
                        No batters yet. Tap Add above, or chart an opponent lineup to populate this roster automatically.
                    </Text>
                ) : (
                    <Card style={styles.rosterCard}>
                        {selectedOpponent.batters.map((b, idx) => (
                            <React.Fragment key={b.id}>
                                <Card.Content style={styles.rosterRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="bodyMedium">{b.player_name}</Text>
                                        <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                                            {b.bats}HH{b.jersey_number != null ? ` · #${b.jersey_number}` : ''}
                                        </Text>
                                    </View>
                                    <IconButton icon="dots-vertical" size={20} onPress={() => handleBatterLongPress(b)} />
                                </Card.Content>
                                {idx < selectedOpponent.batters.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </Card>
                )}
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    badge: {
        backgroundColor: '#e5e7eb',
        color: '#374151',
        fontSize: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { marginBottom: 0 },
    rosterCard: { marginBottom: 10 },
    rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    meta: { fontSize: 12, marginTop: 2 },
    tendenciesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    statRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    statCell: { alignItems: 'center', minWidth: 64 },
    statValue: { fontSize: 18, fontWeight: '700' },
    statLabel: { fontSize: 11, marginTop: 1 },
    empty: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
    formCard: { marginBottom: 12 },
    formLabel: { marginTop: 12, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        marginBottom: 4,
    },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    errorText: { fontSize: 12, marginTop: 6 },
});
