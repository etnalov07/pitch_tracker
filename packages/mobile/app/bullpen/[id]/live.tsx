import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Button, useTheme, IconButton, Modal, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { PitchType, BullpenPitchResult, BullpenIntensity, Pitch } from '@pitch-tracker/shared';
import { useAppDispatch, useAppSelector, fetchBullpenSession, fetchSessionPitches } from '../../../src/state';
import { logBullpenPitch, endBullpenSession } from '../../../src/state/bullpen/bullpenSlice';
import { StrikeZone, PitchTypeGrid } from '../../../src/components/live';
import { BullpenResultButtons, SessionHeader } from '../../../src/components/bullpen';
import { bullpenApi } from '../../../src/state/bullpen/api/bullpenApi';

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

    const { currentSession, pitches } = useAppSelector((state) => state.bullpen);

    // Pitch entry state
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [selectedResult, setSelectedResult] = useState<BullpenPitchResult | null>(null);
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
        pitch_result: bp.result as any,
        created_at: bp.created_at,
    }));

    const displayName = currentSession
        ? `${currentSession.pitcher_first_name} ${currentSession.pitcher_last_name}`
        : pitcherName || 'Pitcher';
    const displayJersey = currentSession?.pitcher_jersey_number ?? (jerseyNumber ? parseInt(jerseyNumber, 10) : undefined);
    const displayIntensity = (currentSession?.intensity || intensityParam || 'medium') as BullpenIntensity;
    const totalPitches = currentSession?.total_pitches ?? pitches.length;
    const totalStrikes =
        currentSession?.strikes ?? pitches.filter((p) => ['called_strike', 'swinging_strike', 'foul'].includes(p.result)).length;
    const totalBalls = currentSession?.balls ?? pitches.filter((p) => p.result === 'ball').length;

    const handleLogPitch = useCallback(async () => {
        if (!selectedPitchType || !selectedResult || !pitchLocation || !id) {
            Alert.alert('Missing Info', 'Please select pitch type, location, and result');
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
                    result: selectedResult,
                })
            ).unwrap();

            // Reset for next pitch
            setSelectedPitchType(null);
            setSelectedResult(null);
            setPitchLocation(null);
            setTargetLocation(null);
            setVelocity('');
        } catch {
            Alert.alert('Error', 'Failed to log pitch');
        } finally {
            setIsLogging(false);
        }
    }, [id, selectedPitchType, selectedResult, pitchLocation, targetLocation, velocity, dispatch]);

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

    const canLogPitch = selectedPitchType && selectedResult && pitchLocation && !isLogging;

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

                <BullpenResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} compact />

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
                    Log Pitch
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
