import React from 'react';
import { Pressable, SafeAreaView, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { BatterBreakdownSheet } from '../../../src/components/batterBreakdown';
import {
    BatterHistory,
    CountBreakdownPanel,
    EditResultModal,
    InPlayModal,
    OpposingPitcherPanel,
    PitcherStats,
    PitchTypeGrid,
    PreviousAtBatsModal,
    ResultButtons,
    StrikeZone,
} from '../../../src/components/live';
import RadarStatusPill from '../../../src/components/radar/RadarStatusPill';
import { createOpposingPitcher, deleteOpposingPitcher, setCurrentOpposingPitcher } from '../../../src/state';
import { colors } from '../../../src/styles/theme';

import LiveGameModals from './LiveGameModals';
import LiveGameTopBar from './LiveGameTopBar';
import TendenciesSideRail from './TendenciesSideRail';
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

interface LiveGameTabletProps {
    ctl: LiveGameController;
    actions: LiveGameActions;
}

/**
 * Tablet landscape layout for the live-game screen. Two-column: stats panel
 * on the left, main charting panel on the right. Extracted from live.tsx as
 * part of UX audit item C continuation 3b.
 */
export default function LiveGameTablet({ ctl, actions }: LiveGameTabletProps) {
    const {
        id,
        dispatch,
        theme,
        game,
        gameMode,
        isScoutingMode,
        isReadOnly,
        pitches,
        filteredGamePitches,
        baseRunners: _baseRunners,
        currentPitcher,
        currentBatter,
        opposingPitchers,
        currentOpposingPitcher,
        currentMyBatter,
        statsRefreshTrigger,
        pitcherPitchTypes,
        effectivenessTints,
        effectivenessHeatZones,
        pitchCallingEnabled,
        velocityEnabled,
        radarEnabled,
        radar,
        showBreakdown,
        setShowBreakdown,
        selectedPitchType,
        setSelectedPitchType,
        selectedResult,
        setSelectedResult,
        targetZone,
        setTargetZone,
        pitchLocation,
        setPitchLocation,
        velocity,
        setVelocity,
        isLogging,
        activeCall,
        sendingCall,
        changingCallId,
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
        setShowPitcherTendencies,
        setShowHitterTendencies,
        showPitcherTendencies,
        showHitterTendencies,
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

    // When the tendencies side rail is showing, the main panel narrows — collapse
    // the 50/50 charting split to a single stacked column so the zone + controls
    // stay comfortably sized. Matches TendenciesSideRail's own render condition.
    const tendenciesRailOpen = (showPitcherTendencies && !!currentPitcher) || (showHitterTendencies && !!currentBatter);

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
            <LiveGameTopBar
                game={game}
                id={id}
                onEndGame={handleEndGame}
                onBatterBreakdown={id ? () => setShowBreakdown(true) : undefined}
            />
            <View style={styles.tabletContent}>
                <ScrollView style={styles.statsPanel} contentContainerStyle={styles.statsPanelContent}>
                    <LiveGameHeader ctl={ctl} actions={actions} />
                    <LineupBanner ctl={ctl} />
                    <AtBatControls ctl={ctl} actions={actions} />
                    <EndHalfScrimmageButton ctl={ctl} actions={actions} />
                    {game.status === 'in_progress' && (currentPitcher || currentBatter) && (
                        <View style={styles.tendenciesRow}>
                            {currentPitcher && (
                                <Button
                                    mode={showPitcherTendencies ? 'contained' : 'outlined'}
                                    compact
                                    onPress={() => setShowPitcherTendencies(!showPitcherTendencies)}
                                    style={styles.tendencyBtn}
                                    labelStyle={styles.tendencyBtnLabel}
                                    icon="chart-bar"
                                    accessibilityState={{ selected: showPitcherTendencies }}
                                >
                                    Pitcher
                                </Button>
                            )}
                            {currentBatter && (
                                <Button
                                    mode={showHitterTendencies ? 'contained' : 'outlined'}
                                    compact
                                    onPress={() => setShowHitterTendencies(!showHitterTendencies)}
                                    style={[styles.tendencyBtn, styles.tendencyBtnHitter]}
                                    labelStyle={[styles.tendencyBtnLabel, styles.tendencyBtnLabelHitter]}
                                    icon="account-details"
                                    accessibilityState={{ selected: showHitterTendencies }}
                                >
                                    Hitter
                                </Button>
                            )}
                        </View>
                    )}
                    {/*
                        Web-parity inline sidebar panels — replaces the old "Total Pitches: X"
                        placeholder and the Opp. Pitcher / Counts toggle buttons (those data
                        sets are now always-visible, like the web LiveGame LeftPanel).
                        Order mirrors web: PitcherStats -> BatterHistory -> OpposingPitcher ->
                        CountBreakdown. Tendencies stay behind the toggles above (web gates
                        those too).
                    */}
                    <View style={styles.sidebarPanels}>
                        <PitcherStats
                            pitcher={currentPitcher?.player}
                            pitches={pitches}
                            gameId={id}
                            pitcherId={currentPitcher?.player_id}
                        />
                        {currentBatter && <BatterHistory batterId={currentBatter.id} pitcherId={currentPitcher?.player_id} />}
                        {game.charting_mode !== 'our_pitcher' && id && (
                            <OpposingPitcherPanel
                                gameId={id}
                                opposingPitchers={opposingPitchers}
                                currentOpposingPitcher={currentOpposingPitcher}
                                onSelect={(p) => dispatch(setCurrentOpposingPitcher(p))}
                                onCreate={async (params) => {
                                    await dispatch(createOpposingPitcher(params)).unwrap();
                                }}
                                onDelete={async (pid) => {
                                    await dispatch(deleteOpposingPitcher(pid)).unwrap();
                                }}
                                opponentName={game.opponent_name}
                            />
                        )}
                        {id && (
                            <CountBreakdownPanel
                                gameId={id}
                                pitcherId={gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined}
                                teamSide={gameMode === 'our_pitcher' ? 'our_team' : 'opponent'}
                                refreshTrigger={statsRefreshTrigger}
                            />
                        )}
                    </View>
                </ScrollView>
                <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainPanelContent}>
                    <PitchTypeFilterBar ctl={ctl} />
                    {/* 50/50 charting split — strike zone (target) on the left, pitch-type-above-result
                        controls on the right, so the coach sees the full target and results at once. */}
                    <View style={[styles.chartingRow, tendenciesRailOpen && styles.chartingRowStacked]}>
                        <View style={[styles.chartingCol, tendenciesRailOpen && styles.chartingColStacked]}>
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
                                heatZones={effectivenessHeatZones}
                                showHeatZones={!!effectivenessHeatZones}
                            />
                            {!isReadOnly && <ActualEqualsTargetButton ctl={ctl} />}
                        </View>
                        <View style={[styles.chartingCol, tendenciesRailOpen && styles.chartingColStacked]}>
                            {!isReadOnly && (
                                <PitchTypeGrid
                                    selectedType={selectedPitchType}
                                    onSelect={setSelectedPitchType}
                                    availablePitchTypes={
                                        gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined
                                    }
                                    tintByPitchType={effectivenessTints}
                                    disabled={isLogging}
                                />
                            )}
                            {/* Send Call (optional, setting-gated) */}
                            {!isReadOnly &&
                                !isScoutingMode &&
                                pitchCallingEnabled &&
                                selectedPitchType &&
                                targetZone &&
                                !activeCall && (
                                    <View style={[styles.callRow, { marginTop: 8 }]}>
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
                                                : `${changingCallId ? 'SEND CHANGE' : 'SEND'}: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                                        </Button>
                                        <Pressable
                                            style={[styles.talkHoldButton, walkieTalkieActive && styles.talkHoldButtonActive]}
                                            onPressIn={handleTalkPressIn}
                                            onPressOut={handleTalkPressOut}
                                        >
                                            <Text style={[styles.talkHoldIcon, walkieTalkieActive && styles.talkHoldIconActive]}>
                                                🎙
                                            </Text>
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
                                        {activeCall.bt_transmitted ? '  ✓ Received' : ''}
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
                                            <Text
                                                style={[
                                                    styles.talkHoldSmallLabel,
                                                    walkieTalkieActive && styles.talkHoldLabelActive,
                                                ]}
                                            >
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
                            {/* Velocity (optional, setting-gated) — before Result so it's entered before the pitch is logged */}
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
                            {!isReadOnly && (
                                <ResultButtons
                                    selectedResult={selectedResult}
                                    onSelect={(r) => {
                                        setSelectedResult(r);
                                        handleLogPitch(r);
                                    }}
                                    disabled={isLogging}
                                />
                            )}
                        </View>
                    </View>
                    <PitchBreakdown ctl={ctl} />
                    {/*
                        Undo + Previous At-Bats — both "between-pitches" affordances. SHAKE
                        moved inline with the pitch-calling row (above), so it's not in this
                        bottom row anymore.
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
                <TendenciesSideRail
                    id={id}
                    showPitcher={showPitcherTendencies}
                    showHitter={showHitterTendencies}
                    onClosePitcher={() => setShowPitcherTendencies(false)}
                    onCloseHitter={() => setShowHitterTendencies(false)}
                    currentPitcher={currentPitcher}
                    currentBatter={currentBatter}
                    currentMyBatter={currentMyBatter}
                    gameMode={gameMode}
                />
            </View>
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
            {id && (
                <BatterBreakdownSheet
                    visible={showBreakdown}
                    gameId={id}
                    currentBatterId={currentBatter?.id}
                    currentBatterName={currentBatter?.player_name}
                    onClose={() => setShowBreakdown(false)}
                />
            )}
        </SafeAreaView>
    );
}
