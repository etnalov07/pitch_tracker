import { useCallback } from 'react';
import {
    BaseRunners,
    BaserunnerEventType,
    ContactType,
    Inning,
    OpponentLineupPlayer,
    PITCH_CALL_ZONE_COORDS,
    PITCH_TYPE_TO_ABBREV,
    Pitch,
    PitchCall,
    PitchCallAbbrev,
    PitchResult,
    PitchType,
    Player,
    PlayerPosition,
    RunnerBase,
    clearBases,
    getOutsForResult,
    getSuggestedAdvancement,
} from '@pitch-tracker/shared';

import * as Haptics from '../../../src/utils/haptics';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { pitchCallingApi } from '../../../src/state/pitchCalling/api/pitchCallingApi';
import { speakPitchCall } from '../../../src/utils/pitchCallAudio';
import { isPassthroughActive, startPassthrough, stopPassthrough } from '../../../src/utils/walkieTalkie';
import {
    changePitcher,
    clearPitches,
    createAtBat,
    endAtBat,
    endGame,
    fetchCurrentInning,
    fetchGameById,
    fetchMyTeamLineup,
    fetchOpposingPitchers,
    recordBaserunnerEvent,
    setBaseRunners,
    setCurrentAtBat,
    setCurrentMyBatter,
    setCurrentOpposingPitcher,
    toggleHomeAway,
    undoLastPitch,
    updateBaseRunners,
    updatePitch,
} from '../../../src/state';
import type { HitLocation } from '../../../src/components/live/InPlayModal';
import type { ErrorAdvancement, Throwout } from '../../../src/components/live/RunnerAdvancementModal/RunnerAdvancementModal';
import type { LiveGameController } from './useLiveGameController';

/**
 * Live-game action handlers — extracted from `live.tsx` as part of UX audit
 * item C continuation 3. Takes the controller hook's return as input and
 * returns all 25 handler functions. Mirrors web's `useLiveGameActions` shape.
 *
 * Handlers reference each other via closure (handleLogPitch -> handleEndAtBat,
 * handleInPlayResult -> handleEndAtBat, etc.). Putting them in a single hook
 * preserves those closure references with no setter-passing ceremony.
 */
export function useLiveGameActions(ctl: LiveGameController) {
    const {
        id,
        router,
        dispatch,
        toast,
        confirm,
        logPitchOffline,
        currentAtBat,
        currentInning,
        gamePitchers,
        currentMyBatter,
        myTeamLineup,
        currentBatter,
        currentPitcher,
        currentOpposingPitcher,
        opposingPitchers,
        opponentLineup,
        baseRunners,
        pitches,
        selectedPitchType,
        selectedResult,
        pitchLocation,
        targetZone,
        velocity,
        isLoggingRef,
        changingCallId,
        activeCall,
        pendingShakeCount,
        editResultPitch,
        currentBattingOrder,
        currentOuts,
        inningEndedByBaserunnerOut,
        teamRunsScored,
        teamAtBatRuns,
        pendingHitResult,
        setSelectedPitchType,
        setSelectedResult,
        setPitchLocation,
        setTargetZone,
        setVelocity,
        setIsLogging,
        setCurrentPitcher,
        setCurrentBatter,
        setCurrentBattingOrder,
        setCurrentOuts,
        setShowInPlayModal,
        setShowInningChange,
        setShowDoublePlayModal,
        setShowRunnerAdvancementModal,
        setShowTeamAtBat,
        setShowRunnerEventModal,
        setRunnerEventDefaultTab,
        setRunnerActionBase,
        setTeamRunsScored,
        setTeamAtBatRuns,
        setInningChangeInfo,
        setInningEndedByBaserunnerOut,
        setPitcherModalVisible,
        setBatterModalVisible,
        setSendingCall,
        setActiveCall,
        setChangingCallId,
        setPendingShakeCount,
        setWalkieTalkieActive,
        setEditResultPitch,
        setEditResultModalVisible,
        setPendingHitResult,
        setCompletedAtBatsByBatter,
        setStatsRefreshTrigger,
        gameMode,
        isScoutingMode,
        isScrimmageMode,
        scoutingBattingSide,
        game,
        activeBatters,
        balls,
        effectiveStrikes,
        strikes,
    } = ctl;

    // ------------------------------------------------------------------
    // Score / inning / at-bat plumbing
    // ------------------------------------------------------------------

    const updateScoreForRuns = useCallback(
        async (runsScored: number) => {
            if (!id || runsScored <= 0) return;
            const freshGame = await dispatch(fetchGameById(id)).unwrap();
            if (isScoutingMode) {
                if (scoutingBattingSide === 'away') {
                    await gamesApi.updateScore(id, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
                } else {
                    await gamesApi.updateScore(id, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
                }
            } else if (gameMode === 'opp_pitcher') {
                await gamesApi.updateScore(id, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
            } else {
                await gamesApi.updateScore(id, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
            }
            dispatch(fetchGameById(id));
        },
        [id, gameMode, isScoutingMode, scoutingBattingSide, dispatch]
    );

    const startAtBatForBatter = useCallback(
        async (batter: OpponentLineupPlayer, outs: number, inning: Inning | null): Promise<boolean> => {
            if (!id || !inning) return false;
            if (!isScoutingMode && !currentPitcher) return false;
            try {
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: inning.id,
                        opponent_batter_id: batter.id,
                        pitcher_id: isScoutingMode ? undefined : currentPitcher?.player_id,
                        opposing_pitcher_id: isScoutingMode ? currentOpposingPitcher?.id : undefined,
                        batting_order: batter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: outs,
                    })
                ).unwrap();
                return true;
            } catch {
                console.error('Failed to start at-bat');
                return false;
            }
        },
        [id, currentPitcher, currentOpposingPitcher, isScoutingMode, dispatch]
    );

    const findNextActiveBatter = useCallback(
        (batters: OpponentLineupPlayer[], currentOrder: number): OpponentLineupPlayer | null => {
            const sorted = [...batters].sort((a, b) => a.batting_order - b.batting_order);
            if (sorted.length === 0) return null;
            const idx = sorted.findIndex((b) => b.batting_order === currentOrder);
            return sorted[(idx + 1) % sorted.length] ?? null;
        },
        []
    );

    const findInningLeadoffBatter = useCallback(
        (batters: OpponentLineupPlayer[], currentOrder: number, lastOutWasBaserunnerOut: boolean): OpponentLineupPlayer | null => {
            if (lastOutWasBaserunnerOut) {
                const sorted = [...batters].sort((a, b) => a.batting_order - b.batting_order);
                return sorted.find((b) => b.batting_order === currentOrder) ?? null;
            }
            return findNextActiveBatter(batters, currentOrder);
        },
        [findNextActiveBatter]
    );

    const advanceInningWithRuns = useCallback(
        async (runs: number) => {
            if (!id || !game) return;
            try {
                const freshGame = await dispatch(fetchGameById(id)).unwrap();
                const homeScore = freshGame.home_score || 0;
                const awayScore = freshGame.away_score || 0;
                const isHomeGame = freshGame.is_home_game !== false;
                const totalInnings = freshGame.total_innings ?? 7;
                const isLastInningOrLater = freshGame.current_inning >= totalInnings;

                if (isScoutingMode) {
                    if (scoutingBattingSide === 'away') {
                        await gamesApi.updateScore(id, homeScore, awayScore + runs);
                    } else {
                        await gamesApi.updateScore(id, homeScore + runs, awayScore);
                    }
                    await gamesApi.advanceInning(id);
                } else {
                    const newAwayScore = awayScore + runs;
                    await gamesApi.updateScore(id, homeScore, newAwayScore);

                    if (isLastInningOrLater) {
                        if (isHomeGame && homeScore > newAwayScore) {
                            await dispatch(endGame({ gameId: id, finalData: { home_score: homeScore, away_score: newAwayScore } }));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.replace(`/game/${id}` as any);
                            return;
                        }
                        if (!isHomeGame && homeScore !== newAwayScore) {
                            await dispatch(endGame({ gameId: id, finalData: { home_score: homeScore, away_score: newAwayScore } }));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.replace(`/game/${id}` as any);
                            return;
                        }
                    }

                    if (freshGame.is_home_game === false || freshGame.charting_mode === 'both') {
                        await gamesApi.advanceInning(id);
                    } else {
                        await gamesApi.advanceInning(id);
                        await gamesApi.advanceInning(id);
                    }
                }

                dispatch(setBaseRunners(clearBases()));
                const updatedGame = await dispatch(fetchGameById(id)).unwrap();
                const newInning = await gamesApi.getCurrentInning(id);
                setShowInningChange(false);

                if (isScoutingMode) {
                    const newBattingSide = updatedGame.inning_half === 'top' ? 'away' : 'home';
                    const newPitchingSide = updatedGame.inning_half === 'top' ? 'home' : 'away';
                    const newBattingLineup = opponentLineup
                        .filter((p) => p.team_side === newBattingSide && !p.replaced_by_id)
                        .sort((a, b) => a.batting_order - b.batting_order);
                    const firstBatter = newBattingLineup.find((p) => p.batting_order === 1) || newBattingLineup[0] || null;
                    if (firstBatter) {
                        setCurrentBattingOrder(firstBatter.batting_order);
                        setCurrentBatter(firstBatter);
                        if (newInning) await startAtBatForBatter(firstBatter, 0, newInning);
                    } else {
                        setCurrentBatter(null);
                    }
                    const newPitchingPitchers = opposingPitchers.filter((p) => p.team_side === newPitchingSide);
                    if (newPitchingPitchers.length > 0) {
                        dispatch(setCurrentOpposingPitcher(newPitchingPitchers[newPitchingPitchers.length - 1]));
                    } else {
                        dispatch(setCurrentOpposingPitcher(null));
                    }
                    dispatch(fetchCurrentInning(id));
                } else if (freshGame.is_home_game !== false && freshGame.charting_mode !== 'both') {
                    const firstBatter = findInningLeadoffBatter(activeBatters, currentBattingOrder, inningEndedByBaserunnerOut);
                    if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
                    if (firstBatter && newInning) {
                        setCurrentBatter(firstBatter);
                        await startAtBatForBatter(firstBatter, 0, newInning);
                        dispatch(fetchCurrentInning(id));
                    } else {
                        setCurrentBatter(firstBatter);
                        dispatch(fetchCurrentInning(id));
                    }
                } else {
                    await Promise.all([
                        dispatch(fetchOpposingPitchers(id))
                            .unwrap()
                            .catch(() => null),
                        dispatch(fetchMyTeamLineup(id))
                            .unwrap()
                            .catch(() => null),
                    ]);
                    dispatch(fetchCurrentInning(id));
                }
                setInningEndedByBaserunnerOut(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to advance inning', type: 'error' });
            }
        },
        [
            id,
            game,
            currentBattingOrder,
            activeBatters,
            isScoutingMode,
            scoutingBattingSide,
            opponentLineup,
            opposingPitchers,
            dispatch,
            startAtBatForBatter,
            findInningLeadoffBatter,
            inningEndedByBaserunnerOut,
            router,
            toast,
            setShowInningChange,
            setCurrentBattingOrder,
            setCurrentBatter,
            setInningEndedByBaserunnerOut,
        ]
    );

    const handleEndAtBat = useCallback(
        async (
            result: string,
            finalPitch?: Partial<Pitch>,
            extra?: { rbi?: number; runs_scored?: number; outs_before_override?: number }
        ) => {
            if (!currentAtBat) return;
            try {
                const endedAtBat = currentAtBat;
                const endedPitches = finalPitch ? [...pitches, finalPitch as Pitch] : [...pitches];
                const endedBatterId =
                    gameMode === 'opp_pitcher' ? (currentMyBatter?.player_id ?? currentMyBatter?.player?.id) : currentBatter?.id;

                const outsBefore = extra?.outs_before_override ?? currentOuts;
                const outsFromPlay = getOutsForResult(result);
                const newOutCount = outsBefore + outsFromPlay;
                await dispatch(
                    endAtBat({
                        id: endedAtBat.id,
                        data: {
                            result,
                            outs_after: Math.min(newOutCount, 3),
                            rbi: extra?.rbi,
                            runs_scored: extra?.runs_scored,
                        },
                    })
                ).unwrap();
                dispatch(setCurrentAtBat(null));
                dispatch(clearPitches());

                if (endedBatterId) {
                    setCompletedAtBatsByBatter((prev) => ({
                        ...prev,
                        [endedBatterId]: [...(prev[endedBatterId] || []), { atBat: endedAtBat, result, pitches: endedPitches }],
                    }));
                }

                // Scrimmage: no auto-end on 3 outs. Outs just keep accumulating
                // until the coach taps "End Half Inning" — the inning-change modal
                // is suppressed entirely.
                if (outsFromPlay > 0 && newOutCount >= 3 && !isScrimmageMode) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                } else {
                    if (outsFromPlay > 0) setCurrentOuts(newOutCount);
                    if (!isScoutingMode && gameMode === 'opp_pitcher') {
                        const myStarters = myTeamLineup
                            .filter((p) => !p.replaced_by_id)
                            .sort((a, b) => a.batting_order - b.batting_order);
                        const currentMyOrder = currentMyBatter?.batting_order ?? 1;
                        const myLineupSize = myStarters.length;
                        const nextMyOrder = currentMyOrder >= myLineupSize ? 1 : currentMyOrder + 1;
                        const nextMyBatter = myStarters.find((p) => p.batting_order === nextMyOrder) ?? myStarters[0] ?? null;
                        dispatch(setCurrentMyBatter(nextMyBatter));
                    } else {
                        const nextBatter = findNextActiveBatter(activeBatters, currentBattingOrder);
                        if (nextBatter) setCurrentBattingOrder(nextBatter.batting_order);
                        if (nextBatter) {
                            setCurrentBatter(nextBatter);
                            await startAtBatForBatter(nextBatter, outsFromPlay > 0 ? newOutCount : outsBefore, currentInning);
                        } else {
                            setCurrentBatter(null);
                        }
                    }
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to end at-bat', type: 'error' });
            }
        },
        [
            currentAtBat,
            currentOuts,
            currentBattingOrder,
            activeBatters,
            currentInning,
            game,
            pitches,
            currentBatter,
            gameMode,
            isScoutingMode,
            isScrimmageMode,
            currentMyBatter,
            myTeamLineup,
            dispatch,
            startAtBatForBatter,
            findNextActiveBatter,
            toast,
            setCompletedAtBatsByBatter,
            setCurrentOuts,
            setTeamRunsScored,
            setInningChangeInfo,
            setShowInningChange,
            setCurrentBatter,
            setCurrentBattingOrder,
        ]
    );

    const handleInningChangeConfirm = useCallback(async () => {
        await advanceInningWithRuns(parseInt(teamRunsScored, 10) || 0);
    }, [advanceInningWithRuns, teamRunsScored]);

    const handleSkipHalf = useCallback(async () => {
        await advanceInningWithRuns(0);
    }, [advanceInningWithRuns]);

    // Scrimmage manual end-half. Reuses the existing "skip a half" pattern
    // (top -> bottom -> top of next inning) by calling the backend twice
    // directly, so gameMode stays 'our_pitcher' for the entire scrimmage.
    // Bypasses advanceInningWithRuns' score / endGame logic on purpose:
    // scrimmages don't track score and shouldn't auto-end at total_innings.
    const handleEndHalfScrimmage = useCallback(async () => {
        if (!id) return;
        try {
            await gamesApi.advanceInning(id);
            await gamesApi.advanceInning(id);
            dispatch(setBaseRunners(clearBases()));
            setCurrentOuts(0);
            setTeamRunsScored('0');
            setShowInningChange(false);
            await dispatch(fetchGameById(id)).unwrap();
            dispatch(fetchCurrentInning(id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            toast.show({ message: 'Failed to end half-inning', type: 'error' });
        }
    }, [id, dispatch, setCurrentOuts, setTeamRunsScored, setShowInningChange, toast]);

    const handleTeamAtBatConfirm = useCallback(async () => {
        if (!id || !game) return;
        try {
            const runsToAdd = parseInt(teamAtBatRuns, 10) || 0;
            const newHomeScore = (game.home_score || 0) + runsToAdd;
            const awayScore = game.away_score || 0;
            const totalInnings = game.total_innings ?? 7;
            const isLastInningOrLater = game.current_inning >= totalInnings;
            const isHomeGame = game.is_home_game !== false;

            await gamesApi.updateScore(id, newHomeScore, awayScore);

            if (isLastInningOrLater && isHomeGame) {
                if (newHomeScore !== awayScore) {
                    await dispatch(endGame({ gameId: id, finalData: { home_score: newHomeScore, away_score: awayScore } }));
                    setShowTeamAtBat(false);
                    setTeamAtBatRuns('0');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.replace(`/game/${id}` as any);
                    return;
                }
            }

            await gamesApi.advanceInning(id);
            dispatch(setBaseRunners(clearBases()));
            await dispatch(fetchGameById(id)).unwrap();
            const newInning = await gamesApi.getCurrentInning(id);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            const firstBatter = findInningLeadoffBatter(activeBatters, currentBattingOrder, inningEndedByBaserunnerOut);
            if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
                dispatch(fetchCurrentInning(id));
            } else {
                setCurrentBatter(firstBatter);
                dispatch(fetchCurrentInning(id));
            }
            setInningEndedByBaserunnerOut(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            toast.show({ message: 'Failed to advance inning', type: 'error' });
        }
    }, [
        id,
        game,
        teamAtBatRuns,
        currentBattingOrder,
        activeBatters,
        dispatch,
        startAtBatForBatter,
        findInningLeadoffBatter,
        inningEndedByBaserunnerOut,
        router,
        toast,
        setShowTeamAtBat,
        setTeamAtBatRuns,
        setCurrentBattingOrder,
        setCurrentBatter,
        setInningEndedByBaserunnerOut,
    ]);

    const handleSelectPitcher = async (player: Player) => {
        if (!id || !currentInning) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const activePitcher = gamePitchers.find((p) => !p.inning_exited);
        if (activePitcher && activePitcher.player_id === player.id) {
            setPitcherModalVisible(false);
            return;
        }
        try {
            const result = await dispatch(
                changePitcher({ gameId: id, playerId: player.id, inningEntered: game?.current_inning || 1 })
            ).unwrap();
            setCurrentPitcher(result);
            setPitcherModalVisible(false);
        } catch {
            toast.show({ message: 'Failed to change pitcher', type: 'error' });
        }
    };

    const handleSelectBatter = useCallback(
        async (batter: OpponentLineupPlayer) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCurrentBatter(batter);
            if (!currentAtBat) {
                setCurrentBattingOrder(batter.batting_order);
                if (currentInning) {
                    await startAtBatForBatter(batter, currentOuts, currentInning);
                }
            }
            setBatterModalVisible(false);
        },
        [
            currentAtBat,
            currentInning,
            currentOuts,
            startAtBatForBatter,
            setCurrentBatter,
            setCurrentBattingOrder,
            setBatterModalVisible,
        ]
    );

    const handleEndGame = useCallback(async () => {
        if (!id || !game) return;
        const ok = await confirm({
            title: 'End Game',
            message: 'Are you sure you want to end this game? This will mark it as completed.',
            confirmLabel: 'End Game',
            destructive: true,
        });
        if (!ok) return;
        try {
            await gamesApi.endGame(id, { home_score: game.home_score || 0, away_score: game.away_score || 0 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game/${id}/viewer` as any);
        } catch {
            toast.show({ message: 'Failed to end game', type: 'error' });
        }
    }, [id, game, router, confirm, toast]);

    const handleToggleHomeAway = useCallback(async () => {
        if (!id || !game) return;
        if ((game.total_pitches ?? 0) > 0) {
            const newSide = game.is_home_game === false ? 'home' : 'away';
            const ok = await confirm({
                title: 'Swap home/away?',
                message: `${game.total_pitches} pitches already logged. Switching makes your team the ${newSide} team going forward — already-logged pitches keep their inning-half. Scores (opponent vs. your team) stay attached to each team and don't move.`,
                confirmLabel: 'Swap',
            });
            if (!ok) return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await dispatch(toggleHomeAway(id));
    }, [id, game, dispatch, confirm]);

    const handleStartAtBat = useCallback(async () => {
        if (!id || !currentInning) return;
        try {
            if (isScoutingMode) {
                if (!currentOpposingPitcher || !currentBatter) return;
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        opponent_batter_id: currentBatter.id,
                        opposing_pitcher_id: currentOpposingPitcher.id,
                        batting_order: currentBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            } else if (gameMode === 'opp_pitcher') {
                if (!currentOpposingPitcher || !currentMyBatter) return;
                const batterId = currentMyBatter.player_id ?? currentMyBatter.player?.id;
                if (!batterId) {
                    toast.show({ message: 'Batter player record not found. Please re-select the batter.', type: 'error' });
                    return;
                }
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        batter_id: batterId,
                        opposing_pitcher_id: currentOpposingPitcher.id,
                        batting_order: currentMyBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            } else {
                if (!currentPitcher || !currentBatter) return;
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        opponent_batter_id: currentBatter.id,
                        pitcher_id: currentPitcher.player_id,
                        batting_order: currentBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            toast.show({ message: 'Failed to create at-bat. You can still log pitches offline.', type: 'error' });
        }
    }, [
        gameMode,
        isScoutingMode,
        currentPitcher,
        currentBatter,
        currentOpposingPitcher,
        currentMyBatter,
        id,
        currentInning,
        currentOuts,
        dispatch,
        toast,
    ]);

    // ------------------------------------------------------------------
    // Pitch calling
    // ------------------------------------------------------------------

    const toPitchCallAbbrev = (pt: PitchType): PitchCallAbbrev => PITCH_TYPE_TO_ABBREV[pt] ?? 'FB';

    const handleSendCall = async () => {
        if (!selectedPitchType || !targetZone || !id || !game) return;
        setSendingCall(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            const abbrev = toPitchCallAbbrev(selectedPitchType);
            let call: PitchCall;
            if (changingCallId) {
                call = await pitchCallingApi.changeCall(changingCallId, { pitch_type: abbrev, zone: targetZone });
                setChangingCallId(null);
            } else {
                call = await pitchCallingApi.createCall({
                    game_id: id,
                    team_id: game.home_team_id || '',
                    pitch_type: abbrev,
                    zone: targetZone,
                    at_bat_id: currentAtBat?.id,
                    pitcher_id: currentPitcher?.player_id,
                    opponent_batter_id: currentBatter?.id,
                    inning: game.current_inning,
                    balls_before: currentAtBat ? currentAtBat.balls : 0,
                    strikes_before: currentAtBat ? currentAtBat.strikes : 0,
                });
            }
            setActiveCall(call);
            await speakPitchCall(abbrev, targetZone, false, pendingShakeCount);
            await pitchCallingApi.markTransmitted(call.id);
        } catch {
            toast.show({ message: 'Failed to send pitch call', type: 'error' });
        } finally {
            setSendingCall(false);
        }
    };

    const handleResendCall = async () => {
        if (!activeCall) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            await speakPitchCall(activeCall.pitch_type, activeCall.zone, false, pendingShakeCount);
            await pitchCallingApi.markTransmitted(activeCall.id);
        } catch {
            toast.show({ message: 'Failed to re-send call', type: 'error' });
        }
    };

    const handleChangeCall = () => {
        if (!activeCall) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setChangingCallId(activeCall.id);
        setActiveCall(null);
        setTargetZone(null);
        setPitchLocation(null);
    };

    const handleShake = () => {
        setPendingShakeCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleTalkPressIn = async () => {
        try {
            await startPassthrough();
            setWalkieTalkieActive(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err: any) {
            toast.show({ message: err?.message || 'Failed to start walkie-talkie', type: 'error' });
        }
    };

    const handleTalkPressOut = async () => {
        if (isPassthroughActive()) {
            await stopPassthrough();
            setWalkieTalkieActive(false);
        }
    };

    // ------------------------------------------------------------------
    // Pitch logging / Fix Last Pitch / Undo
    // ------------------------------------------------------------------

    const handleEditLastPitchResult = useCallback(
        async (newResult: PitchResult) => {
            if (!editResultPitch) return;
            if (newResult === editResultPitch.result) {
                setEditResultModalVisible(false);
                return;
            }
            const oldResult = editResultPitch.result;
            try {
                const { pitch: updated, atBat: updatedAb } = await gamesApi.updatePitchResult(editResultPitch.id, newResult);
                dispatch(updatePitch(updated));
                dispatch(setCurrentAtBat(updatedAb));
                setEditResultPitch({ id: updated.id, result: updated.pitch_result });
                setEditResultModalVisible(false);
                setStatsRefreshTrigger((prev) => prev + 1);
                toast.show({
                    message: `Updated: ${oldResult.replace(/_/g, ' ')} → ${newResult.replace(/_/g, ' ')}`,
                    type: 'success',
                });
            } catch (err: unknown) {
                const e = err as { status?: number; code?: string; message?: string };
                if (e.status === 409 && e.code === 'AB_BOUNDARY') {
                    toast.show({
                        message: 'This pitch ended the at-bat — use Undo to revert and re-log.',
                        type: 'info',
                        duration: 5000,
                    });
                } else if (e.status === 409) {
                    toast.show({ message: 'Only the most recent pitch can be edited.', type: 'error' });
                } else {
                    toast.show({ message: e.message || 'Failed to update pitch', type: 'error' });
                }
                setEditResultModalVisible(false);
            }
        },
        [editResultPitch, dispatch, toast, setEditResultPitch, setEditResultModalVisible, setStatsRefreshTrigger]
    );

    const handleUndoLastPitch = useCallback(async () => {
        if (pitches.length === 0) return;
        const last = pitches[pitches.length - 1];
        const formatPitchType = (t: string) => t.replace(/_/g, ' ');
        const formatResult = (r: string) => r.replace(/_/g, ' ');
        const ok = await confirm({
            title: 'Undo last pitch?',
            message: `${formatPitchType(last.pitch_type)} — ${formatResult(last.pitch_result)}\nCount before: ${last.balls_before}-${last.strikes_before}`,
            confirmLabel: 'Undo',
            destructive: true,
        });
        if (!ok) return;
        try {
            await dispatch(undoLastPitch(last.id)).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            toast.show({ message: err instanceof Error ? err.message : 'Could not undo pitch', type: 'error' });
        }
    }, [pitches, dispatch, confirm, toast]);

    const handleLogPitch = async (resultOverride?: PitchResult) => {
        if (isLoggingRef.current) return;
        const effectiveResult = resultOverride ?? selectedResult;
        if (!selectedPitchType || !effectiveResult || !pitchLocation) {
            toast.show({ message: 'Please select pitch type and location', type: 'error' });
            return;
        }
        if (!isScoutingMode && gameMode === 'our_pitcher' && !currentPitcher) {
            toast.show({ message: 'Please select a pitcher first', type: 'error' });
            return;
        }
        if (isScoutingMode && (!currentOpposingPitcher || !currentBatter)) {
            toast.show({ message: 'Please select a pitcher and batter first', type: 'error' });
            return;
        }
        isLoggingRef.current = true;
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const veloNum = velocity ? parseFloat(velocity) : undefined;
            const logResult = await logPitchOffline({
                at_bat_id: currentAtBat?.id || '',
                game_id: id!,
                pitcher_id: !isScoutingMode && gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined,
                pitch_type: selectedPitchType,
                pitch_result: effectiveResult,
                location_x: pitchLocation.x,
                location_y: pitchLocation.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                target_zone: targetZone ?? undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                batter_id:
                    !isScoutingMode && gameMode === 'opp_pitcher'
                        ? (currentMyBatter?.player_id ?? currentMyBatter?.player?.id)
                        : undefined,
                opponent_batter_id: isScoutingMode || gameMode === 'our_pitcher' ? currentBatter?.id : undefined,
                balls_before: balls,
                strikes_before: strikes,
                team_side: isScoutingMode ? 'opponent' : gameMode === 'our_pitcher' ? 'our_team' : 'opponent',
            });
            if (!logResult.success) {
                toast.show({ message: 'Failed to log pitch', type: 'error' });
                return;
            }
            // Surface the EDIT affordance for the just-logged pitch (UX-LG-01 Fix Last Pitch).
            if (logResult.pitch?.id) {
                const justLogged = { id: logResult.pitch.id, result: logResult.pitch.pitch_result };
                setEditResultPitch(justLogged);
                toast.show({
                    message: `Logged: ${effectiveResult.replace(/_/g, ' ')}`,
                    type: 'success',
                    duration: 5000,
                    action: {
                        label: 'EDIT',
                        onPress: () => {
                            setEditResultPitch(justLogged);
                            setEditResultModalVisible(true);
                        },
                    },
                });
            }
            setStatsRefreshTrigger((prev) => prev + 1);
            const newBalls = balls + (effectiveResult === 'ball' ? 1 : 0);
            const newStrikes =
                effectiveStrikes +
                (effectiveResult === 'called_strike' || effectiveResult === 'swinging_strike'
                    ? 1
                    : effectiveResult === 'foul' && effectiveStrikes < 2
                      ? 1
                      : 0);
            if (activeCall) {
                // 1:1 result mapping (UX-PC-04) + explicit pitch_id link (UX-PC-05).
                // PitchCallResult now matches PitchResult exactly, so no bucket collapse.
                try {
                    await pitchCallingApi.logResult(activeCall.id, effectiveResult, logResult.pitch?.id);
                } catch {
                    // Non-critical
                }
                setActiveCall(null);
            }
            // Capture pitch data before resetting local state — used to include the final pitch
            // in at-bat history when the at-bat ends in the same call.
            const finalPitch: Partial<Pitch> = {
                pitch_type: selectedPitchType,
                pitch_result: effectiveResult,
                location_x: pitchLocation!.x,
                location_y: pitchLocation!.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                balls_before: balls,
                strikes_before: strikes,
            };
            setSelectedPitchType(null);
            setSelectedResult(null);
            setPitchLocation(null);
            setTargetZone(null);
            setVelocity('');
            setChangingCallId(null);
            setPendingShakeCount(0);
            if (logResult.queued) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (effectiveResult === 'hit_by_pitch' || newBalls >= 4) {
                const endResult = effectiveResult === 'hit_by_pitch' ? 'hit_by_pitch' : 'walk';
                const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
                if (hasRunnersOnBase) {
                    setPendingHitResult(endResult);
                    setShowRunnerAdvancementModal(true);
                } else {
                    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, endResult);
                    dispatch(setBaseRunners(suggestedRunners));
                    if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                    await updateScoreForRuns(suggestedRuns);
                    await handleEndAtBat(endResult, finalPitch, { rbi: suggestedRuns, runs_scored: suggestedRuns });
                }
            } else if (newStrikes >= 3) {
                // MLB rule: batter can reach on an uncaught third strike only when 1st base
                // is unoccupied, OR when there are 2 outs. Prompt the user to distinguish.
                const canDropThird = !baseRunners.first || currentOuts >= 2;
                if (canDropThird) {
                    const droppedYes = await confirm({
                        title: 'Third strike',
                        message: 'Was the third strike dropped?',
                        confirmLabel: 'Yes',
                        cancelLabel: 'No',
                    });
                    if (droppedYes) {
                        setPendingHitResult('strikeout_dropped');
                        setShowRunnerAdvancementModal(true);
                    } else {
                        await handleEndAtBat('strikeout', finalPitch);
                    }
                } else {
                    await handleEndAtBat('strikeout', finalPitch);
                }
            } else if (effectiveResult === 'in_play') setShowInPlayModal(true);
        } catch {
            toast.show({ message: 'Failed to log pitch', type: 'error' });
        } finally {
            isLoggingRef.current = false;
            setIsLogging(false);
        }
    };

    // ------------------------------------------------------------------
    // In-play / runner events
    // ------------------------------------------------------------------

    const deriveFielderPosition = (x: number, y: number): string | null => {
        const dx = x - 50;
        const dy = 82 - y;
        if (dy <= 2) return null;
        const angleDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 38) {
            if (angleDeg < -22) return 'LF';
            if (angleDeg > 22) return 'RF';
            return 'CF';
        }
        if (dist < 12) return 'P';
        if (angleDeg < -33) return '3B';
        if (angleDeg < -10) return 'SS';
        if (angleDeg < 10) return '2B';
        if (angleDeg < 33) return '1B';
        return '1B';
    };

    const handleInPlayResult = useCallback(
        async (result: string, hitLocation?: HitLocation, fieldedBy?: string) => {
            const capturedAtBat = currentAtBat;
            const capturedPitches = pitches;

            setShowInPlayModal(false);
            const hitResults = [
                'single',
                'double',
                'triple',
                'home_run',
                'walk',
                'hit_by_pitch',
                'sacrifice_fly',
                'sacrifice_bunt',
            ];
            const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
            if (hitResults.includes(result) && hasRunnersOnBase) {
                setPendingHitResult(result);
                setShowRunnerAdvancementModal(true);
            } else if (hitResults.includes(result)) {
                const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, result);
                dispatch(setBaseRunners(suggestedRunners));
                if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                await updateScoreForRuns(suggestedRuns);
                await handleEndAtBat(result, undefined, { rbi: suggestedRuns, runs_scored: suggestedRuns });
            } else if (result === 'double_play' && hasRunnersOnBase) {
                setShowDoublePlayModal(true);
            } else {
                await handleEndAtBat(result);
            }

            if (hitLocation && capturedAtBat) {
                const lastPitch = capturedPitches[capturedPitches.length - 1];
                if (lastPitch?.id) {
                    const resolvedFielder = fieldedBy ?? deriveFielderPosition(hitLocation.x, hitLocation.y);
                    const isOut =
                        result !== 'single' &&
                        result !== 'double' &&
                        result !== 'triple' &&
                        result !== 'home_run' &&
                        result !== 'walk' &&
                        result !== 'hit_by_pitch' &&
                        result !== 'error';
                    const contactType =
                        result === 'popout'
                            ? 'pop_up'
                            : hitLocation.hitType === 'ground_ball'
                              ? 'ground_ball'
                              : hitLocation.hitType === 'fly_ball'
                                ? 'fly_ball'
                                : 'line_drive';
                    gamesApi
                        .recordPlay({
                            pitch_id: lastPitch.id,
                            at_bat_id: capturedAtBat.id,
                            contact_type: contactType as ContactType,
                            fielded_by_position: (resolvedFielder ?? undefined) as PlayerPosition | undefined,
                            is_error: result === 'error',
                            is_out: isOut,
                            runs_scored: 0,
                        })
                        .catch(() => {});
                }
            }
        },
        [
            handleEndAtBat,
            baseRunners,
            id,
            dispatch,
            currentAtBat,
            pitches,
            updateScoreForRuns,
            setShowInPlayModal,
            setShowDoublePlayModal,
            setPendingHitResult,
            setShowRunnerAdvancementModal,
        ]
    );

    const handleRunnerAdvancementConfirm = useCallback(
        async (
            newRunners: BaseRunners,
            runsScored: number,
            throwouts: Throwout[] = [],
            errorAdvancements: ErrorAdvancement[] = []
        ) => {
            if (!pendingHitResult) return;
            try {
                let lastOutsAfter = currentOuts;
                if (throwouts.length > 0 && id && currentInning) {
                    let runningOutsBefore = currentOuts;
                    for (let i = 0; i < throwouts.length; i++) {
                        if (runningOutsBefore >= 3) break;
                        const t = throwouts[i];
                        const isLast = i === throwouts.length - 1;
                        const event = await dispatch(
                            recordBaserunnerEvent({
                                game_id: id,
                                inning_id: currentInning.id,
                                at_bat_id: currentAtBat?.id,
                                event_type: 'thrown_out_advancing',
                                runner_base: t.fromBase,
                                runner_to_base: t.toBase,
                                fielder_sequence: t.fielderSeq,
                                outs_before: runningOutsBefore,
                                new_base_runners: isLast ? newRunners : undefined,
                            } as any)
                        ).unwrap();
                        runningOutsBefore = event.outs_after;
                        lastOutsAfter = event.outs_after;
                    }
                    dispatch(setBaseRunners(newRunners));
                } else {
                    dispatch(setBaseRunners(newRunners));
                    if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                }

                if (errorAdvancements.length > 0 && id && currentInning) {
                    for (const adv of errorAdvancements) {
                        await dispatch(
                            recordBaserunnerEvent({
                                game_id: id,
                                inning_id: currentInning.id,
                                at_bat_id: currentAtBat?.id,
                                event_type: 'advance_on_throw',
                                runner_base: adv.fromBase === 'batter' ? 'home' : adv.fromBase,
                                runner_to_base: adv.toBase,
                                outs_before: lastOutsAfter,
                                new_base_runners: newRunners,
                            } as any)
                        ).unwrap();
                    }
                }

                await updateScoreForRuns(runsScored);
                setShowRunnerAdvancementModal(false);

                if (throwouts.length > 0) {
                    // Scrimmage suppresses the inning-change modal; outs still update.
                    if (lastOutsAfter >= 3 && !isScrimmageMode) {
                        setCurrentOuts(0);
                        setTeamRunsScored('0');
                        setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                        setShowInningChange(true);
                        setInningEndedByBaserunnerOut(true);
                    } else {
                        setCurrentOuts(lastOutsAfter);
                    }
                }

                await handleEndAtBat(pendingHitResult, undefined, {
                    rbi: runsScored,
                    runs_scored: runsScored,
                    outs_before_override: lastOutsAfter,
                });
                setPendingHitResult(null);
            } catch {
                toast.show({ message: 'Failed to update runner positions', type: 'error' });
            }
        },
        [
            pendingHitResult,
            id,
            dispatch,
            handleEndAtBat,
            updateScoreForRuns,
            currentInning,
            currentAtBat,
            currentOuts,
            game,
            isScrimmageMode,
            toast,
            setShowRunnerAdvancementModal,
            setCurrentOuts,
            setTeamRunsScored,
            setInningChangeInfo,
            setShowInningChange,
            setInningEndedByBaserunnerOut,
            setPendingHitResult,
        ]
    );

    const handleRecordBaserunnerOut = useCallback(
        async (eventType: BaserunnerEventType, runnerBase: RunnerBase) => {
            if (!id || !currentInning) return;
            try {
                await dispatch(
                    recordBaserunnerEvent({
                        game_id: id,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: eventType,
                        runner_base: runnerBase,
                        outs_before: currentOuts,
                    })
                ).unwrap();
                const newRunners: BaseRunners = { ...baseRunners, [runnerBase]: false };
                dispatch(setBaseRunners(newRunners));
                dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                const newOuts = currentOuts + 1;
                setCurrentOuts(newOuts);
                // Scrimmage: no auto-end; coach decides when to flip.
                if (newOuts >= 3 && !isScrimmageMode) {
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                    setInningEndedByBaserunnerOut(true);
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record baserunner out', type: 'error' });
            }
        },
        [
            id,
            currentInning,
            currentAtBat,
            currentOuts,
            game,
            isScrimmageMode,
            dispatch,
            baseRunners,
            toast,
            setCurrentOuts,
            setTeamRunsScored,
            setInningChangeInfo,
            setShowInningChange,
            setInningEndedByBaserunnerOut,
        ]
    );

    const handleRecordAdvancement = useCallback(
        async (
            eventType: 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'advance_on_throw',
            fromBase: RunnerBase,
            newRunners: BaseRunners,
            runsScored: number,
            runnerToBase?: RunnerBase | 'home'
        ) => {
            if (!id || !currentInning) return;
            try {
                await dispatch(
                    recordBaserunnerEvent({
                        game_id: id,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: eventType,
                        runner_base: fromBase,
                        runner_to_base: runnerToBase,
                        new_base_runners: newRunners,
                        outs_before: currentOuts,
                    } as any)
                ).unwrap();
                dispatch(setBaseRunners(newRunners));
                await updateScoreForRuns(runsScored);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record runner advancement', type: 'error' });
            }
        },
        [id, currentInning, currentAtBat, currentOuts, dispatch, updateScoreForRuns, toast]
    );

    const handleDoublePlayConfirm = useCallback(
        async (outRunners: RunnerBase[], batterReachesFirst: boolean) => {
            if (!id || !currentInning) return;
            try {
                for (const runnerBase of outRunners) {
                    await dispatch(
                        recordBaserunnerEvent({
                            game_id: id,
                            inning_id: currentInning.id,
                            at_bat_id: currentAtBat?.id,
                            event_type: 'other',
                            runner_base: runnerBase,
                            outs_before: currentOuts,
                        })
                    ).unwrap();
                }

                const newRunners: BaseRunners = { ...baseRunners };
                for (const base of outRunners) {
                    newRunners[base] = false;
                }
                if (batterReachesFirst) {
                    newRunners.first = true;
                }

                dispatch(setBaseRunners(newRunners));
                dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                setShowDoublePlayModal(false);
                await handleEndAtBat('double_play');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record double play', type: 'error' });
            }
        },
        [id, currentInning, currentAtBat, currentOuts, baseRunners, dispatch, handleEndAtBat, toast, setShowDoublePlayModal]
    );

    const handleRunnerPress = useCallback(
        (base: RunnerBase) => {
            // Tap a runner pip on BaseRunnerDiamond -> open the contextual
            // Advance/Out dialog. The dialog itself routes to the existing
            // RunnerEventModal with the chosen tab.
            if (baseRunners[base]) {
                setRunnerActionBase(base);
            }
        },
        [baseRunners, setRunnerActionBase]
    );

    return {
        updateScoreForRuns,
        startAtBatForBatter,
        findNextActiveBatter,
        findInningLeadoffBatter,
        advanceInningWithRuns,
        handleEndAtBat,
        handleInningChangeConfirm,
        handleSkipHalf,
        handleEndHalfScrimmage,
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
    };
}

export type LiveGameActions = ReturnType<typeof useLiveGameActions>;
