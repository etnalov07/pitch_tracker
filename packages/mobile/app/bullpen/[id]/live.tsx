import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, Button, useTheme, IconButton, Modal, TextInput, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { useToast } from '../../../src/hooks/useToast';
import { useConfirm } from '../../../src/hooks/useConfirm';
import {
    PitchType,
    PitchCallZone,
    PITCH_CALL_ZONE_COORDS,
    getNearestPitchCallZone,
    BullpenIntensity,
    BullpenPlanWithPitches,
    Pitch,
} from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchBullpenSession, fetchSessionPitches, fetchPlan } from '../../../src/state';
import { logBullpenPitch, endBullpenSession } from '../../../src/state/bullpen/bullpenSlice';
import { bullpenApi } from '../../../src/state/bullpen/api/bullpenApi';
import { StrikeZone, PitchTypeGrid } from '../../../src/components/live';
import { SessionHeader } from '../../../src/components/bullpen';
import { colors } from '../../../src/styles/theme';
import { useStalkerRadar } from '../../../src/hooks/useStalkerRadar';
import { RADAR_FEATURE_ENABLED } from '../../../src/utils/stalkerRadar/stalkerRadarService';
import RadarStatusPill from '../../../src/components/radar/RadarStatusPill';

const PITCH_TYPE_LABELS: Record<string, string> = {
    fastball: 'Fastball',
    '4-seam': '4-Seam',
    '2-seam': '2-Seam',
    cutter: 'Cutter',
    sinker: 'Sinker',
    slider: 'Slider',
    curveball: 'Curve',
    changeup: 'Change',
    splitter: 'Splitter',
    knuckleball: 'Knuckle',
    other: 'Other',
};

export default function BullpenLiveScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        pitcherName,
        jerseyNumber,
        intensity: intensityParam,
    } = useLocalSearchParams<{
        pitcherName?: string;
        jerseyNumber?: string;
        intensity?: string;
    }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();

    const { currentSession, pitches, currentPlan } = useAppSelector((state) => state.bullpen);

    // Pitch entry state
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetZone, setTargetZone] = useState<PitchCallZone | null>(null);
    const [velocity, setVelocity] = useState('');
    const [isLogging, setIsLogging] = useState(false);

    // Stalker radar — auto-fills velocity as readings arrive.
    const radarEnabled = useAppSelector((state) => state.settings.radarEnabled);
    const radar = useStalkerRadar();
    useEffect(() => {
        if (radar.lastReadingAt != null && radar.lastVelocity != null) {
            setVelocity(String(radar.lastVelocity));
        }
    }, [radar.lastReadingAt, radar.lastVelocity]);

    // End session modal
    const [showEndModal, setShowEndModal] = useState(false);
    const [sessionNotes, setSessionNotes] = useState('');

    // Load session data
    useEffect(() => {
        if (id) {
            dispatch(fetchBullpenSession(id));
            dispatch(fetchSessionPitches(id));
        }
    }, [id, dispatch]);

    // Load plan if session has one
    useEffect(() => {
        if (currentSession?.plan_id) {
            dispatch(fetchPlan(currentSession.plan_id));
        }
    }, [currentSession?.plan_id, dispatch]);

    // Plan guidance computations
    const planPitches = currentPlan?.pitches || [];
    const hasSequencePlan = planPitches.length > 0;
    const maxPitches = currentPlan?.max_pitches ?? (hasSequencePlan ? planPitches.length : null);
    const pitchLimitReached = maxPitches !== null && pitches.length >= maxPitches;
    const currentPlanPitch = hasSequencePlan && pitches.length < planPitches.length ? planPitches[pitches.length] : null;
    const planComplete = hasSequencePlan && pitches.length >= planPitches.length;

    // Auto-populate pitch type and target from plan
    useEffect(() => {
        if (currentPlanPitch) {
            setSelectedPitchType(currentPlanPitch.pitch_type);
            if (currentPlanPitch.target_x != null && currentPlanPitch.target_y != null) {
                setTargetZone(getNearestPitchCallZone(Number(currentPlanPitch.target_x), Number(currentPlanPitch.target_y)));
            } else {
                setTargetZone(null);
            }
        }
    }, [currentPlanPitch?.sequence]);

    // Map bullpen pitches to Pitch-like objects for StrikeZone. UX-BP-14: drop
    // unscored pitches (bp.result == null) instead of coercing them to
    // 'called_strike' — the old fallback inflated the strike-rate preview.
    // The server auto-scores from location at log time, so this filter only
    // affects legacy rows that lacked a recorded result.
    const previousPitchesForZone: Pitch[] = pitches
        .filter((bp) => bp.result != null)
        .map((bp) => ({
            id: bp.id,
            at_bat_id: '',
            game_id: '',
            pitcher_id: '',
            pitch_number: bp.pitch_number,
            pitch_type: bp.pitch_type,
            velocity: bp.velocity,
            location_x: bp.actual_x,
            location_y: bp.actual_y,
            target_location_x: bp.target_x,
            target_location_y: bp.target_y,
            balls_before: 0,
            strikes_before: 0,
            pitch_result: bp.result as Pitch['pitch_result'],
            created_at: bp.created_at,
        }));

    const displayName = currentSession
        ? `${currentSession.pitcher_first_name} ${currentSession.pitcher_last_name}`
        : pitcherName || 'Pitcher';
    const displayJersey = currentSession?.pitcher_jersey_number ?? (jerseyNumber ? parseInt(jerseyNumber, 10) : undefined);
    const displayIntensity = (currentSession?.intensity || intensityParam || 'medium') as BullpenIntensity;
    const totalPitches = currentSession?.total_pitches ?? pitches.length;
    const totalStrikes =
        currentSession?.strikes ??
        pitches.filter((p) => p.result && ['called_strike', 'swinging_strike', 'foul'].includes(p.result)).length;
    const totalBalls = currentSession?.balls ?? pitches.filter((p) => p.result === 'ball').length;

    const handleLogPitch = useCallback(async () => {
        if (!selectedPitchType || !pitchLocation || !id) {
            toast.show({ message: 'Please select pitch type and location', type: 'error' });
            return;
        }
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await dispatch(
                logBullpenPitch({
                    session_id: id,
                    pitch_type: selectedPitchType,
                    target_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                    target_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                    actual_x: pitchLocation.x,
                    actual_y: pitchLocation.y,
                    velocity: velocity ? parseFloat(velocity) : undefined,
                })
            ).unwrap();

            // Reset for next pitch (plan auto-populate handled by useEffect)
            setPitchLocation(null);
            setVelocity('');
            if (!hasSequencePlan) {
                setSelectedPitchType(null);
                setTargetZone(null);
            }
        } catch {
            toast.show({ message: 'Failed to log pitch', type: 'error' });
        } finally {
            setIsLogging(false);
        }
    }, [id, selectedPitchType, pitchLocation, targetZone, velocity, dispatch, toast, hasSequencePlan]);

    // UX-BP-13: Undo last pitch — same fat-finger affordance as live game.
    const handleUndoLastPitch = useCallback(async () => {
        if (!id || pitches.length === 0 || isLogging) return;
        const last = pitches[pitches.length - 1];
        const ok = await confirm({
            title: 'Undo last pitch?',
            message: `Remove pitch #${last.pitch_number} (${PITCH_TYPE_LABELS[last.pitch_type] || last.pitch_type}) from this session?`,
            confirmLabel: 'Undo',
        });
        if (!ok) return;
        try {
            await bullpenApi.deletePitch(last.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Refetch pitches and the session so the strikes/balls/total counts re-derive.
            await Promise.all([dispatch(fetchSessionPitches(id)).unwrap(), dispatch(fetchBullpenSession(id)).unwrap()]);
        } catch {
            toast.show({ message: 'Failed to undo pitch', type: 'error' });
        }
    }, [id, pitches, isLogging, confirm, dispatch, toast]);

    const handleEndSession = useCallback(async () => {
        if (!id) return;
        try {
            await dispatch(endBullpenSession({ sessionId: id, notes: sessionNotes || undefined })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowEndModal(false);
            router.replace(`/bullpen/${id}/summary` as any);
        } catch {
            toast.show({ message: 'Failed to end session', type: 'error' });
        }
    }, [id, sessionNotes, dispatch, router, toast]);

    const canLogPitch = selectedPitchType && pitchLocation && !isLogging && !pitchLimitReached;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    onPress={async () => {
                        const ok = await confirm({
                            title: 'Leave Session',
                            message: 'Are you sure? The session will remain in progress.',
                            confirmLabel: 'Leave',
                        });
                        if (ok) router.back();
                    }}
                />
                <Text variant="titleLarge">Bullpen</Text>
                <IconButton icon="flag-checkered" onPress={() => setShowEndModal(true)} />
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                <SessionHeader
                    pitcherName={displayName}
                    jerseyNumber={displayJersey}
                    totalPitches={totalPitches}
                    strikes={totalStrikes}
                    balls={totalBalls}
                    intensity={displayIntensity}
                />

                {/* Plan guidance */}
                {pitchLimitReached && (
                    <Card style={styles.planCard} mode="outlined">
                        <Card.Content style={styles.planCardContent}>
                            <Text variant="labelLarge" style={styles.limitReachedText}>
                                Pitch limit reached ({maxPitches} pitches)
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {currentPlan && !pitchLimitReached && currentPlanPitch && (
                    <Card style={styles.planCard} mode="outlined">
                        <Card.Content style={styles.planCardContent}>
                            <View style={styles.planRow}>
                                <Text variant="labelMedium" style={styles.planPitchNum}>
                                    #{pitches.length + 1}
                                    {maxPitches !== null ? `/${maxPitches}` : ''}
                                </Text>
                                <Text variant="bodyMedium" style={[styles.planPitchType, { color: theme.colors.onSurface }]}>
                                    {PITCH_TYPE_LABELS[currentPlanPitch.pitch_type] || currentPlanPitch.pitch_type}
                                </Text>
                                {currentPlanPitch.instruction && (
                                    <Text
                                        variant="bodySmall"
                                        style={[styles.planInstruction, { color: theme.colors.onSurfaceVariant }]}
                                        numberOfLines={1}
                                    >
                                        {currentPlanPitch.instruction}
                                    </Text>
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                )}

                {currentPlan && !pitchLimitReached && planComplete && (
                    <Card style={styles.planCard} mode="outlined">
                        <Card.Content style={styles.planCardContent}>
                            <Text variant="labelMedium" style={styles.planCompleteText}>
                                Plan complete! Continue freestyle or end session.
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {currentPlan && !hasSequencePlan && !pitchLimitReached && maxPitches !== null && (
                    <Card style={styles.planCard} mode="outlined">
                        <Card.Content style={styles.planCardContent}>
                            <Text variant="labelMedium" style={styles.planProgress}>
                                {pitches.length}/{maxPitches} pitches
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                <PitchTypeGrid selectedType={selectedPitchType} onSelect={setSelectedPitchType} disabled={isLogging} compact />

                <StrikeZone
                    onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetZoneSelect={setTargetZone}
                    onTargetClear={() => setTargetZone(null)}
                    targetZone={targetZone}
                    previousPitches={previousPitchesForZone}
                    disabled={isLogging}
                    compact
                />

                {/* Velocity input */}
                <View style={styles.velocityRow}>
                    <Text variant="labelMedium" style={[styles.velocityLabel, { color: theme.colors.onSurface }]}>
                        Velocity (mph)
                    </Text>
                    <RNTextInput
                        style={[styles.velocityInput, { backgroundColor: theme.colors.surface, color: theme.colors.onSurface }]}
                        value={velocity}
                        onChangeText={setVelocity}
                        keyboardType="numeric"
                        placeholder="--"
                        placeholderTextColor="#9ca3af"
                        maxLength={3}
                    />
                    {RADAR_FEATURE_ENABLED && radarEnabled && (
                        <RadarStatusPill status={radar.status} lastVelocity={radar.lastVelocity} />
                    )}
                </View>

                <Button
                    mode="contained"
                    onPress={handleLogPitch}
                    disabled={!canLogPitch}
                    loading={isLogging}
                    style={styles.logButton}
                    contentStyle={styles.logButtonContent}
                >
                    {pitchLimitReached ? 'Limit Reached' : 'Log Pitch'}
                </Button>

                {pitches.length > 0 && !isLogging && (
                    <Button
                        mode="outlined"
                        icon="undo"
                        onPress={handleUndoLastPitch}
                        textColor={colors.red[700]}
                        style={styles.undoButton}
                        compact
                    >
                        Undo Last Pitch
                    </Button>
                )}
            </ScrollView>

            {/* End Session Modal */}
            <Modal
                visible={showEndModal}
                onDismiss={() => setShowEndModal(false)}
                contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
            >
                <Text variant="titleLarge" style={styles.modalTitle}>
                    End Session
                </Text>
                <Text variant="bodyMedium" style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {totalPitches} pitches logged
                </Text>
                <TextInput
                    label="Session Notes (optional)"
                    value={sessionNotes}
                    onChangeText={setSessionNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={styles.notesInput}
                    placeholder="How did the session go?"
                />
                <View style={styles.modalActions}>
                    <Button onPress={() => setShowEndModal(false)}>Cancel</Button>
                    <Button mode="contained" onPress={handleEndSession}>
                        End Session
                    </Button>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    scrollContent: { flex: 1 },
    scrollInner: { padding: 10, gap: 8 },
    velocityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    velocityLabel: {},
    velocityInput: {
        flex: 1,
        height: 36,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    planCard: { marginBottom: 0 },
    planCardContent: { paddingVertical: 8, paddingHorizontal: 12 },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    planPitchNum: {
        color: '#334e68',
        fontWeight: '700',
        backgroundColor: '#d9e2ec',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    planPitchType: { fontWeight: '600' },
    planInstruction: { fontStyle: 'italic', flex: 1, minWidth: 80 },
    planProgress: { color: '#334e68', fontWeight: '600' },
    planCompleteText: { color: '#15803d', fontWeight: '600', textAlign: 'center' },
    limitReachedText: { color: '#C62828', fontWeight: '600', textAlign: 'center' },
    logButton: { marginTop: 4 },
    logButtonContent: { paddingVertical: 6 },
    undoButton: { marginTop: 4, borderColor: colors.red[700] },
    modal: {
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: { marginBottom: 4 },
    modalSubtitle: { marginBottom: 16 },
    notesInput: { marginBottom: 16 },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
});
