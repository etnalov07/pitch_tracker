// Bullpen plan editor — UX-BP-10. Mobile counterpart to web's BullpenPlanEditor.
// Coaches can create / edit a plan from the dugout: name, description, max pitch
// count, ordered pitch sequence (type + optional target zone + instruction), and
// pitcher assignments. Param `id` is the planId for edit; pass `new` to create.

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, useTheme, ActivityIndicator, TextInput, Menu, Divider, Checkbox } from 'react-native-paper';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { getNearestPitchCallZone, PitchCallZone, PitchType, Player, PITCH_CALL_ZONE_COORDS } from '@pitch-tracker/shared';

import { bullpenApi } from '../../../src/state/bullpen/api/bullpenApi';
import { useAppDispatch, useAppSelector, fetchTeamPlayers } from '../../../src/state';
import { useToast } from '../../../src/hooks/useToast';
import { StrikeZone } from '../../../src/components/live';
import { colors } from '../../../src/styles/theme';

const ALL_PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curve' },
    { value: 'changeup', label: 'Change' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckle' },
    { value: 'screwball', label: 'Screwball' },
    { value: 'other', label: 'Other' },
];

interface PlanPitchEntry {
    pitch_type: PitchType;
    target_x?: number;
    target_y?: number;
    instruction?: string;
}

export default function BullpenPlanEditorScreen() {
    const router = useRouter();
    const theme = useTheme();
    const toast = useToast();
    const dispatch = useAppDispatch();
    const { id, teamId } = useLocalSearchParams<{ id: string; teamId: string }>();
    const isEditing = id !== 'new';
    const planId = isEditing ? id : undefined;

    const teamPlayers = useAppSelector((state) => state.teams.players) || [];
    const teamPitchers = teamPlayers.filter((p) => p.primary_position === 'P' && p.is_active !== false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [maxPitches, setMaxPitches] = useState('');
    const [pitches, setPitches] = useState<PlanPitchEntry[]>([]);
    const [editingTargetIndex, setEditingTargetIndex] = useState<number | null>(null);
    const [pitchTypeMenuIndex, setPitchTypeMenuIndex] = useState<number | null>(null);
    const [assignedPitcherIds, setAssignedPitcherIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);

    // Load the team roster (for pitcher assignments) whenever this screen is focused.
    useFocusEffect(
        useCallback(() => {
            if (teamId) dispatch(fetchTeamPlayers(teamId));
        }, [teamId, dispatch])
    );

    // Load the plan if editing.
    useEffect(() => {
        if (!planId) return;
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const plan = await bullpenApi.getPlan(planId);
                if (cancelled) return;
                setName(plan.name);
                setDescription(plan.description || '');
                setMaxPitches(plan.max_pitches ? String(plan.max_pitches) : '');
                setPitches(
                    plan.pitches.map((p) => ({
                        pitch_type: p.pitch_type as PitchType,
                        target_x: p.target_x != null ? Number(p.target_x) : undefined,
                        target_y: p.target_y != null ? Number(p.target_y) : undefined,
                        instruction: p.instruction || undefined,
                    }))
                );
                setAssignedPitcherIds(new Set((plan.assignments || []).map((a) => a.pitcher_id)));
            } catch {
                toast.show({ message: 'Failed to load plan', type: 'error' });
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [planId, toast]);

    const addPitch = () => setPitches((prev) => [...prev, { pitch_type: 'fastball' }]);

    const removePitch = (index: number) => {
        setPitches((prev) => prev.filter((_, i) => i !== index));
        if (editingTargetIndex === index) setEditingTargetIndex(null);
    };

    const movePitch = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= pitches.length) return;
        setPitches((prev) => {
            const copy = [...prev];
            [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
            return copy;
        });
        if (editingTargetIndex === index) setEditingTargetIndex(newIndex);
        else if (editingTargetIndex === newIndex) setEditingTargetIndex(index);
    };

    const updatePitch = (index: number, updates: Partial<PlanPitchEntry>) =>
        setPitches((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));

    const handleZoneAsTarget = (zone: PitchCallZone) => {
        if (editingTargetIndex === null) return;
        const coords = PITCH_CALL_ZONE_COORDS[zone];
        updatePitch(editingTargetIndex, { target_x: coords.x, target_y: coords.y });
        setEditingTargetIndex(null);
    };

    const toggleAssignment = (pitcherId: string) =>
        setAssignedPitcherIds((prev) => {
            const next = new Set(prev);
            if (next.has(pitcherId)) next.delete(pitcherId);
            else next.add(pitcherId);
            return next;
        });

    const handleSave = async () => {
        if (!teamId || !name.trim()) return;
        setSaving(true);
        try {
            const planData = {
                team_id: teamId,
                name: name.trim(),
                description: description.trim() || undefined,
                max_pitches: maxPitches ? parseInt(maxPitches, 10) : undefined,
                pitches: pitches.map((p, i) => ({
                    sequence: i + 1,
                    pitch_type: p.pitch_type,
                    target_x: p.target_x,
                    target_y: p.target_y,
                    instruction: p.instruction,
                })),
            };

            let savedPlanId: string;
            if (planId) {
                const updated = await bullpenApi.updatePlan(planId, planData);
                savedPlanId = updated.id;

                // Reconcile assignments — fetch current, diff, add/remove.
                const plan = await bullpenApi.getPlan(savedPlanId);
                const currentIds = new Set((plan.assignments || []).map((a) => a.pitcher_id));
                const toAdd = Array.from(assignedPitcherIds).filter((pid) => !currentIds.has(pid));
                const toRemove = Array.from(currentIds).filter((pid) => !assignedPitcherIds.has(pid));
                if (toAdd.length > 0) await bullpenApi.assignPlan(savedPlanId, toAdd);
                for (const pid of toRemove) await bullpenApi.unassignPlan(savedPlanId, pid);
            } else {
                const created = await bullpenApi.createPlan(planData);
                savedPlanId = created.id;
                const toAdd = Array.from(assignedPitcherIds);
                if (toAdd.length > 0) await bullpenApi.assignPlan(savedPlanId, toAdd);
            }

            toast.show({ message: planId ? 'Plan updated' : 'Plan created', type: 'success' });
            router.back();
        } catch {
            toast.show({ message: 'Failed to save plan', type: 'error' });
        } finally {
            setSaving(false);
        }
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
                <Text variant="titleLarge">{isEditing ? 'Edit Plan' : 'New Plan'}</Text>
                <Button mode="contained" compact onPress={handleSave} disabled={!name.trim() || saving} loading={saving}>
                    Save
                </Button>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Plan metadata */}
                <Text variant="labelLarge" style={styles.sectionLabel}>
                    Plan Details
                </Text>
                <TextInput
                    label="Name *"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    placeholder="e.g., Pre-Game 25 Pitch Routine"
                />
                <TextInput
                    label="Description"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    placeholder="What is this plan for?"
                    multiline
                    numberOfLines={2}
                />
                <TextInput
                    label="Max Pitches (optional)"
                    value={maxPitches}
                    onChangeText={setMaxPitches}
                    mode="outlined"
                    keyboardType="numeric"
                    placeholder="—"
                    maxLength={3}
                />

                {/* Pitch sequence */}
                <Text variant="labelLarge" style={[styles.sectionLabel, { marginTop: 20 }]}>
                    Pitch Sequence ({pitches.length} pitch{pitches.length === 1 ? '' : 'es'})
                </Text>
                {pitches.map((pitch, index) => {
                    const pitchTypeLabel = ALL_PITCH_TYPES.find((t) => t.value === pitch.pitch_type)?.label ?? pitch.pitch_type;
                    const targetActive = editingTargetIndex === index;
                    return (
                        <View
                            key={index}
                            style={[styles.pitchRow, { backgroundColor: theme.colors.surface, borderColor: colors.gray[200] }]}
                        >
                            <View style={styles.pitchRowHeader}>
                                <Text style={[styles.sequenceNumber, { color: colors.blue[700] }]}>{index + 1}</Text>
                                <Menu
                                    visible={pitchTypeMenuIndex === index}
                                    onDismiss={() => setPitchTypeMenuIndex(null)}
                                    anchor={
                                        <Button
                                            mode="outlined"
                                            compact
                                            onPress={() => setPitchTypeMenuIndex(index)}
                                            style={styles.typeBtn}
                                        >
                                            {pitchTypeLabel}
                                        </Button>
                                    }
                                >
                                    {ALL_PITCH_TYPES.map((t) => (
                                        <Menu.Item
                                            key={t.value}
                                            onPress={() => {
                                                updatePitch(index, { pitch_type: t.value });
                                                setPitchTypeMenuIndex(null);
                                            }}
                                            title={t.label}
                                        />
                                    ))}
                                </Menu>
                                <Button
                                    mode={pitch.target_x != null ? 'contained' : 'outlined'}
                                    compact
                                    onPress={() => setEditingTargetIndex(targetActive ? null : index)}
                                    style={styles.targetBtn}
                                >
                                    {pitch.target_x != null ? 'Target ✓' : 'Set Target'}
                                </Button>
                                <View style={styles.moveCol}>
                                    <IconButton
                                        icon="arrow-up"
                                        size={18}
                                        onPress={() => movePitch(index, -1)}
                                        disabled={index === 0}
                                        style={styles.moveBtn}
                                    />
                                    <IconButton
                                        icon="arrow-down"
                                        size={18}
                                        onPress={() => movePitch(index, 1)}
                                        disabled={index === pitches.length - 1}
                                        style={styles.moveBtn}
                                    />
                                </View>
                                <IconButton icon="close" size={18} onPress={() => removePitch(index)} iconColor={colors.red[600]} />
                            </View>
                            <TextInput
                                value={pitch.instruction || ''}
                                onChangeText={(text) => updatePitch(index, { instruction: text })}
                                mode="outlined"
                                placeholder="Instruction (optional)…"
                                dense
                                style={styles.instructionInput}
                            />
                            {targetActive && (
                                <View style={styles.zoneWrap}>
                                    <Text variant="bodySmall" style={{ marginBottom: 6, color: theme.colors.onSurfaceVariant }}>
                                        Tap a zone to set target for pitch #{index + 1}
                                    </Text>
                                    <StrikeZone
                                        onLocationSelect={() => {}}
                                        onTargetZoneSelect={handleZoneAsTarget}
                                        targetZone={
                                            pitch.target_x != null && pitch.target_y != null
                                                ? getNearestPitchCallZone(pitch.target_x, pitch.target_y)
                                                : null
                                        }
                                        compact
                                    />
                                </View>
                            )}
                        </View>
                    );
                })}
                <Button mode="outlined" icon="plus" onPress={addPitch} style={{ marginTop: 4 }}>
                    Add Pitch
                </Button>

                {/* Pitcher assignments */}
                {teamPitchers.length > 0 && (
                    <>
                        <Text variant="labelLarge" style={[styles.sectionLabel, { marginTop: 24 }]}>
                            Assign to Pitchers
                        </Text>
                        <View style={[styles.assignBox, { backgroundColor: theme.colors.surface, borderColor: colors.gray[200] }]}>
                            {teamPitchers.map((pitcher: Player, idx) => (
                                <React.Fragment key={pitcher.id}>
                                    {idx > 0 && <Divider />}
                                    <TouchableOpacity style={styles.assignRow} onPress={() => toggleAssignment(pitcher.id)}>
                                        <Checkbox
                                            status={assignedPitcherIds.has(pitcher.id) ? 'checked' : 'unchecked'}
                                            onPress={() => toggleAssignment(pitcher.id)}
                                        />
                                        <Text style={styles.assignName}>
                                            {pitcher.jersey_number ? `#${pitcher.jersey_number} ` : ''}
                                            {pitcher.first_name} {pitcher.last_name}
                                        </Text>
                                    </TouchableOpacity>
                                </React.Fragment>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    content: { padding: 16, gap: 10 },
    sectionLabel: { marginTop: 4, marginBottom: 4 },
    pitchRow: {
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
        marginBottom: 8,
    },
    pitchRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sequenceNumber: { width: 22, textAlign: 'center', fontWeight: '700', fontSize: 16 },
    typeBtn: { flexShrink: 1 },
    targetBtn: { flexShrink: 0 },
    moveCol: { flexDirection: 'column', marginLeft: 'auto' },
    moveBtn: { margin: 0 },
    instructionInput: { backgroundColor: 'transparent' },
    zoneWrap: { alignItems: 'center', marginTop: 6 },
    assignBox: { borderRadius: 8, borderWidth: 1 },
    assignRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
    assignName: { marginLeft: 4 },
});
