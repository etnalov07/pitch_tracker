import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Button, useTheme, IconButton, Modal, TextInput, Card } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { PitchType, BullpenIntensity, BullpenPlanWithPitches, Pitch } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchBullpenSession, fetchSessionPitches, fetchPlan } from '../../../src/state';
import { logBullpenPitch, endBullpenSession } from '../../../src/state/bullpen/bullpenSlice';
import { StrikeZone, PitchTypeGrid } from '../../../src/components/live';
import { SessionHeader } from '../../../src/components/bullpen';

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

    const { currentSession, pitches, currentPlan } = useAppSelector((state) => state.bullpen);

    // Pitch entry state
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
    const [velocity, setVelocity] = useState('');
    const [isLogging, setIsLogging] = useState(false);

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
                setTargetLocation({ x: Number(currentPlanPitch.target_x), y: Number(currentPlanPitch.target_y) });
            } else {
                setTargetLocation(null);
            }
        }
    }, [currentPlanPitch?.sequence]);

    // Map bullpen pitches to Pitch-like objects for StrikeZone
    const previousPitchesForZone: Pitch[] = pitches.map((bp) => ({
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
        pitch_result: (bp.result as any) || 'called_strike',
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
            Alert.alert('Missing Info', 'Please select pitch type and location');
            return;
        }
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await dispatch(
                logBullpenPitch({
                    session_id: id,
                    pitch_type: selectedPitchType,
                    target_x: targetLocation?.x,
                    target_y: targetLocation?.y,
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
                setTargetLocation(null);
            }
        } catch {
            Alert.alert('Error', 'Failed to log pitch');
        } finally {
            setIsLogging(false);
        }
    }, [id, selectedPitchType, pitchLocation, targetLocation, velocity, dispatch]);

    const handleEndSession = useCallback(async () => {
        if (!id) return;
        try {
            await dispatch(endBullpenSession({ sessionId: id, notes: sessionNotes || undefined })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowEndModal(false);
            router.replace(`/bullpen/${id}/summary` as any);
        } catch {
            Alert.alert('Error', 'Failed to end session');
        }
    }, [id, sessionNotes, dispatch, router]);

    const canLogPitch = selectedPitchType && pitchLocation && !isLogging && !pitchLimitReached;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton
                    icon="arrow-left"
                    onPress={() => {
                        Alert.alert('Leave Session', 'Are you sure? The session will remain in progress.', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Leave', onPress: () => router.back() },
                        ]);
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
                                <Text variant="bodyMedium" style={styles.planPitchType}>
                                    {PITCH_TYPE_LABELS[currentPlanPitch.pitch_type] || currentPlanPitch.pitch_type}
                                </Text>
                                {currentPlanPitch.instruction && (
                                    <Text variant="bodySmall" style={styles.planInstruction} numberOfLines={1}>
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
                    onTargetSelect={(x, y) => setTargetLocation({ x, y })}
                    onTargetClear={() => setTargetLocation(null)}
                    targetLocation={targetLocation}
                    previousPitches={previousPitchesForZone}
                    disabled={isLogging}
                    compact
                />

                {/* Velocity input */}
                <View style={styles.velocityRow}>
                    <Text variant="labelMedium" style={styles.velocityLabel}>
                        Velocity (mph)
                    </Text>
                    <RNTextInput
                        style={styles.velocityInput}
                        value={velocity}
                        onChangeText={setVelocity}
                        keyboardType="numeric"
                        placeholder="--"
                        placeholderTextColor="#9ca3af"
                        maxLength={3}
                    />
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
            </ScrollView>

            {/* End Session Modal */}
            <Modal visible={showEndModal} onDismiss={() => setShowEndModal(false)} contentContainerStyle={styles.modal}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                    End Session
                </Text>
                <Text variant="bodyMedium" style={styles.modalSubtitle}>
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
    velocityLabel: {
        color: '#374151',
    },
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
        backgroundColor: '#ffffff',
        color: '#111827',
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
    planPitchType: { fontWeight: '600', color: '#111827' },
    planInstruction: { color: '#6b7280', fontStyle: 'italic', flex: 1, minWidth: 80 },
    planProgress: { color: '#334e68', fontWeight: '600' },
    planCompleteText: { color: '#15803d', fontWeight: '600', textAlign: 'center' },
    limitReachedText: { color: '#C62828', fontWeight: '600', textAlign: 'center' },
    logButton: { marginTop: 4 },
    logButtonContent: { paddingVertical: 6 },
    modal: {
        backgroundColor: '#ffffff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: { marginBottom: 4 },
    modalSubtitle: { color: '#6b7280', marginBottom: 16 },
    notesInput: { marginBottom: 16 },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
});
