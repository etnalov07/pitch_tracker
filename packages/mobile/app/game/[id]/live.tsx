import React from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TextInput, Pressable, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, Chip } from 'react-native-paper';
import * as Haptics from '../../../src/utils/haptics';
import { colors, semantic } from '../../../src/styles/theme';
import { PITCH_CALL_ZONE_COORDS, PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import { BatterBreakdownSheet } from '../../../src/components/batterBreakdown';
import { fetchGameById, setCurrentGameRole } from '../../../src/state';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import RadarStatusPill from '../../../src/components/radar/RadarStatusPill';
import LiveGameModals from './LiveGameModals';
import LiveGameTopBar from './LiveGameTopBar';
import { useLiveGameController } from './useLiveGameController';
import { useLiveGameActions } from './useLiveGameActions';
import {
    StrikeZone,
    PITCH_TYPE_COLORS,
    PITCH_TYPE_LABELS,
    PitchTypeGrid,
    ResultButtons,
    GameHeader,
    InPlayModal,
    PitcherSelectorModal,
    BatterSelectorModal,
    MyBatterSelectorModal,
    InningChangeModal,
    TeamAtBatModal,
    RunnerAdvancementModal,
    PreviousAtBatsModal,
    PitcherTendenciesModal,
    HitterTendenciesModal,
    PitcherStatsModal,
    EditResultModal,
} from '../../../src/components/live';
import DoublePlayModal from '../../../src/components/live/DoublePlayModal';
import RunnerEventModal from '../../../src/components/live/RunnerEventModal';
import OpposingPitcherModal from '../../../src/components/live/OpposingPitcherModal';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';
import type { CompletedAtBatEntry } from '../../../src/components/live';
import type { ErrorAdvancement, Throwout } from '../../../src/components/live/RunnerAdvancementModal/RunnerAdvancementModal';
import { SyncStatusBadge, LoadingScreen, ErrorScreen } from '../../../src/components/common';
import { HitLocation } from '../../../src/components/live/InPlayModal';

export default function LiveGameScreen() {
    // All state, effects, derived values, and WebSocket subscription live in this hook.
    // Handlers remain in the component below — they close over destructured values.
    // See `useLiveGameController.ts`.
    const ctl = useLiveGameController();
    const {
        id,
        router,
        theme,
        dispatch,
        toast,
        confirm,
        isTablet,
        isLandscape,
        logPitchOffline,
        currentAtBat,
        currentInning,
        gamePitchers,
        opponentLineup,
        myTeamLineup,
        currentMyBatter,
        pitches,
        baseRunners,
        opposingPitchers,
        currentOpposingPitcher,
        currentGameRole,
        gameStateLoading,
        loading,
        error,
        teamPlayers,
        pitchCallingEnabled,
        velocityEnabled,
        radarEnabled,
        allGamePitches,
        pitchTypeFilter,
        setPitchTypeFilter,
        showBreakdown,
        setShowBreakdown,
        selectedPitchType,
        setSelectedPitchType,
        selectedResult,
        setSelectedResult,
        pitchLocation,
        setPitchLocation,
        targetZone,
        setTargetZone,
        isLogging,
        setIsLogging,
        isLoggingRef,
        currentPitcher,
        setCurrentPitcher,
        currentBatter,
        setCurrentBatter,
        pitcherModalVisible,
        setPitcherModalVisible,
        batterModalVisible,
        setBatterModalVisible,
        pitcherPitchTypes,
        currentOuts,
        setCurrentOuts,
        currentBattingOrder,
        setCurrentBattingOrder,
        showInPlayModal,
        setShowInPlayModal,
        showInningChange,
        setShowInningChange,
        teamRunsScored,
        setTeamRunsScored,
        inningChangeInfo,
        setInningChangeInfo,
        inningEndedByBaserunnerOut,
        setInningEndedByBaserunnerOut,
        showRunnerEventModal,
        setShowRunnerEventModal,
        runnerEventDefaultTab,
        setRunnerEventDefaultTab,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        setPendingHitResult,
        showDoublePlayModal,
        setShowDoublePlayModal,
        showTeamAtBat,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        setCompletedAtBatsByBatter,
        showPreviousAtBats,
        setShowPreviousAtBats,
        activeCall,
        setActiveCall,
        sendingCall,
        setSendingCall,
        changingCallId,
        setChangingCallId,
        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,
        pendingShakeCount,
        setPendingShakeCount,
        velocity,
        setVelocity,
        showOpposingPitcherModal,
        setShowOpposingPitcherModal,
        myBatterModalVisible,
        setMyBatterModalVisible,
        showCountBreakdownModal,
        setShowCountBreakdownModal,
        showPitcherStatsModal,
        setShowPitcherStatsModal,
        statsRefreshTrigger,
        setStatsRefreshTrigger,
        pitcherGamePitchCount,
        editResultPitch,
        setEditResultPitch,
        editResultModalVisible,
        setEditResultModalVisible,
        walkieTalkieActive,
        setWalkieTalkieActive,
        radar,
        game,
        gameMode,
        isScoutingMode,
        scoutingBattingSide,
        scoutingFocus,
        shouldSkipHalf,
        activeBatters,
        lineupSize,
        balls,
        effectiveStrikes,
        strikes,
        isReadOnly,
        filteredGamePitches,
        previousAtBatsForCurrentBatter,
        hasPreviousAtBats,
        hasRunnersOnBase,
        canStartAtBat,
        activePitcherDisplay,
        activeBatterDisplay,
    } = ctl;

    const actions = useLiveGameActions(ctl);
    const {
        advanceInningWithRuns,
        handleEndAtBat: _handleEndAtBat,
        handleInningChangeConfirm,
        handleSkipHalf,
        handleTeamAtBatConfirm,
        handleSelectPitcher,
        handleSelectBatter,
        handleEndGame,
        handleToggleHomeAway,
        handleStartAtBat,
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
        handleRunnerAdvancementConfirm,
        handleRecordBaserunnerOut,
        handleRecordAdvancement,
        handleDoublePlayConfirm,
        handleRunnerPress,
    } = actions;

    if (gameStateLoading || loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <LoadingScreen message="Loading game..." />
            </SafeAreaView>
        );
    }

    if (!game) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Live Game</Text>
                    <View style={{ width: 48 }} />
                </View>
                <ErrorScreen
                    title="Game not found"
                    message={error || 'The game could not be loaded'}
                    onRetry={() => id && dispatch(fetchGameById(id))}
                    onGoBack={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    if (game.status === 'in_progress' && currentGameRole === null) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.roleSelectContainer}>
                    <Text variant="headlineMedium" style={styles.roleSelectTitle}>
                        Join Game
                    </Text>
                    <Text variant="bodyMedium" style={[styles.roleSelectSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Select your role for this session
                    </Text>
                    <View style={styles.roleSelectButtons}>
                        <Button
                            mode="contained"
                            onPress={async () => {
                                // Claim charter — server returns "viewer" if
                                // another user already holds it (one per game).
                                try {
                                    const rec = await gamesApi.assignGameRole(id, 'charter');
                                    dispatch(setCurrentGameRole(rec.role));
                                    if (rec.role === 'viewer') {
                                        toast.show({
                                            message: 'Someone is already charting this game — you have joined as a viewer.',
                                            type: 'info',
                                        });
                                        router.push(`/game/${id}/viewer` as any);
                                    }
                                } catch {
                                    dispatch(setCurrentGameRole('charter'));
                                }
                            }}
                            style={styles.roleButton}
                        >
                            Charter
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={async () => {
                                try {
                                    await gamesApi.assignGameRole(id, 'viewer');
                                } catch {
                                    // Non-fatal — still enter as a viewer locally.
                                }
                                dispatch(setCurrentGameRole('viewer'));
                                router.push(`/game/${id}/viewer` as any);
                            }}
                            style={styles.roleButton}
                        >
                            Viewer
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const renderPitchTypeFilterBar = () => {
        if (!isReadOnly || allGamePitches.length === 0) return null;
        const types = Array.from(new Set(allGamePitches.map((p) => p.pitch_type || 'other')));
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pitchFilterBar}>
                <Chip
                    selected={pitchTypeFilter === 'all'}
                    onPress={() => setPitchTypeFilter('all')}
                    style={[styles.pitchFilterChip, pitchTypeFilter === 'all' && { backgroundColor: theme.colors.primary }]}
                    textStyle={pitchTypeFilter === 'all' ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                    compact
                >
                    All
                </Chip>
                {types.map((type) => (
                    <Chip
                        key={type}
                        selected={pitchTypeFilter === type}
                        onPress={() => setPitchTypeFilter(type)}
                        style={[
                            styles.pitchFilterChip,
                            pitchTypeFilter === type && { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[500] },
                        ]}
                        textStyle={pitchTypeFilter === type ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                        compact
                    >
                        {PITCH_TYPE_LABELS[type] ?? type}
                    </Chip>
                ))}
            </ScrollView>
        );
    };

    const renderPitchBreakdown = () => {
        if (!isReadOnly || allGamePitches.length === 0) return null;
        const byType: Record<string, { count: number; strikes: number; balls: number }> = {};
        for (const pitch of allGamePitches) {
            const t = pitch.pitch_type || 'other';
            if (!byType[t]) byType[t] = { count: 0, strikes: 0, balls: 0 };
            byType[t].count++;
            if (
                pitch.pitch_result === 'called_strike' ||
                pitch.pitch_result === 'swinging_strike' ||
                pitch.pitch_result === 'foul' ||
                pitch.pitch_result === 'in_play'
            ) {
                byType[t].strikes++;
            } else if (pitch.pitch_result === 'ball' || pitch.pitch_result === 'hit_by_pitch') {
                byType[t].balls++;
            }
        }
        const total = allGamePitches.length;
        const totalStrikes = Object.values(byType).reduce((s, v) => s + v.strikes, 0);
        const totalBalls = Object.values(byType).reduce((s, v) => s + v.balls, 0);
        const entries = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
        return (
            <View style={[styles.breakdownTable, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.breakdownTitle}>Pitch Breakdown</Text>
                <View style={[styles.breakdownRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownHeaderText]}>Type</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>#</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>K</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>B</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>%</Text>
                </View>
                {entries.map(([type, stats]) => (
                    <View key={type} style={styles.breakdownRow}>
                        <View style={[styles.breakdownTypeCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                            <View style={[styles.typeColorDot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[400] }]} />
                            <Text style={styles.breakdownText}>{PITCH_TYPE_LABELS[type] ?? type}</Text>
                        </View>
                        <Text style={styles.breakdownNumCell}>{stats.count}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.strikes}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.balls}</Text>
                        <Text style={styles.breakdownNumCell}>{Math.round((stats.count / total) * 100)}%</Text>
                    </View>
                ))}
                <View style={[styles.breakdownRow, styles.breakdownTotalRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownTotalText]}>Total</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{total}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalStrikes}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalBalls}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>100%</Text>
                </View>
            </View>
        );
    };

    // Zone-tap UX cues (UX-LG-02 / UX-LG-03). Subtitle communicates which tap is being
    // captured; the "Actual = Target" pill is a one-tap shortcut for on-spot pitches so
    // the coach doesn't have to tap the same zone twice.
    const renderZoneTapHint = () => {
        if (!targetZone) {
            return (
                <Text style={styles.zoneHint}>
                    <Text style={styles.zoneHintBold}>Tap target zone</Text>
                    {' · 1st tap'}
                </Text>
            );
        }
        if (!pitchLocation) {
            return (
                <Text style={styles.zoneHint}>
                    <Text style={styles.zoneHintBold}>Tap actual location</Text>
                    {' · 2nd tap (or pin to target below)'}
                </Text>
            );
        }
        return <Text style={[styles.zoneHint, styles.zoneHintReady]}>✓ Target + actual set — tap result to log</Text>;
    };

    const renderActualEqualsTargetButton = () => {
        if (!targetZone || pitchLocation) return null;
        const zc = PITCH_CALL_ZONE_COORDS[targetZone];
        return (
            <Button
                mode="outlined"
                compact
                icon="target"
                style={styles.actualEqualsTargetButton}
                onPress={() => {
                    Haptics.selectionAsync();
                    setPitchLocation({ x: zc.x, y: zc.y });
                }}
            >
                Pitch hit target ({PITCH_CALL_ZONE_LABELS[targetZone]})
            </Button>
        );
    };

    const renderGameHeader = () => (
        <GameHeader
            game={game}
            currentPitcher={activePitcherDisplay}
            currentBatter={activeBatterDisplay}
            balls={balls}
            strikes={strikes}
            outs={currentOuts}
            runners={baseRunners}
            pitcherGamePitchCount={pitcherGamePitchCount}
            onPitcherPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode === 'opp_pitcher'
                        ? () => setShowOpposingPitcherModal(true)
                        : () => setPitcherModalVisible(true)
                    : undefined
            }
            onPitcherStatsPress={
                !isScoutingMode && gameMode === 'our_pitcher' && currentPitcher ? () => setShowPitcherStatsModal(true) : undefined
            }
            onBatterPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode !== 'opp_pitcher'
                        ? () => setBatterModalVisible(true)
                        : () => setMyBatterModalVisible(true)
                    : undefined
            }
            onRunnerPress={game.status === 'in_progress' ? handleRunnerPress : undefined}
            onSwapPress={handleToggleHomeAway}
        />
    );

    const renderAtBatControls = () => {
        if (game.status !== 'in_progress') return null;
        if (shouldSkipHalf) {
            const battingTeamName = scoutingFocus === 'home' ? game.scouting_home_team || 'Home' : game.opponent_name || 'Away';
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>{battingTeamName} batting — not charting this half.</Text>
                    <Button mode="contained" onPress={handleSkipHalf} style={{ marginTop: 8 }} icon="skip-next">
                        Skip to Next Half
                    </Button>
                </View>
            );
        }
        if (canStartAtBat) {
            return (
                <Button
                    mode="contained"
                    onPress={handleStartAtBat}
                    style={styles.startAtBatButton}
                    contentStyle={styles.logButtonContent}
                    icon="baseball-bat"
                >
                    Start At-Bat
                </Button>
            );
        }
        if (gameMode === 'opp_pitcher') {
            if (!currentOpposingPitcher || !currentMyBatter) {
                return (
                    <View style={styles.selectPrompt}>
                        <Text style={styles.selectPromptText}>
                            {!currentOpposingPitcher && !currentMyBatter
                                ? 'Select opposing pitcher and your batter to begin'
                                : !currentOpposingPitcher
                                  ? 'Select the opposing pitcher to begin'
                                  : 'Select your batter to begin'}
                        </Text>
                        {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                            <Button
                                mode="outlined"
                                onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                style={{ marginTop: 8 }}
                            >
                                Setup My Lineup
                            </Button>
                        )}
                        {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                            <Button
                                mode="outlined"
                                onPress={() => router.push(`/game/${id}/lineup` as any)}
                                style={{ marginTop: 8 }}
                            >
                                Setup Opponent Lineup
                            </Button>
                        )}
                    </View>
                );
            }
            return null;
        }
        if (!currentPitcher || !currentBatter) {
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>
                        {!currentPitcher && !currentBatter
                            ? 'Select a pitcher and batter to begin'
                            : !currentPitcher
                              ? 'Select a pitcher to begin'
                              : 'Select a batter to begin'}
                    </Text>
                    {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                        <Button mode="outlined" onPress={() => router.push(`/game/${id}/lineup` as any)} style={{ marginTop: 8 }}>
                            Setup Opponent Lineup
                        </Button>
                    )}
                    {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                        <Button
                            mode="outlined"
                            onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                            style={{ marginTop: 8 }}
                        >
                            Setup My Lineup
                        </Button>
                    )}
                </View>
            );
        }
        return null;
    };

    // Modals are mounted via <LiveGameModals> below — see ./LiveGameModals.tsx.
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

    const renderRunnerOutButton = () => {
        if (isScoutingMode || game.status !== 'in_progress' || !hasRunnersOnBase) return null;
        return (
            <View style={styles.runnerActionRow}>
                <Button
                    mode="outlined"
                    onPress={() => {
                        setRunnerEventDefaultTab('advance');
                        setShowRunnerEventModal(true);
                    }}
                    style={styles.runnerOutButton}
                    icon="run-fast"
                    compact
                >
                    Runner Adv
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => {
                        setRunnerEventDefaultTab('out');
                        setShowRunnerEventModal(true);
                    }}
                    style={styles.runnerOutButton}
                    icon="account-remove"
                    compact
                >
                    Runner Out
                </Button>
            </View>
        );
    };

    // Tablet landscape layout
    if (isTablet && isLandscape) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <LiveGameTopBar
                    game={game}
                    id={id}
                    onEndGame={handleEndGame}
                    onBatterBreakdown={id ? () => setShowBreakdown(true) : undefined}
                />
                <View style={styles.tabletContent}>
                    <View style={styles.statsPanel}>
                        {renderGameHeader()}
                        {game.charting_mode !== 'our_pitcher' &&
                            !isScoutingMode &&
                            myTeamLineup.length === 0 &&
                            game.status === 'in_progress' && (
                                <View style={styles.lineupBanner}>
                                    <Text style={styles.lineupBannerText}>My team lineup not set</Text>
                                    <Button
                                        mode="contained"
                                        compact
                                        onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                        style={styles.lineupBannerBtn}
                                    >
                                        Set Lineup
                                    </Button>
                                </View>
                            )}
                        {renderRunnerOutButton()}
                        {renderAtBatControls()}
                        {game.status === 'in_progress' && (currentPitcher || currentBatter) && (
                            <View style={styles.tendenciesRow}>
                                {currentPitcher && (
                                    <Button
                                        mode="outlined"
                                        compact
                                        onPress={() => setShowPitcherTendencies(true)}
                                        style={styles.tendencyBtn}
                                        labelStyle={styles.tendencyBtnLabel}
                                        icon="chart-bar"
                                    >
                                        Pitcher
                                    </Button>
                                )}
                                {currentBatter && (
                                    <Button
                                        mode="outlined"
                                        compact
                                        onPress={() => setShowHitterTendencies(true)}
                                        style={[styles.tendencyBtn, styles.tendencyBtnHitter]}
                                        labelStyle={[styles.tendencyBtnLabel, styles.tendencyBtnLabelHitter]}
                                        icon="account-details"
                                    >
                                        Hitter
                                    </Button>
                                )}
                            </View>
                        )}
                        {game.status === 'in_progress' && game.charting_mode !== 'our_pitcher' && (
                            <View style={styles.tendenciesRow}>
                                <Button
                                    mode="outlined"
                                    compact
                                    onPress={() => setShowOpposingPitcherModal(true)}
                                    style={styles.tendencyBtn}
                                    labelStyle={styles.tendencyBtnLabel}
                                    icon="baseball"
                                >
                                    {currentOpposingPitcher ? currentOpposingPitcher.pitcher_name.split(' ').pop() : 'Opp. Pitcher'}
                                </Button>
                                <Button
                                    mode="outlined"
                                    compact
                                    onPress={() => setShowCountBreakdownModal(true)}
                                    style={styles.tendencyBtn}
                                    labelStyle={styles.tendencyBtnLabel}
                                    icon="counter"
                                >
                                    Counts
                                </Button>
                            </View>
                        )}
                        <View style={styles.statsPlaceholder}>
                            <Text variant="titleSmall" style={{ marginTop: 16 }}>
                                Pitcher Stats
                            </Text>
                            <Text variant="bodySmall" style={styles.placeholder}>
                                Total Pitches: {pitches.length}
                            </Text>
                        </View>
                    </View>
                    <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainPanelContent}>
                        {renderPitchTypeFilterBar()}
                        {!isReadOnly && renderZoneTapHint()}
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
                        />
                        {!isReadOnly && renderActualEqualsTargetButton()}
                        {renderPitchBreakdown()}
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
                                            : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
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
                            <View style={styles.controlsRow}>
                                <View style={styles.controlsHalf}>
                                    <PitchTypeGrid
                                        selectedType={selectedPitchType}
                                        onSelect={setSelectedPitchType}
                                        availablePitchTypes={
                                            gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0
                                                ? pitcherPitchTypes
                                                : undefined
                                        }
                                        disabled={isLogging}
                                    />
                                </View>
                                <View style={styles.controlsHalf}>
                                    <ResultButtons
                                        selectedResult={selectedResult}
                                        onSelect={(r) => {
                                            setSelectedResult(r);
                                            handleLogPitch(r);
                                        }}
                                        disabled={isLogging}
                                    />
                                </View>
                            </View>
                        )}
                        {!isReadOnly && !isScoutingMode && pitchCallingEnabled && (
                            <View style={styles.shakeRow}>
                                <TouchableOpacity
                                    onPress={handleShake}
                                    style={[styles.shakeBtn, { backgroundColor: theme.colors.surface }]}
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
                        {!isReadOnly && pitches.length > 0 && !isLogging && (
                            <View style={styles.logRow}>
                                <Button
                                    mode="outlined"
                                    onPress={handleUndoLastPitch}
                                    style={styles.undoButton}
                                    contentStyle={styles.logButtonContent}
                                    textColor={colors.red[700]}
                                    icon="undo"
                                >
                                    Undo
                                </Button>
                            </View>
                        )}
                        {!isReadOnly && hasPreviousAtBats && (
                            <Button
                                mode="outlined"
                                onPress={() => setShowPreviousAtBats(true)}
                                style={styles.previousAtBatsButton}
                                icon="history"
                            >
                                Previous At-Bats ({previousAtBatsForCurrentBatter.length})
                            </Button>
                        )}
                    </ScrollView>
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

    // Phone/tablet portrait layout
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LiveGameTopBar game={game} id={id} onEndGame={handleEndGame} />
            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                {renderGameHeader()}
                {game.charting_mode !== 'our_pitcher' &&
                    !isScoutingMode &&
                    myTeamLineup.length === 0 &&
                    game.status === 'in_progress' && (
                        <View style={styles.lineupBanner}>
                            <Text style={styles.lineupBannerText}>My team lineup not set</Text>
                            <Button
                                mode="contained"
                                compact
                                onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                style={styles.lineupBannerBtn}
                            >
                                Set Lineup
                            </Button>
                        </View>
                    )}
                {renderRunnerOutButton()}
                {renderAtBatControls()}
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
                {renderPitchTypeFilterBar()}
                {!isReadOnly && renderZoneTapHint()}
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
                {!isReadOnly && renderActualEqualsTargetButton()}
                {renderPitchBreakdown()}
                {/*
                    Phone tap-zone order (UX-LG-07 reorder):
                    StrikeZone (above) -> Send Call (contextual, only when pitch type+zone set) ->
                    Velocity (only if enabled) -> ResultButtons -> Shake (calling only, moved below) -> Undo.

                    SendCall + Velocity have to stay above ResultButtons because tapping a result
                    auto-logs the pitch. Shake is between pitches, not in the per-pitch tap path,
                    so it moves below Result to tighten the zone -> result distance.
                */}
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
                {/* Shake — used between pitches, not in per-pitch tap path. Below Result. */}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && (
                    <View style={styles.shakeRow}>
                        <TouchableOpacity
                            onPress={handleShake}
                            style={[styles.shakeBtn, { backgroundColor: theme.colors.surface }]}
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
                {/* Undo */}
                {!isReadOnly && pitches.length > 0 && !isLogging && (
                    <View style={styles.logRow}>
                        <Button
                            mode="outlined"
                            onPress={handleUndoLastPitch}
                            style={styles.undoButton}
                            contentStyle={styles.logButtonContent}
                            textColor={colors.red[700]}
                            icon="undo"
                        >
                            Undo
                        </Button>
                    </View>
                )}
                {/* 7. Previous At-Bats (hidden on first at-bat) */}
                {!isReadOnly && hasPreviousAtBats && (
                    <Button
                        mode="outlined"
                        onPress={() => setShowPreviousAtBats(true)}
                        style={styles.previousAtBatsButton}
                        icon="history"
                    >
                        Previous At-Bats ({previousAtBatsForCurrentBatter.length})
                    </Button>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    tabletContent: { flex: 1, flexDirection: 'row' },
    statsPanel: { width: 320, borderRightWidth: 1, borderRightColor: 'rgba(128,128,128,0.25)', padding: 16 },
    statsPlaceholder: { marginTop: 16 },
    mainPanel: { flex: 1 },
    mainPanelContent: { padding: 16 },
    controlsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    controlsHalf: { flex: 1 },
    phoneContent: { flex: 1 },
    phoneContentInner: { padding: 10, gap: 8 },
    placeholder: { marginTop: 4, opacity: 0.7 },
    logButton: { marginTop: 4 },
    logRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    undoButton: { borderColor: colors.red[700] },
    logButtonContent: { paddingVertical: 6 },
    previousAtBatsButton: { marginTop: 8 },
    zoneHint: { fontSize: 12, opacity: 0.75, marginBottom: 4, marginTop: 2 },
    zoneHintBold: { fontWeight: '700' },
    zoneHintReady: { color: colors.green[600] },
    actualEqualsTargetButton: { marginTop: 4 },
    startAtBatButton: { marginTop: 6 },
    selectPrompt: { marginTop: 6, padding: 12, backgroundColor: semantic.warningBg, borderRadius: 8, alignItems: 'center' },
    selectPromptText: { color: semantic.warningText, fontSize: 14, fontWeight: '500' },
    runnerActionRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6, flexWrap: 'wrap' as const },
    runnerOutButton: { alignSelf: 'flex-start' },
    tendenciesRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6 },
    tendencyBtn: { flex: 1 },
    tendencyBtnHitter: { borderColor: colors.green[600] },
    tendencyBtnLabel: { fontSize: 11 },
    tendencyBtnLabelHitter: { color: colors.green[600] },
    callRow: {
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'stretch' as const,
    },
    sendCallButton: {
        flex: 1,
        backgroundColor: colors.amber[500],
    },
    talkHoldButton: {
        borderWidth: 2,
        borderColor: colors.purple[600],
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 2,
    },
    talkHoldButtonActive: {
        borderColor: colors.red[500],
        backgroundColor: 'rgba(239, 68, 68, 0.13)',
    },
    talkHoldIcon: {
        fontSize: 16,
    },
    talkHoldIconActive: {},
    talkHoldLabel: {
        fontSize: 9,
        fontWeight: '700' as const,
        color: colors.purple[600],
    },
    talkHoldLabelActive: {
        color: colors.red[500],
    },
    talkHoldSmall: {
        borderWidth: 1,
        borderColor: colors.purple[600],
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    talkHoldSmallLabel: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: colors.purple[600],
    },
    callBadge: {
        backgroundColor: semantic.successBg,
        borderWidth: 1,
        borderColor: semantic.successBorder,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center' as const,
    },
    callBadgeText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: semantic.successText,
    },
    callActions: {
        flexDirection: 'row' as const,
        gap: 8,
        marginTop: 6,
    },
    shakeRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 4,
        borderTopWidth: 1,
        borderTopColor: colors.gray[200],
        marginTop: 4,
    },
    shakeBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.amber[600],
    },
    shakeBtnText: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: colors.amber[600],
    },
    shakeBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.amber[600],
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    shakeBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '700' as const,
    },
    veloRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    veloLabel: {
        fontSize: 13,
        fontWeight: '600' as const,
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    veloInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.4)',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600' as const,
        textAlign: 'center' as const,
    },
    pitchFilterBar: {
        flexDirection: 'row' as const,
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 6,
    },
    pitchFilterChip: {},
    pitchFilterChipText: {
        fontSize: 12,
    },
    pitchFilterChipTextActive: {
        fontSize: 12,
        color: '#ffffff',
    },
    breakdownTable: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.25)',
        overflow: 'hidden' as const,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700' as const,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    breakdownRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    breakdownHeaderText: {
        fontSize: 11,
        fontWeight: '700' as const,
        opacity: 0.7,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    breakdownTypeCell: {
        flex: 2,
        fontSize: 13,
    },
    breakdownNumCell: {
        flex: 1,
        fontSize: 13,
        textAlign: 'center' as const,
    },
    breakdownText: {
        fontSize: 13,
    },
    typeColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    breakdownTotalRow: {
        borderBottomWidth: 0,
    },
    breakdownTotalText: {
        fontSize: 13,
        fontWeight: '700' as const,
    },
    roleSelectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    roleSelectTitle: {
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    roleSelectSubtitle: {
        marginBottom: 32,
        textAlign: 'center',
    },
    roleSelectButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    roleButton: {
        minWidth: 120,
    },
    lineupBanner: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: semantic.warningBg,
        borderWidth: 1,
        borderColor: semantic.warningBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
    },
    lineupBannerText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: semantic.warningText,
        flex: 1,
    },
    lineupBannerBtn: {
        backgroundColor: colors.amber[600],
    },
});
