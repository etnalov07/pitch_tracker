import React from 'react';
import { Button, Dialog, Portal } from 'react-native-paper';
import { BaseRunners, BaserunnerEventType, OpponentLineupPlayer, RunnerBase } from '@pitch-tracker/shared';

import {
    BatterSelectorModal,
    HitterTendenciesModal,
    InningChangeModal,
    MyBatterSelectorModal,
    PitcherSelectorModal,
    PitcherStatsModal,
    PitcherTendenciesModal,
    RunnerAdvancementModal,
    TeamAtBatModal,
} from '../../../src/components/live';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';
import DoublePlayModal from '../../../src/components/live/DoublePlayModal';
import OpposingPitcherModal from '../../../src/components/live/OpposingPitcherModal';
import RunnerEventModal from '../../../src/components/live/RunnerEventModal';
import type { ErrorAdvancement, Throwout } from '../../../src/components/live/RunnerAdvancementModal/RunnerAdvancementModal';
import {
    createOpposingPitcher,
    deleteOpposingPitcher,
    fetchMyTeamLineup,
    fetchOpponentLineup,
    setCurrentMyBatter,
    setCurrentOpposingPitcher,
} from '../../../src/state';
import type { LiveGameController } from './useLiveGameController';
import type { Player } from '@pitch-tracker/shared';

interface LiveGameModalsHandlers {
    handleSelectPitcher: (player: Player) => void | Promise<void>;
    handleSelectBatter: (batter: OpponentLineupPlayer) => void | Promise<void>;
    handleInningChangeConfirm: () => void | Promise<void>;
    handleTeamAtBatConfirm: () => void | Promise<void>;
    handleRecordAdvancement: (
        eventType: 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'advance_on_throw',
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => void | Promise<void>;
    handleRecordBaserunnerOut: (eventType: BaserunnerEventType, runnerBase: RunnerBase) => void | Promise<void>;
    handleDoublePlayConfirm: (outRunners: RunnerBase[], batterReachesFirst: boolean) => void | Promise<void>;
    handleRunnerAdvancementConfirm: (
        newRunners: BaseRunners,
        runsScored: number,
        throwouts?: Throwout[],
        errorAdvancements?: ErrorAdvancement[]
    ) => void | Promise<void>;
    advanceInningWithRuns: (runs: number) => void | Promise<void>;
}

interface LiveGameModalsProps {
    ctl: LiveGameController;
    handlers: LiveGameModalsHandlers;
}

/**
 * The Portal modal stack mounted alongside the Live Game tablet + phone layouts.
 * Extracted from `live.tsx` as part of UX audit item C continuation 2 (JSX split).
 * Wraps every modal that's keyed off LiveGameController visibility flags.
 */
const LiveGameModals: React.FC<LiveGameModalsProps> = ({ ctl, handlers }) => {
    const {
        id,
        dispatch,
        isTablet,
        currentInning,
        gamePitchers,
        opponentLineup: _opponentLineup,
        myTeamLineup,
        currentMyBatter,
        baseRunners,
        opposingPitchers,
        currentOpposingPitcher,
        teamPlayers,
        pitcherModalVisible,
        setPitcherModalVisible,
        batterModalVisible,
        setBatterModalVisible,
        myBatterModalVisible,
        setMyBatterModalVisible,
        currentPitcher,
        setCurrentPitcher,
        currentBatter,
        currentOuts,
        showInningChange,
        inningChangeInfo,
        teamRunsScored,
        setTeamRunsScored,
        showTeamAtBat,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        showRunnerEventModal,
        setShowRunnerEventModal,
        setRunnerEventDefaultTab,
        runnerEventDefaultTab,
        runnerActionBase,
        setRunnerActionBase,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        setPendingHitResult,
        showDoublePlayModal,
        setShowDoublePlayModal,
        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,
        showOpposingPitcherModal,
        setShowOpposingPitcherModal,
        showCountBreakdownModal,
        setShowCountBreakdownModal,
        showPitcherStatsModal,
        setShowPitcherStatsModal,
        statsRefreshTrigger,
        gameMode,
        activeBatters,
        lineupSize,
        game,
    } = ctl;

    return (
        <Portal>
            <PitcherSelectorModal
                visible={pitcherModalVisible}
                onDismiss={() => setPitcherModalVisible(false)}
                gamePitchers={gamePitchers}
                currentPitcher={currentPitcher}
                teamPlayers={teamPlayers}
                onSelectExistingPitcher={(gp) => {
                    setCurrentPitcher(gp);
                    setPitcherModalVisible(false);
                }}
                onSelectNewPitcher={handlers.handleSelectPitcher}
                isTablet={isTablet}
            />
            <BatterSelectorModal
                visible={batterModalVisible}
                onDismiss={() => setBatterModalVisible(false)}
                activeBatters={activeBatters}
                currentBatter={currentBatter}
                onSelectBatter={handlers.handleSelectBatter}
                isTablet={isTablet}
                gameId={id!}
                lineupSize={lineupSize}
                onBatterAdded={() => dispatch(fetchOpponentLineup(id!))}
                currentInningNumber={currentInning?.inning_number}
            />
            <MyBatterSelectorModal
                visible={myBatterModalVisible}
                onDismiss={() => setMyBatterModalVisible(false)}
                lineup={myTeamLineup}
                currentBatter={currentMyBatter}
                onSelectBatter={(p) => {
                    dispatch(setCurrentMyBatter(p));
                    setMyBatterModalVisible(false);
                }}
                teamPlayers={teamPlayers}
                currentInningNumber={currentInning?.inning_number}
                onSubstituted={async () => {
                    if (!id) return;
                    const updated = await dispatch(fetchMyTeamLineup(id)).unwrap();
                    if (currentMyBatter) {
                        const stillActive = updated.find((p) => p.id === currentMyBatter.id && !p.replaced_by_id);
                        if (!stillActive) {
                            const replacement = updated.find(
                                (p) => p.batting_order === currentMyBatter.batting_order && !p.replaced_by_id
                            );
                            if (replacement) dispatch(setCurrentMyBatter(replacement));
                        }
                    }
                }}
                isTablet={isTablet}
            />
            <InningChangeModal
                visible={showInningChange}
                inningChangeInfo={inningChangeInfo}
                teamRunsScored={teamRunsScored}
                onRunsChange={setTeamRunsScored}
                onConfirm={handlers.handleInningChangeConfirm}
                onDismiss={() => handlers.advanceInningWithRuns(0)}
                isTablet={isTablet}
                showRunsInput={game?.scouting_focus === 'home' || game?.scouting_focus === 'away'}
            />
            <TeamAtBatModal
                visible={showTeamAtBat}
                inning={game?.current_inning || 1}
                inningHalf={game?.inning_half || 'top'}
                teamRunsScored={teamAtBatRuns}
                onRunsChange={setTeamAtBatRuns}
                onConfirm={handlers.handleTeamAtBatConfirm}
                onDismiss={() => setShowTeamAtBat(false)}
                isTablet={isTablet}
            />
            <RunnerEventModal
                visible={showRunnerEventModal}
                onDismiss={() => setShowRunnerEventModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                defaultTab={runnerEventDefaultTab}
                onRecordAdvancement={handlers.handleRecordAdvancement}
                onRecordOut={handlers.handleRecordBaserunnerOut}
            />
            <DoublePlayModal
                visible={showDoublePlayModal}
                onDismiss={() => setShowDoublePlayModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                onConfirm={handlers.handleDoublePlayConfirm}
            />
            <RunnerAdvancementModal
                visible={showRunnerAdvancementModal}
                onDismiss={() => {
                    setShowRunnerAdvancementModal(false);
                    setPendingHitResult(null);
                }}
                currentRunners={baseRunners}
                hitResult={pendingHitResult || 'single'}
                onConfirm={handlers.handleRunnerAdvancementConfirm}
            />
            {currentPitcher && (
                <PitcherTendenciesModal
                    visible={showPitcherTendencies}
                    onDismiss={() => setShowPitcherTendencies(false)}
                    pitcherId={currentPitcher.player_id}
                    pitcherName={
                        currentPitcher.player ? `${currentPitcher.player.first_name} ${currentPitcher.player.last_name}` : 'Pitcher'
                    }
                    initialBatterHand={currentBatter?.bats === 'L' ? 'L' : 'R'}
                />
            )}
            {currentBatter && (
                <HitterTendenciesModal
                    visible={showHitterTendencies}
                    onDismiss={() => setShowHitterTendencies(false)}
                    batterId={currentBatter.id}
                    batterName={currentBatter.player_name}
                    batterType="opponent"
                    gameId={id}
                />
            )}
            {game && game.charting_mode !== 'our_pitcher' && id && (
                <OpposingPitcherModal
                    visible={showOpposingPitcherModal}
                    onDismiss={() => setShowOpposingPitcherModal(false)}
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
                <CountBreakdownModal
                    visible={showCountBreakdownModal}
                    onDismiss={() => setShowCountBreakdownModal(false)}
                    gameId={id}
                    pitcherId={gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined}
                    teamSide={gameMode === 'our_pitcher' ? 'our_team' : 'opponent'}
                    refreshTrigger={statsRefreshTrigger}
                />
            )}
            <PitcherStatsModal
                visible={showPitcherStatsModal}
                onDismiss={() => setShowPitcherStatsModal(false)}
                pitcher={currentPitcher?.player ?? null}
                pitcherId={currentPitcher?.player_id}
                gameId={id}
            />
            {/*
                Runner action dialog — opened when the user taps a runner pip
                in BaseRunnerDiamond (via handleRunnerPress -> setRunnerActionBase).
                Two big buttons route to the existing RunnerEventModal with the
                appropriate tab pre-selected. Saves the vertical space of the
                always-on Runner Adv / Runner Out button row, and gives the
                action a clear target (the runner the coach actually tapped).
            */}
            <Dialog visible={runnerActionBase !== null} onDismiss={() => setRunnerActionBase(null)}>
                <Dialog.Title>
                    Runner on{' '}
                    {runnerActionBase === 'first'
                        ? '1B'
                        : runnerActionBase === 'second'
                          ? '2B'
                          : runnerActionBase === 'third'
                            ? '3B'
                            : ''}
                </Dialog.Title>
                <Dialog.Actions>
                    <Button onPress={() => setRunnerActionBase(null)}>Cancel</Button>
                    <Button
                        mode="outlined"
                        icon="account-remove"
                        onPress={() => {
                            setRunnerEventDefaultTab('out');
                            setShowRunnerEventModal(true);
                            setRunnerActionBase(null);
                        }}
                    >
                        Out
                    </Button>
                    <Button
                        mode="contained"
                        icon="run-fast"
                        onPress={() => {
                            setRunnerEventDefaultTab('advance');
                            setShowRunnerEventModal(true);
                            setRunnerActionBase(null);
                        }}
                    >
                        Advance
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

export default LiveGameModals;
