import {
    BaseRunners,
    BaserunnerEvent,
    BaserunnerEventType,
    ContactType,
    PitchCallResult,
    PitchCallZone,
    PITCH_TYPE_TO_ABBREV,
    PlayerPosition,
    deriveGameMode,
    RunnerBase,
    getSuggestedAdvancement,
    clearBases,
    getNextBatter,
    getInningLeadoffBatter,
} from '@pitch-tracker/shared';
import { useRef } from 'react';
import { useConfirm } from '../../hooks/useConfirm';
import { useToast } from '../../hooks/useToast';
import { pitchCallService } from '../../services/pitchCallService';
import {
    fetchGameById,
    startGame,
    logPitch,
    undoLastPitch,
    createAtBat,
    endAtBat,
    setCurrentAtBat,
    clearPitches,
    toggleHomeAway,
} from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
import { MyTeamLineupPlayer, OpponentLineupPlayer, GamePitcherWithPlayer, PitchResult, getOutsForResult } from '../../types';
import type { ErrorAdvancement, Throwout } from './RunnerAdvancementModal';
import { LiveGameState } from './useLiveGameState';

export function useLiveGameActions(state: LiveGameState) {
    const toast = useToast();
    const confirm = useConfirm();
    const showError = (message: string) => toast.show({ message, type: 'error' });
    const {
        gameId,
        dispatch,
        navigate: _navigate,
        game,
        currentAtBat,
        pitches,
        pitchLocation,
        setPitchLocation,
        targetZone,
        setTargetZone,
        pitchType,
        velocity,
        pitchResult,
        setPitchResult,
        setVelocity,
        currentPitcher,
        setCurrentPitcher,
        currentBatter,
        setCurrentBatter,
        currentBattingOrder,
        setCurrentBattingOrder,
        setShowPitcherSelector,
        setShowBatterSelector,
        currentInning,
        setCurrentInning,
        setStatsRefreshTrigger,
        opponentLineup,
        currentOuts,
        setCurrentOuts,
        setShowInningChange,
        setInningChangeInfo,
        teamRunsScored,
        setTeamRunsScored,
        setShowDiamondModal,
        hitLocation,
        setHitLocation,
        baseRunners,
        setBaseRunners,
        setShowRunnerEventModal,
        setShowRunnerAdvancementModal,
        setPendingHitResult,
        setShowDroppedThirdModal,
        setShowDoublePlayModal,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        activeCallId,
        setActiveCallId,
        inningEndedByBaserunnerOut,
        setInningEndedByBaserunnerOut,
        editResultPitch,
        setEditResultPitch,
        setShowEditResultModal,
    } = state;

    // Synchronous in-flight guard — blocks a double-tap from logging the pitch twice.
    const isLoggingRef = useRef(false);

    const gameMode = deriveGameMode(game?.is_home_game ?? true, game?.inning_half ?? 'top');
    const isScoutingMode = game?.charting_mode === 'scouting';
    // Scrimmage: practice game; no auto-end on 3 outs, score hidden, coach manually ends each half.
    const isScrimmageMode = game?.charting_mode === 'scrimmage';
    // TOP = away team batting (away scores); BOTTOM = home team batting (home scores)
    const scoutingBattingSide = isScoutingMode ? (game?.inning_half === 'top' ? 'away' : 'home') : null;

    /** Map a PitchResult to the coarser PitchCallResult used in pitch_calls */
    const toPitchCallResult = (result: string): PitchCallResult => {
        if (result === 'called_strike' || result === 'swinging_strike') return 'strike';
        if (result === 'foul') return 'foul';
        if (result === 'in_play') return 'in_play';
        return 'ball';
    };

    /** Send a pitch call to the catcher / linked devices via the API (which broadcasts via WebSocket). */
    const handleSendCall = async () => {
        if (!gameId || !game?.home_team_id || !targetZone) return;
        const abbrev = PITCH_TYPE_TO_ABBREV[pitchType];
        try {
            const call = await pitchCallService.createCall({
                game_id: gameId,
                team_id: game.home_team_id,
                pitch_type: abbrev,
                zone: targetZone,
                category: 'pitch',
                at_bat_id: currentAtBat?.id,
                pitcher_id: currentPitcher?.player_id,
                inning: game.current_inning,
                balls_before: currentAtBat?.balls ?? 0,
                strikes_before: currentAtBat?.strikes ?? 0,
            });
            setActiveCallId(call.id);
        } catch (error) {
            console.error('Failed to send pitch call:', error);
        }
    };

    const updateScoreForRuns = async (runsScored: number) => {
        if (!gameId || runsScored <= 0) return;
        const freshGame = await dispatch(fetchGameById(gameId)).unwrap();
        if (isScoutingMode) {
            // In scouting mode, credit the team that was just batting (determined by inning_half at time of play)
            if (scoutingBattingSide === 'away') {
                await gamesApi.updateScore(gameId, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
            } else {
                await gamesApi.updateScore(gameId, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
            }
        } else if (gameMode === 'opp_pitcher') {
            await gamesApi.updateScore(gameId, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
        } else {
            await gamesApi.updateScore(gameId, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
        }
        dispatch(fetchGameById(gameId));
    };

    const startAtBatForBatter = async (batter: OpponentLineupPlayer, outs: number, inning: typeof currentInning) => {
        if (!gameId || !inning) return false;
        if (!isScoutingMode && !state.currentOpposingPitcher && !currentPitcher) return false;

        try {
            await dispatch(
                createAtBat({
                    game_id: gameId,
                    inning_id: inning.id,
                    opponent_batter_id: batter.id,
                    pitcher_id: isScoutingMode ? undefined : currentPitcher?.player_id,
                    opposing_pitcher_id: isScoutingMode ? state.currentOpposingPitcher?.id : undefined,
                    balls: 0,
                    strikes: 0,
                    outs_before: outs,
                })
            ).unwrap();
            return true;
        } catch (error) {
            console.error('Failed to start at-bat:', error);
            return false;
        }
    };

    // Start an at-bat with our team's batter vs. the opposing pitcher (opp_pitcher / both modes)
    const startAtBatForMyTeamBatter = async (batter: MyTeamLineupPlayer, outs: number, inning: typeof currentInning) => {
        if (!gameId || !inning || !state.currentOpposingPitcher) return false;

        try {
            await dispatch(
                createAtBat({
                    game_id: gameId,
                    inning_id: inning.id,
                    batter_id: batter.player_id,
                    opposing_pitcher_id: state.currentOpposingPitcher.id,
                    balls: 0,
                    strikes: 0,
                    outs_before: outs,
                })
            ).unwrap();
            return true;
        } catch (error) {
            console.error('Failed to start at-bat for my team batter:', error);
            return false;
        }
    };

    const advanceInning = async (runs: number) => {
        if (!gameId || !game) return;
        try {
            // Fetch fresh game state to prevent stale closure from overwriting scores
            // already written during the half-inning (e.g. runner advancement → advanceInning(0))
            const freshGame = await dispatch(fetchGameById(gameId)).unwrap();

            const currentHomeScore = freshGame.home_score || 0;
            const currentAwayScore = freshGame.away_score || 0;

            if (isScoutingMode) {
                // Scouting: credit runs to the team that just batted
                if (scoutingBattingSide === 'away') {
                    await gamesApi.updateScore(gameId, currentHomeScore, currentAwayScore + runs);
                } else {
                    await gamesApi.updateScore(gameId, currentHomeScore + runs, currentAwayScore);
                }
                await gamesApi.advanceInning(gameId);
            } else if (freshGame.is_home_game === false || freshGame.charting_mode === 'both') {
                // Visitor game or both-team mode: advance 1 half to user's batting half
                await gamesApi.updateScore(gameId, currentHomeScore, currentAwayScore + runs);
                await gamesApi.advanceInning(gameId);
            } else {
                // Home game (single-team): skip user's batting half entirely (advance 2)
                await gamesApi.updateScore(gameId, currentHomeScore, currentAwayScore + runs);
                await gamesApi.advanceInning(gameId);
                await gamesApi.advanceInning(gameId);
            }

            setBaseRunners(clearBases());
            // Await so game.inning_half is current before batter setup and re-render
            const updatedGame = await dispatch(fetchGameById(gameId)).unwrap();
            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);
            setShowInningChange(false);

            if (isScoutingMode) {
                // After advancing, determine the new batting team and reset batter
                const newBattingSide = updatedGame.inning_half === 'top' ? 'away' : 'home';
                const newBattingLineup = opponentLineup.filter(
                    (p) => p.team_side === newBattingSide && p.is_starter && !p.replaced_by_id
                );
                const firstBatter = newBattingLineup.find((p) => p.batting_order === 1) || newBattingLineup[0] || null;
                if (firstBatter) {
                    setCurrentBattingOrder(firstBatter.batting_order);
                    setCurrentBatter(firstBatter);
                    await startAtBatForBatter(firstBatter, 0, newInning);
                } else {
                    setCurrentBatter(null);
                }
                // Also switch the opposing pitcher to the new pitching team
                const newPitchingSide = updatedGame.inning_half === 'top' ? 'home' : 'away';
                const newPitchingPitchers = state.opposingPitchers.filter((p) => p.team_side === newPitchingSide);
                if (newPitchingPitchers.length > 0) {
                    state.setCurrentOpposingPitcher(newPitchingPitchers[newPitchingPitchers.length - 1]);
                } else {
                    state.setCurrentOpposingPitcher(null);
                }
            } else if (freshGame.is_home_game !== false && freshGame.charting_mode !== 'both') {
                // Home game single-team mode: set up next opponent batter immediately.
                // If the inning ended via a baserunner out, the batter at the plate (or
                // on-deck batter the lineup pointer already advanced to) leads off — do
                // not advance the lineup further.
                const firstBatter = getInningLeadoffBatter(opponentLineup, currentBattingOrder, inningEndedByBaserunnerOut);
                if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
                if (firstBatter && newInning) {
                    setCurrentBatter(firstBatter);
                    await startAtBatForBatter(firstBatter, 0, newInning);
                } else {
                    setCurrentBatter(null);
                }
            }
            // In 'both' mode or visitor games, game mode switches automatically on re-render
            setInningEndedByBaserunnerOut(false);
        } catch (error) {
            console.error('Failed to advance inning:', error);
            showError('Failed to advance inning');
        }
    };

    const handleEndAtBat = async (
        result: string,
        extra?: { rbi?: number; runs_scored?: number; outs_before_override?: number }
    ) => {
        if (!currentAtBat) return;

        try {
            // outs_before_override lets the post-hit advancement flow pass in the
            // outs count after recording N throwouts — currentOuts is still stale
            // here because setCurrentOuts hasn't flushed.
            const outsBefore = extra?.outs_before_override ?? currentOuts;
            const outsFromPlay = getOutsForResult(result);
            const newOutCount = outsBefore + outsFromPlay;

            await dispatch(
                endAtBat({
                    id: currentAtBat.id,
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

            const isOppPitcherMode = !isScoutingMode && gameMode === 'opp_pitcher';

            // Helper: advance to the next batter and start their at-bat
            const advanceToNextBatter = async (outsForNextAtBat: number) => {
                if (isOppPitcherMode) {
                    const nextBatter = getNextBatter(state.myTeamLineup, currentBattingOrder);
                    if (nextBatter) {
                        setCurrentBattingOrder(nextBatter.batting_order);
                        state.setCurrentMyBatter(nextBatter);
                        await startAtBatForMyTeamBatter(nextBatter, outsForNextAtBat, currentInning);
                    } else {
                        state.setCurrentMyBatter(null);
                    }
                } else {
                    // In scouting mode, only use the current batting team's lineup
                    const activeLineup = isScoutingMode
                        ? opponentLineup.filter((p) => p.team_side === scoutingBattingSide && !p.replaced_by_id)
                        : opponentLineup;
                    const nextBatter = getNextBatter(activeLineup, currentBattingOrder);
                    if (nextBatter) {
                        setCurrentBattingOrder(nextBatter.batting_order);
                        setCurrentBatter(nextBatter);
                        await startAtBatForBatter(nextBatter, outsForNextAtBat, currentInning);
                    } else {
                        setCurrentBatter(null);
                    }
                }
            };

            if (outsFromPlay > 0) {
                // Scrimmage: never auto-end the half; coach taps "End Half Inning" manually.
                if (newOutCount >= 3 && !isScrimmageMode) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({
                        inning: game?.current_inning || 1,
                        half: game?.inning_half || 'top',
                    });
                    setShowInningChange(true);
                } else {
                    setCurrentOuts(newOutCount);
                    await advanceToNextBatter(newOutCount);
                }
            } else {
                await advanceToNextBatter(outsBefore);
            }
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to end at-bat');
        }
    };

    const handleLogPitch = async (resultOverride?: PitchResult) => {
        if (isLoggingRef.current) return;
        if (!currentAtBat || !pitchLocation) {
            showError('Please select a pitch location');
            return;
        }

        const isOppPitcherMode = !isScoutingMode && gameMode === 'opp_pitcher';
        const pitcherReady = isScoutingMode || isOppPitcherMode ? !!state.currentOpposingPitcher : !!currentPitcher;
        const batterReady = isOppPitcherMode ? !!state.currentMyBatter : !!currentBatter;
        if (!pitcherReady || !batterReady) {
            showError('Pitcher and batter must be selected');
            return;
        }

        const result = resultOverride ?? pitchResult;
        isLoggingRef.current = true;
        try {
            const loggedPitch = await dispatch(
                logPitch({
                    at_bat_id: currentAtBat.id,
                    game_id: gameId!,
                    pitcher_id: isScoutingMode || isOppPitcherMode ? undefined : currentPitcher?.player_id,
                    opponent_batter_id: isOppPitcherMode ? undefined : currentBatter!.id,
                    batter_id: isOppPitcherMode ? state.currentMyBatter?.player_id : undefined,
                    pitch_number: pitches.length + 1,
                    pitch_type: pitchType,
                    velocity: velocity ? parseFloat(velocity) : undefined,
                    location_x: pitchLocation.x,
                    location_y: pitchLocation.y,
                    target_zone: targetZone ?? undefined,
                    pitch_result: result,
                    balls_before: currentAtBat.balls,
                    strikes_before: currentAtBat.strikes,
                    team_side:
                        deriveGameMode(game?.is_home_game ?? true, game?.inning_half ?? 'top') === 'our_pitcher'
                            ? 'our_team'
                            : 'opponent',
                })
            ).unwrap();

            let newBalls = currentAtBat.balls;
            let newStrikes = currentAtBat.strikes;

            if (result === 'ball') {
                newBalls++;
            } else if (result === 'called_strike' || result === 'swinging_strike') {
                newStrikes++;
            } else if (result === 'foul' && newStrikes < 2) {
                newStrikes++;
            }

            dispatch(
                setCurrentAtBat({
                    ...currentAtBat,
                    balls: newBalls,
                    strikes: newStrikes,
                })
            );

            setStatsRefreshTrigger((prev: number) => prev + 1);

            setPitchLocation(null);
            setTargetZone(null);
            setVelocity('');
            setPitchResult('ball');

            // Link the logged pitch back to the outstanding call (fire-and-forget — non-critical)
            if (activeCallId && loggedPitch?.id) {
                pitchCallService.linkPitch(activeCallId, loggedPitch.id, toPitchCallResult(result)).catch(() => {});
                setActiveCallId(null);
            }

            // Surface the EDIT affordance for the just-logged pitch (UX-LG-01 Fix Last Pitch).
            if (loggedPitch?.id) {
                const justLogged = { id: loggedPitch.id, result: loggedPitch.pitch_result };
                setEditResultPitch(justLogged);
                toast.show({
                    message: `Logged: ${result.replace(/_/g, ' ')}`,
                    type: 'success',
                    duration: 5000,
                    action: {
                        label: 'EDIT',
                        onPress: () => {
                            setEditResultPitch(justLogged);
                            setShowEditResultModal(true);
                        },
                    },
                });
            }

            if (result === 'in_play') {
                // Pitch is now saved — auto-open diamond so the user records hit location & at-bat result.
                // Without this, pitchResult resets to 'ball' and the button disappears before it can be clicked.
                setShowDiamondModal(true);
            } else if (result === 'hit_by_pitch' || newBalls >= 4) {
                const endResult = result === 'hit_by_pitch' ? 'hit_by_pitch' : 'walk';
                const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
                if (hasRunnersOnBase) {
                    setPendingHitResult(endResult);
                    setShowRunnerAdvancementModal(true);
                } else {
                    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, endResult);
                    if (gameId) {
                        await gamesApi.updateBaseRunners(gameId, suggestedRunners);
                        setBaseRunners(suggestedRunners);
                        await updateScoreForRuns(suggestedRuns);
                    }
                    await handleEndAtBat(endResult, { rbi: suggestedRuns, runs_scored: suggestedRuns });
                }
            } else if (newStrikes >= 3) {
                // MLB rule: batter can reach on an uncaught third strike only when 1st base
                // is unoccupied, OR when there are 2 outs. Prompt the scorer to distinguish.
                const canDropThird = !baseRunners.first || currentOuts >= 2;
                if (canDropThird) {
                    setShowDroppedThirdModal(true);
                } else {
                    handleEndAtBat('strikeout');
                }
            }
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to log pitch');
        } finally {
            isLoggingRef.current = false;
        }
    };

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

    const handleDiamondResult = async (result: string, fieldedByOverride?: string) => {
        // Capture before clearing
        const capturedHitLocation = hitLocation;
        const capturedAtBat = currentAtBat;
        const capturedPitches = pitches;

        setShowDiamondModal(false);
        setHitLocation(null);
        setPitchLocation(null);

        // For hits with runners on base, show runner advancement modal
        const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
        const isHitResult = [
            'single',
            'double',
            'triple',
            'home_run',
            'walk',
            'hit_by_pitch',
            'sacrifice_fly',
            'sacrifice_bunt',
            'fielders_choice',
        ].includes(result);

        if (hasRunnersOnBase && isHitResult) {
            setPendingHitResult(result);
            setShowRunnerAdvancementModal(true);
        } else if (isHitResult) {
            // No runners, but still need to place the batter
            const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, result);
            if (gameId) {
                await gamesApi.updateBaseRunners(gameId, suggestedRunners);
                setBaseRunners(suggestedRunners);
                await updateScoreForRuns(suggestedRuns);
            }
            await handleEndAtBat(result, { rbi: suggestedRuns, runs_scored: suggestedRuns });
        } else if (result === 'double_play' && hasRunnersOnBase) {
            setShowDoublePlayModal(true);
        } else {
            await handleEndAtBat(result);
        }

        // Record play with derived fielder position (non-critical, fire-and-forget)
        if (capturedHitLocation && capturedAtBat) {
            const lastPitch = capturedPitches[capturedPitches.length - 1];
            if (lastPitch?.id) {
                const fieldedBy = fieldedByOverride ?? deriveFielderPosition(capturedHitLocation.x, capturedHitLocation.y);
                const isOut = !isHitResult && result !== 'error';
                const contactType =
                    result === 'popout'
                        ? 'pop_up'
                        : capturedHitLocation.hitType === 'ground_ball'
                          ? 'ground_ball'
                          : capturedHitLocation.hitType === 'fly_ball'
                            ? 'fly_ball'
                            : 'line_drive';
                gamesApi
                    .recordPlay({
                        pitch_id: lastPitch.id,
                        at_bat_id: capturedAtBat.id,
                        contact_type: contactType as ContactType,
                        fielded_by_position: (fieldedBy ?? undefined) as PlayerPosition | undefined,
                        is_error: result === 'error',
                        is_out: isOut,
                        runs_scored: 0,
                    })
                    .catch(() => {}); // non-critical
            }
        }
    };

    const handleInningChangeConfirm = async () => {
        await advanceInning(parseInt(teamRunsScored, 10) || 0);
    };

    const handleTeamAtBatConfirm = async () => {
        if (!gameId || !game) return;

        try {
            const runsToAdd = parseInt(teamAtBatRuns, 10) || 0;

            // User's runs go to home_score (user is always home_score)
            const currentHomeScore = game.home_score || 0;
            const currentAwayScore = game.away_score || 0;
            await gamesApi.updateScore(gameId, currentHomeScore + runsToAdd, currentAwayScore);

            // Advance 1 half-inning (from user's batting half to opponent's batting half)
            await gamesApi.advanceInning(gameId);

            // Clear base runners
            setBaseRunners(clearBases());

            // Await so game.inning_half is current before batter setup and re-render
            await dispatch(fetchGameById(gameId)).unwrap();

            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            // Set up next opponent batter. Honor the baserunner-out flag so the batter
            // who was at the plate when our half ended via a baserunner out leads off.
            const firstBatter = getInningLeadoffBatter(opponentLineup, currentBattingOrder, inningEndedByBaserunnerOut);
            if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
            } else {
                setCurrentBatter(null);
            }
            setInningEndedByBaserunnerOut(false);
        } catch (error) {
            console.error('Failed to confirm team at bat:', error);
            showError('Failed to advance inning');
        }
    };

    const handleRunnerAdvancementConfirm = async (
        newRunners: BaseRunners,
        runsScored: number,
        throwouts: Throwout[] = [],
        errorAdvancements: ErrorAdvancement[] = []
    ) => {
        if (!gameId || !game) return;

        try {
            let lastOutsAfter = currentOuts;

            if (throwouts.length > 0 && currentInning) {
                // Record N throwout events sequentially. Thread outs_before through each
                // call so the service computes outs_after correctly. Pass new_base_runners
                // only on the LAST event so games.base_runners lands once.
                let runningOutsBefore = currentOuts;
                for (let i = 0; i < throwouts.length; i++) {
                    if (runningOutsBefore >= 3) break;
                    const t = throwouts[i];
                    const isLast = i === throwouts.length - 1;
                    const event = await gamesApi.recordBaserunnerEvent({
                        game_id: gameId,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: 'thrown_out_advancing',
                        runner_base: t.fromBase,
                        runner_to_base: t.toBase,
                        fielder_sequence: t.fielderSeq,
                        outs_before: runningOutsBefore,
                        new_base_runners: isLast ? newRunners : undefined,
                    } as Partial<BaserunnerEvent> & {
                        new_base_runners?: BaseRunners;
                        runner_to_base?: string;
                        fielder_sequence?: number[];
                    });
                    runningOutsBefore = event.outs_after;
                    lastOutsAfter = event.outs_after;
                }
            } else {
                await gamesApi.updateBaseRunners(gameId, newRunners);
            }

            // Record any extra advances on throw/error the user flagged. Pass
            // new_base_runners on each so the service does not re-derive the
            // already-final runner state.
            if (errorAdvancements.length > 0 && currentInning) {
                for (const adv of errorAdvancements) {
                    await gamesApi.recordBaserunnerEvent({
                        game_id: gameId,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: 'advance_on_throw',
                        runner_base: adv.fromBase === 'batter' ? 'home' : adv.fromBase,
                        runner_to_base: adv.toBase,
                        outs_before: lastOutsAfter,
                        new_base_runners: newRunners,
                    } as Partial<BaserunnerEvent> & {
                        new_base_runners?: BaseRunners;
                        runner_to_base?: string;
                    });
                }
            }

            setBaseRunners(newRunners);
            await updateScoreForRuns(runsScored);
            setShowRunnerAdvancementModal(false);

            const inningEnded = throwouts.length > 0 && lastOutsAfter >= 3;
            if (throwouts.length > 0) {
                // Scrimmage suppresses the inning-change modal; outs still update.
                if (inningEnded && !isScrimmageMode) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({
                        inning: game?.current_inning || 1,
                        half: game?.inning_half || 'top',
                    });
                    setShowInningChange(true);
                    // 3rd out came from a baserunner thrown out; the on-deck batter
                    // (after handleEndAtBat advances the pointer for the completed hit)
                    // should lead off next inning without further advancement.
                    setInningEndedByBaserunnerOut(true);
                } else {
                    setCurrentOuts(lastOutsAfter);
                }
            }

            // End the at-bat with the pending result. The hit still counts even if a
            // runner was thrown out; runs scored on the play earn the batter RBIs.
            // outs_before_override threads the post-throwout outs into handleEndAtBat —
            // its currentOuts closure is still pre-throwout because the setState hasn't flushed.
            const result = state.pendingHitResult;
            setPendingHitResult(null);
            if (result) {
                await handleEndAtBat(result, {
                    rbi: runsScored,
                    runs_scored: runsScored,
                    outs_before_override: lastOutsAfter,
                });
            }
        } catch (error) {
            console.error('Failed to update runner advancement:', error);
            showError('Failed to update runner positions');
        }
    };

    const handleRecordBaserunnerOut = async (runnerBase: RunnerBase, eventType: BaserunnerEventType) => {
        if (!gameId || !currentInning) return;

        try {
            // Record the baserunner event
            await gamesApi.recordBaserunnerEvent({
                game_id: gameId,
                inning_id: currentInning.id,
                at_bat_id: currentAtBat?.id,
                event_type: eventType,
                runner_base: runnerBase,
                outs_before: currentOuts,
            });

            // Update local base runners state (remove the runner)
            const newRunners: BaseRunners = {
                ...baseRunners,
                [runnerBase]: false,
            };
            setBaseRunners(newRunners);

            // Update outs
            const newOuts = currentOuts + 1;
            // Scrimmage: no auto-end on 3 outs; coach manually flips.
            if (newOuts >= 3 && !isScrimmageMode) {
                setCurrentOuts(0);
                setTeamRunsScored('0');
                setInningChangeInfo({
                    inning: game?.current_inning || 1,
                    half: game?.inning_half || 'top',
                });
                setShowInningChange(true);
                // The batter at the plate was not retired (a baserunner was) — they
                // lead off when this team returns next inning.
                setInningEndedByBaserunnerOut(true);
            } else {
                setCurrentOuts(newOuts);
            }

            setShowRunnerEventModal(false);
        } catch (error) {
            console.error('Failed to record baserunner out:', error);
            showError('Failed to record baserunner out');
        }
    };

    const handleRecordAdvancement = async (
        eventType: 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'advance_on_throw',
        fromBase: RunnerBase,
        newRunners: BaseRunners,
        runsScored: number,
        runnerToBase?: RunnerBase | 'home'
    ) => {
        if (!gameId || !currentInning) return;
        try {
            await gamesApi.recordBaserunnerEvent({
                game_id: gameId,
                inning_id: currentInning.id,
                at_bat_id: currentAtBat?.id,
                event_type: eventType,
                runner_base: fromBase,
                runner_to_base: runnerToBase,
                new_base_runners: newRunners,
                outs_before: currentOuts,
            } as Partial<BaserunnerEvent> & { new_base_runners?: BaseRunners });
            setBaseRunners(newRunners);
            await updateScoreForRuns(runsScored);
            setShowRunnerEventModal(false);
        } catch (error) {
            console.error('Failed to record runner advancement:', error);
            showError('Failed to record runner advancement');
        }
    };

    const handleStartAtBat = async () => {
        const isOppPitcherMode = !isScoutingMode && gameMode === 'opp_pitcher';
        const pitcherReady = isScoutingMode || isOppPitcherMode ? !!state.currentOpposingPitcher : !!currentPitcher;
        const batterReady = isOppPitcherMode ? !!state.currentMyBatter : !!currentBatter;

        if (!gameId || !pitcherReady || !batterReady) {
            showError('Please select both a pitcher and a batter first');
            return;
        }

        if (!currentInning) {
            showError('No current inning found. Please start the game first.');
            return;
        }

        if (isOppPitcherMode) {
            const success = await startAtBatForMyTeamBatter(state.currentMyBatter!, currentOuts, currentInning);
            if (!success) {
                showError('Failed to start at-bat');
            }
        } else {
            const success = await startAtBatForBatter(currentBatter!, currentOuts, currentInning);
            if (!success) {
                showError('Failed to start at-bat');
            }
        }
    };

    const handlePitcherSelected = (pitcher: GamePitcherWithPlayer) => {
        setCurrentPitcher(pitcher);
        setShowPitcherSelector(false);
    };

    const handleBatterSelected = (batter: OpponentLineupPlayer) => {
        setCurrentBatter(batter);
        setShowBatterSelector(false);
    };

    const handleStartGame = async () => {
        if (!gameId) return;

        try {
            await dispatch(startGame(gameId)).unwrap();
            dispatch(fetchGameById(gameId));
            const inning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(inning);
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to start game');
        }
    };

    const handleEndGame = async () => {
        if (!gameId || !game) return;

        const confirmEnd = window.confirm('Are you sure you want to end this game? This will mark it as completed.');
        if (!confirmEnd) return;

        try {
            await gamesApi.endGame(gameId, {
                home_score: game.home_score || 0,
                away_score: game.away_score || 0,
            });
            // Refresh game state — status becomes 'completed', which renders ViewerDashboard
            await dispatch(fetchGameById(gameId));
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to end game');
        }
    };

    const handleResumeGame = async () => {
        if (!gameId) return;

        try {
            await gamesApi.resumeGame(gameId);
            dispatch(fetchGameById(gameId));
            const inning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(inning);
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to resume game');
        }
    };

    const handleLocationSelect = (x: number, y: number) => {
        setPitchLocation({ x, y });
    };

    const handleTargetZoneSelect = (zone: PitchCallZone) => {
        setTargetZone(zone);
    };

    const handleTargetClear = () => {
        setTargetZone(null);
    };

    // Pre-pitch: silent flip. Post-pitch: confirm dialog explaining the implication (UX-LG-12).
    const handleToggleHomeAway = async () => {
        if (!gameId || !game) return;

        if ((game.total_pitches ?? 0) > 0) {
            const newSide = game.is_home_game === false ? 'home' : 'away';
            const ok = await confirm({
                title: 'Swap home/away?',
                message: `${game.total_pitches} pitches already logged. Switching makes your team the ${newSide} team going forward — already-logged pitches keep their inning-half. Scores (opponent vs. your team) stay attached to each team and don't move.`,
                confirmLabel: 'Swap',
            });
            if (!ok) return;
        }

        try {
            await dispatch(toggleHomeAway(gameId)).unwrap();
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Failed to toggle home/away');
        }
    };

    const handleDoublePlayConfirm = async (outRunners: RunnerBase[], batterReachesFirst: boolean) => {
        if (!gameId || !currentInning) return;
        try {
            for (const runnerBase of outRunners) {
                await gamesApi.recordBaserunnerEvent({
                    game_id: gameId,
                    inning_id: currentInning.id,
                    at_bat_id: currentAtBat?.id,
                    event_type: 'other',
                    runner_base: runnerBase,
                    outs_before: currentOuts,
                });
            }

            const newRunners: BaseRunners = { ...baseRunners };
            for (const base of outRunners) {
                newRunners[base] = false;
            }
            if (batterReachesFirst) {
                newRunners.first = true;
            }

            await gamesApi.updateBaseRunners(gameId, newRunners);
            setBaseRunners(newRunners);
            setShowDoublePlayModal(false);
            await handleEndAtBat('double_play');
        } catch (error) {
            console.error('Failed to record double play:', error);
            showError('Failed to record double play');
        }
    };

    const handleDroppedThird = (wasDropped: boolean) => {
        if (wasDropped) {
            setPendingHitResult('strikeout_dropped');
            setShowRunnerAdvancementModal(true);
        } else {
            handleEndAtBat('strikeout');
        }
    };

    const handleSkipHalf = async () => {
        if (!gameId || !game) return;
        await advanceInning(0);
    };

    // Scrimmage manual end-half. Hits the backend advance endpoint twice so we
    // go top -> bottom -> top of next inning, keeping gameMode='our_pitcher' for
    // the entire scrimmage. Bypasses advanceInning's score / endGame branches
    // because scrimmages don't track score and shouldn't auto-end at total_innings.
    const handleEndHalfScrimmage = async () => {
        if (!gameId || !game) return;
        try {
            await gamesApi.advanceInning(gameId);
            await gamesApi.advanceInning(gameId);
            setBaseRunners(clearBases());
            setCurrentOuts(0);
            setTeamRunsScored('0');
            setShowInningChange(false);
            await dispatch(fetchGameById(gameId)).unwrap();
            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);
        } catch (err) {
            console.error('Failed to end half-inning:', err);
            showError('Failed to end half-inning');
        }
    };

    // Fix Last Pitch — result-only PATCH for the most recent pitch (UX-LG-01).
    // Server rejects AB-boundary-crossing edits with 409/AB_BOUNDARY; we surface a
    // toast steering the user to the existing Undo flow in that case.
    const handleEditLastPitchResult = async (newResult: PitchResult) => {
        if (!editResultPitch) return;
        if (newResult === editResultPitch.result) {
            setShowEditResultModal(false);
            return;
        }
        const oldResult = editResultPitch.result;
        try {
            const { pitch: updated, atBat: updatedAb } = await gamesApi.updatePitchResult(editResultPitch.id, newResult);
            dispatch(setCurrentAtBat(updatedAb));
            setEditResultPitch({ id: updated.id, result: updated.pitch_result });
            setShowEditResultModal(false);
            setStatsRefreshTrigger((prev: number) => prev + 1);
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
                showError('Only the most recent pitch can be edited.');
            } else {
                showError(e.message || 'Failed to update pitch');
            }
            setShowEditResultModal(false);
        }
    };

    // Undo most recent pitch — fully reverses count, runners, score, AB lifecycle.
    // Server returns restored {atBat, game}; sync local out/runner state from response.
    const handleUndoLastPitch = async () => {
        if (pitches.length === 0) return;
        const last = pitches[pitches.length - 1];
        try {
            const result = await dispatch(undoLastPitch(last.id)).unwrap();
            if (result.game.base_runners) {
                setBaseRunners(result.game.base_runners);
            }
            if (typeof result.atBat.outs_after === 'number') {
                setCurrentOuts(result.atBat.outs_after);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Failed to undo pitch');
        }
    };

    return {
        handleLogPitch,
        handleUndoLastPitch,
        handleEditLastPitchResult,
        handleEndAtBat,
        handleDiamondResult,
        handleInningChangeConfirm,
        handleTeamAtBatConfirm,
        handleRunnerAdvancementConfirm,
        handleRecordBaserunnerOut,
        handleRecordAdvancement,
        handleStartAtBat,
        handlePitcherSelected,
        handleBatterSelected,
        handleStartGame,
        handleEndGame,
        handleResumeGame,
        handleLocationSelect,
        handleTargetZoneSelect,
        handleTargetClear,
        handleToggleHomeAway,
        handleDroppedThird,
        handleDoublePlayConfirm,
        handleSkipHalf,
        handleEndHalfScrimmage,
        handleSendCall,
    };
}
