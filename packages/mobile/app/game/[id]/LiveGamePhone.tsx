import React from 'react';
import { Pressable, SafeAreaView, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import {
    EditResultModal,
    InPlayModal,
    PitchTypeGrid,
    PreviousAtBatsModal,
    ResultButtons,
    StrikeZone,
} from '../../../src/components/live';
import RadarStatusPill from '../../../src/components/radar/RadarStatusPill';
import { colors } from '../../../src/styles/theme';

import LiveGameModals from './LiveGameModals';
import LiveGameTopBar from './LiveGameTopBar';
import {
    ActualEqualsTargetButton,
    AtBatControls,
    EndHalfScrimmageButton,
    LineupBanner,
    LiveGameHeader,
    PitchBreakdown,
    PitchTypeFilterBar,
    ZoneTapHint,
} from './LiveGameRenderHelpers';
import { styles } from './liveGameStyles';
import type { LiveGameActions } from './useLiveGameActions';
import type { LiveGameController } from './useLiveGameController';

interface LiveGamePhoneProps {
    ctl: LiveGameController;
    actions: LiveGameActions;
}

/**
 * Phone (and tablet portrait) layout for the live-game screen. Single-column,
 * thumb-zone-ordered: StrikeZone -> Send Call -> Velocity -> Result -> Shake
 * -> Undo. Extracted from live.tsx as part of UX audit item C continuation 3b.
 *
 * The tap-zone order is intentional (UX-LG-07): SendCall + Velocity sit above
 * Result because tapping a result auto-logs the pitch, and Shake sits below
 * Result because it's used between pitches, not in the per-pitch tap path.
 */
export default function LiveGamePhone({ ctl, actions }: LiveGamePhoneProps) {
    const {
        id,
        theme,
        game,
        gameMode,
        isScoutingMode,
        isReadOnly,
        pitches,
        filteredGamePitches,
        currentPitcher,
        currentBatter,
        currentOpposingPitcher,
        currentMyBatter,
        pitcherPitchTypes,
        pitchCallingEnabled,
        velocityEnabled,
        radarEnabled,
        radar,
        selectedPitchType,
        setSelectedPitchType,
        selectedResult,
        setSelectedResult,
        targetZone,
        setTargetZone,
        setPitchLocation,
        velocity,
        setVelocity,
        isLogging,
        activeCall,
        sendingCall,
        walkieTalkieActive,
        pendingShakeCount,
        showInPlayModal,
        setShowInPlayModal,
        showPreviousAtBats,
        setShowPreviousAtBats,
        previousAtBatsForCurrentBatter,
        hasPreviousAtBats,
        editResultPitch,
        editResultModalVisible,
        setEditResultModalVisible,
    } = ctl;

    const {
        handleEndGame,
        handleSendCall,
        handleResendCall,
        handleChangeCall,
        handleShake,
        handleTalkPressIn,
        handleTalkPressOut,
        handleEditLastPitchResult,
        handleUndoLastPitch,
        handleLogPitch,
        handleInPlayResult,
        // Modal handler bag for <LiveGameModals>:
        handleSelectPitcher,
        handleSelectBatter,
        handleInningChangeConfirm,
        handleTeamAtBatConfirm,
        handleRecordAdvancement,
        handleRecordBaserunnerOut,
        handleDoublePlayConfirm,
        handleRunnerAdvancementConfirm,
        advanceInningWithRuns,
    } = actions;

    if (!game) return null;

    const modalHandlers = {
        handleSelectPitcher,
        handleSelectBatter,
        handleInningChangeConfirm,
        handleTeamAtBatConfirm,
        handleRecordAdvancement,
        handleRecordBaserunnerOut,
        handleDoublePlayConfirm,
        handleRunnerAdvancementConfirm,
        advanceInningWithRuns,
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LiveGameTopBar game={game} id={id} onEndGame={handleEndGame} />
            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                <LiveGameHeader ctl={ctl} actions={actions} />
                <LineupBanner ctl={ctl} />
                <AtBatControls ctl={ctl} actions={actions} />
                <EndHalfScrimmageButton ctl={ctl} actions={actions} />
                {/* 1. Pitch Type */}
                {!isReadOnly && (
                    <PitchTypeGrid
                        selectedType={selectedPitchType}
                        onSelect={setSelectedPitchType}
                        availablePitchTypes={
                            gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined
                        }
                        disabled={isLogging}
                        compact
                    />
                )}
                {/* 2. Strike Zone (1st tap = target zone, 2nd tap = actual location) */}
                <PitchTypeFilterBar ctl={ctl} />
                {!isReadOnly && <ZoneTapHint ctl={ctl} />}
                <StrikeZone
                    onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetZoneSelect={setTargetZone}
                    onTargetClear={() => {
                        setTargetZone(null);
                        setPitchLocation(null);
                    }}
                    targetZone={targetZone}
                    previousPitches={isReadOnly ? filteredGamePitches : pitches}
                    disabled={isReadOnly || isLogging}
                    compact
                    colorBy={isReadOnly ? 'pitchType' : 'result'}
                    batterSide={
                        !isScoutingMode && gameMode === 'opp_pitcher'
                            ? (currentMyBatter?.player?.bats as 'R' | 'L' | 'S' | undefined)
                            : (currentBatter?.bats as 'R' | 'L' | 'S' | undefined)
                    }
                    pitcherThrows={
                        isScoutingMode || gameMode === 'opp_pitcher'
                            ? (currentOpposingPitcher?.throws as 'R' | 'L' | undefined)
                            : (currentPitcher?.player?.throws as 'R' | 'L' | undefined)
                    }
                />
                {!isReadOnly && <ActualEqualsTargetButton ctl={ctl} />}
                <PitchBreakdown ctl={ctl} />
                {/* Pitch Calling — SEND row (only when pitch type+zone set but no call sent yet) */}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                    <View style={styles.callRow}>
                        <Button
                            mode="contained"
                            onPress={handleSendCall}
                            loading={sendingCall}
                            disabled={sendingCall}
                            style={styles.sendCallButton}
                            labelStyle={{ color: colors.primary[900], fontWeight: '800', letterSpacing: 0.5 }}
                        >
                            {sendingCall
                                ? 'SENDING...'
                                : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                        </Button>
                        <Pressable
                            style={[styles.talkHoldButton, walkieTalkieActive && styles.talkHoldButtonActive]}
                            onPressIn={handleTalkPressIn}
                            onPressOut={handleTalkPressOut}
                        >
                            <Text style={[styles.talkHoldIcon, walkieTalkieActive && styles.talkHoldIconActive]}>🎙</Text>
                            <Text style={[styles.talkHoldLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                {walkieTalkieActive ? 'TALKING...' : 'Hold to Talk'}
                            </Text>
                        </Pressable>
                        <TouchableOpacity
                            onPress={handleShake}
                            style={[styles.shakeBtnInline, { backgroundColor: theme.colors.surface }]}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.shakeBtnText}>SHAKE</Text>
                            {pendingShakeCount > 0 && (
                                <View style={styles.shakeBadge}>
                                    <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && activeCall && (
                    <View style={styles.callBadge}>
                        <Text style={styles.callBadgeText}>
                            Call Sent: {activeCall.pitch_type} → {PITCH_CALL_ZONE_LABELS[activeCall.zone]}
                        </Text>
                        <View style={styles.callActions}>
                            <Button
                                mode="contained"
                                onPress={handleResendCall}
                                compact
                                style={{ backgroundColor: colors.amber[500] }}
                                labelStyle={{ color: colors.primary[900], fontWeight: '700', fontSize: 12 }}
                            >
                                Re-send
                            </Button>
                            <Button mode="outlined" onPress={handleChangeCall} compact labelStyle={{ fontSize: 12 }}>
                                Change
                            </Button>
                            <Pressable
                                style={[styles.talkHoldSmall, walkieTalkieActive && styles.talkHoldButtonActive]}
                                onPressIn={handleTalkPressIn}
                                onPressOut={handleTalkPressOut}
                            >
                                <Text style={[styles.talkHoldSmallLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                    {walkieTalkieActive ? '🎙 TALKING...' : '🎙 Hold to Talk'}
                                </Text>
                            </Pressable>
                            <TouchableOpacity
                                onPress={handleShake}
                                style={[styles.shakeBtnInline, { backgroundColor: theme.colors.surface }]}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.shakeBtnText}>SHAKE</Text>
                                {pendingShakeCount > 0 && (
                                    <View style={styles.shakeBadge}>
                                        <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {/* Velocity (optional, setting-gated) — must stay above Result; result-tap logs the pitch */}
                {!isReadOnly && velocityEnabled && (
                    <View style={styles.veloRow}>
                        <Text style={styles.veloLabel}>MPH</Text>
                        <TextInput
                            style={styles.veloInput}
                            value={velocity}
                            onChangeText={setVelocity}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.gray[400]}
                            maxLength={3}
                            selectTextOnFocus
                        />
                        {radarEnabled && <RadarStatusPill status={radar.status} lastVelocity={radar.lastVelocity} />}
                    </View>
                )}
                {/* Result — tapping a result logs the pitch. Sits as close to the StrikeZone as possible. */}
                {!isReadOnly && (
                    <ResultButtons
                        selectedResult={selectedResult}
                        onSelect={(r) => {
                            setSelectedResult(r);
                            handleLogPitch(r);
                        }}
                        disabled={isLogging}
                        compact
                    />
                )}
                {/*
                    Undo + Previous At-Bats — both are "between-pitches" affordances and
                    pair naturally on one row. Each side independently conditional.
                    SHAKE is no longer here; it's now inline with the pitch-calling row
                    so it only appears when there's a call UI to be next to.
                */}
                {!isReadOnly && ((pitches.length > 0 && !isLogging) || hasPreviousAtBats) && (
                    <View style={styles.undoPrevRow}>
                        {pitches.length > 0 && !isLogging && (
                            <Button
                                mode="outlined"
                                onPress={handleUndoLastPitch}
                                style={styles.undoButton}
                                contentStyle={styles.logButtonContent}
                                textColor={colors.red[700]}
                                icon="undo"
                                compact
                            >
                                Undo
                            </Button>
                        )}
                        {hasPreviousAtBats && (
                            <Button mode="outlined" onPress={() => setShowPreviousAtBats(true)} icon="history" compact>
                                Previous At-Bats ({previousAtBatsForCurrentBatter.length})
                            </Button>
                        )}
                    </View>
                )}
            </ScrollView>
            <LiveGameModals ctl={ctl} handlers={modalHandlers} />
            <PreviousAtBatsModal
                visible={showPreviousAtBats}
                onClose={() => setShowPreviousAtBats(false)}
                batterName={currentBatter?.player_name || ''}
                completedAtBats={previousAtBatsForCurrentBatter}
            />
            <InPlayModal visible={showInPlayModal} onDismiss={() => setShowInPlayModal(false)} onResult={handleInPlayResult} />
            <EditResultModal
                visible={editResultModalVisible}
                currentResult={editResultPitch?.result}
                onDismiss={() => setEditResultModalVisible(false)}
                onSelect={handleEditLastPitchResult}
            />
        </SafeAreaView>
    );
}
