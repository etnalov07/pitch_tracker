import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, Pressable } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { PitchCallAbbrev, PitchCallZone, PitchCallResult, PITCH_CALL_LABELS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import {
    useAppDispatch,
    useAppSelector,
    createPitchCall,
    changePitchCall,
    markCallTransmitted,
    logCallResult,
    fetchGameCalls,
    fetchActiveCall,
    clearPitchCalling,
} from '../../../src/state';
import {
    CallPitchTypeGrid,
    CallZoneGrid,
    CallResultButtons,
    CallHistory,
    BluetoothStatus,
} from '../../../src/components/pitchCalling';
import { speakPitchCall, activateHFPAudio, deactivateHFPAudio, isHFPActive } from '../../../src/utils/pitchCallAudio';
import * as Speech from 'expo-speech';

export default function PitchCallingScreen() {
    const { id: gameId } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const { calls, activeCall, sendingCall } = useAppSelector((state) => state.pitchCalling);
    const { selectedGame, opponentLineup, gamePitchers } = useAppSelector((state) => state.games);

    // Get current batter handedness and pitcher throws for zone label orientation
    const currentBatter = opponentLineup.find((p) => !p.replaced_by_id);
    const currentPitcher = gamePitchers.length > 0 ? gamePitchers[gamePitchers.length - 1] : null;

    // Local UI state
    const [selectedPitch, setSelectedPitch] = useState<PitchCallAbbrev | null>(null);
    const [selectedZone, setSelectedZone] = useState<PitchCallZone | null>(null);
    const [btConnected, setBtConnected] = useState(true);
    const [isChanging, setIsChanging] = useState(false);
    const [hfpActive, setHfpActive] = useState(false);

    // Activate HFP audio routing on mount, deactivate on unmount
    useEffect(() => {
        activateHFPAudio().then(() => setHfpActive(isHFPActive()));
        return () => {
            deactivateHFPAudio();
        };
    }, []);

    const handleTestAudio = useCallback(async () => {
        await activateHFPAudio();
        setHfpActive(isHFPActive());
        return new Promise<void>((resolve, reject) => {
            Speech.speak('Test. Pitch calling audio check.', {
                language: 'en-US',
                rate: 0.9,
                pitch: 1.0,
                onDone: resolve,
                onError: reject,
            });
        });
    }, []);

    // Load existing calls when entering the screen
    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameCalls(gameId));
            dispatch(fetchActiveCall(gameId));
        }
        return () => {
            dispatch(clearPitchCalling());
        };
    }, [gameId, dispatch]);

    // Derive team_id from selected game
    const teamId = selectedGame?.home_team_id || '';

    // Whether we have an active (unsettled) call
    const hasPendingCall = activeCall && !activeCall.result;

    const handleSend = useCallback(async () => {
        if (!selectedPitch || !selectedZone || !gameId || !teamId) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        try {
            let call;
            if (isChanging && activeCall) {
                // Change the active call
                call = await dispatch(
                    changePitchCall({
                        callId: activeCall.id,
                        pitch_type: selectedPitch,
                        zone: selectedZone,
                    })
                ).unwrap();
            } else {
                // New call
                call = await dispatch(
                    createPitchCall({
                        game_id: gameId,
                        team_id: teamId,
                        pitch_type: selectedPitch,
                        zone: selectedZone,
                        inning: selectedGame?.current_inning,
                    })
                ).unwrap();
            }

            // Speak the call via Bluetooth audio
            if (btConnected) {
                await speakPitchCall(selectedPitch, selectedZone, isChanging);
                await dispatch(markCallTransmitted(call.id));
            }

            setIsChanging(false);
        } catch {
            Alert.alert('Error', 'Failed to send pitch call');
        }
    }, [selectedPitch, selectedZone, gameId, teamId, isChanging, activeCall, btConnected, selectedGame, dispatch]);

    const handleResend = useCallback(async () => {
        if (!activeCall || !btConnected) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        await speakPitchCall(activeCall.pitch_type, activeCall.zone, false);
        if (!activeCall.bt_transmitted) {
            await dispatch(markCallTransmitted(activeCall.id));
        }
    }, [activeCall, btConnected, dispatch]);

    const handleChange = useCallback(() => {
        if (!activeCall) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Go back to selection mode with current values pre-loaded
        setSelectedPitch(activeCall.pitch_type);
        setSelectedZone(activeCall.zone);
        setIsChanging(true);
    }, [activeCall]);

    const handleLogResult = useCallback(
        async (result: PitchCallResult) => {
            if (!activeCall) return;

            try {
                await dispatch(logCallResult({ callId: activeCall.id, result })).unwrap();
                // Reset for next pitch
                setSelectedPitch(null);
                setSelectedZone(null);
                setIsChanging(false);
            } catch {
                Alert.alert('Error', 'Failed to log result');
            }
        },
        [activeCall, dispatch]
    );

    const canSend = selectedPitch && selectedZone && !sendingCall;

    // Current call preview text
    const previewText =
        selectedPitch && selectedZone ? `${PITCH_CALL_LABELS[selectedPitch]}, ${PITCH_CALL_ZONE_LABELS[selectedZone]}` : null;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" iconColor="#F0EDE6" onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Pitch Calling</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
                <BluetoothStatus
                    connected={btConnected}
                    hfpActive={hfpActive}
                    onToggle={() => setBtConnected(!btConnected)}
                    onTestAudio={handleTestAudio}
                />

                {/* Selection phase: pick pitch type + zone */}
                {!hasPendingCall || isChanging ? (
                    <>
                        <CallPitchTypeGrid selectedType={selectedPitch} onSelect={setSelectedPitch} disabled={sendingCall} />

                        <CallZoneGrid
                            selectedZone={selectedZone}
                            onSelect={setSelectedZone}
                            disabled={sendingCall}
                            batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                            pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                        />

                        {/* Call preview */}
                        {previewText && (
                            <View style={styles.preview}>
                                <Text style={styles.previewLabel}>{isChanging ? 'CHANGE TO' : 'CALL'}</Text>
                                <Text style={styles.previewText}>{previewText}</Text>
                            </View>
                        )}

                        {/* Send button */}
                        <Pressable
                            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                            onPress={handleSend}
                            disabled={!canSend}
                        >
                            <Text style={styles.sendButtonText}>
                                {sendingCall ? 'SENDING...' : isChanging ? 'SEND CHANGE' : 'SEND'}
                            </Text>
                        </Pressable>
                    </>
                ) : (
                    <>
                        {/* Post-send phase: call has been sent, awaiting result */}
                        <View style={styles.sentCard}>
                            <Text style={styles.sentLabel}>ACTIVE CALL</Text>
                            <Text style={styles.sentPitch}>{PITCH_CALL_LABELS[activeCall!.pitch_type]}</Text>
                            <Text style={styles.sentZone}>{PITCH_CALL_ZONE_LABELS[activeCall!.zone]}</Text>
                            {activeCall!.bt_transmitted && <Text style={styles.transmittedText}>Transmitted</Text>}
                        </View>

                        {/* Resend / Change buttons */}
                        <View style={styles.actionRow}>
                            <Pressable style={styles.resendButton} onPress={handleResend}>
                                <Text style={styles.resendText}>RESEND</Text>
                            </Pressable>
                            <Pressable style={styles.changeButton} onPress={handleChange}>
                                <Text style={styles.changeText}>CHANGE</Text>
                            </Pressable>
                        </View>

                        {/* Result buttons */}
                        <CallResultButtons onResult={handleLogResult} />
                    </>
                )}

                {/* Call History */}
                <CallHistory calls={calls} />
            </ScrollView>
        </SafeAreaView>
    );
}

const AMBER = '#F5A623';
const NAVY = '#0A1628';
const NAVY_LIGHT = '#132240';
const CHALK = '#F0EDE6';
const CHALK_DIM = '#C8C3BA';
const BORDER = '#2A3A55';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NAVY,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CHALK,
        letterSpacing: 0.5,
    },
    scrollContent: {
        flex: 1,
    },
    scrollInner: {
        padding: 16,
        gap: 14,
    },
    // Call preview
    preview: {
        backgroundColor: NAVY_LIGHT,
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: 'center',
    },
    previewLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: CHALK_DIM,
        letterSpacing: 1,
        marginBottom: 4,
    },
    previewText: {
        fontSize: 18,
        fontWeight: '700',
        color: CHALK,
    },
    // Send button
    sendButton: {
        backgroundColor: AMBER,
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.4,
    },
    sendButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: NAVY,
        letterSpacing: 1,
    },
    // Sent state
    sentCard: {
        backgroundColor: NAVY_LIGHT,
        borderRadius: 10,
        padding: 20,
        borderWidth: 1.5,
        borderColor: AMBER,
        alignItems: 'center',
        gap: 4,
    },
    sentLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: AMBER,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    sentPitch: {
        fontSize: 28,
        fontWeight: '800',
        color: CHALK,
    },
    sentZone: {
        fontSize: 16,
        fontWeight: '600',
        color: CHALK_DIM,
    },
    transmittedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#22C55E',
        marginTop: 4,
    },
    // Action row
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    resendButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: AMBER,
        alignItems: 'center',
    },
    resendText: {
        fontSize: 14,
        fontWeight: '700',
        color: AMBER,
        letterSpacing: 0.5,
    },
    changeButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: CHALK_DIM,
        alignItems: 'center',
    },
    changeText: {
        fontSize: 14,
        fontWeight: '700',
        color: CHALK_DIM,
        letterSpacing: 0.5,
    },
});
