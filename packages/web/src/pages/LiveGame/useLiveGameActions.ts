import {
    BaseRunners,
    BaserunnerEventType,
    ContactType,
    PlayerPosition,
    deriveGameMode,
    RunnerBase,
    getSuggestedAdvancement,
    clearBases,
    PitchCallZone,
    PITCH_CALL_ZONE_COORDS,
    SituationalCallType,
} from '@pitch-tracker/shared';
import { pitchCallService } from '../../services/pitchCallService';
import {
    fetchGameById,
    startGame,
    logPitch,
    createAtBat,
    endAtBat,
    setCurrentAtBat,
    clearPitches,
    toggleHomeAway,
} from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
import { OpponentLineupPlayer, GamePitcherWithPlayer, getOutsForResult } from '../../types';
import { LiveGameState } from './useLiveGameState';

export function useLiveGameActions(state: LiveGameState) {
    const {
        gameId,
        dispatch,
        navigate,
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
        setShowBaserunnerOutModal,
        setShowRunnerAdvancementModal,
        setPendingHitResult,
        setShowDroppedThirdModal,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        activeCall,
        setActiveCall,
        setSendingCall,
        setLocalShakeCount,
    } = state;

    const startAtBatForBatter = async (batter: OpponentLineupPlayer, outs: number, inning: typeof currentInning) => {
        if (!gameId || !currentPitcher || !inning) return false;

        try {
            await dispatch(
                createAtBat({
                    game_id: gameId,
                    inning_id: inning.id,
                    opponent_batter_id: batter.id,
                    pitcher_id: currentPitcher.player_id,
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

    const advanceInning = async (runs: number) => {
        if (!gameId || !game) return;
        try {
            const currentHomeScore = game.home_score || 0;
            const currentAwayScore = game.away_score || 0;
            await gamesApi.updateScore(gameId, currentHomeScore, currentAwayScore + runs);

            if (game.is_home_game === false || game.charting_mode === 'both') {
                // Visitor game or both-team mode: advance 1 half to user's batting half
                await gamesApi.advanceInning(gameId);
            } else {
                // Home game (single-team): skip user's batting half entirely (advance 2)
                await gamesApi.advanceInning(gameId);
                await gamesApi.advanceInning(gameId);
            }

            setBaseRunners(clearBases());
            dispatch(fetchGameById(gameId));
            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);
            setShowInningChange(false);

            if (game.is_home_game !== false && game.charting_mode !== 'both') {
                // Home game single-team mode: set up next opponent batter immediately
                const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
                setCurrentBattingOrder(nextOrder);
                const firstBatter = opponentLineup.find((p) => p.batting_order === nextOrder && !p.replaced_by_id);
                if (firstBatter && newInning) {
                    setCurrentBatter(firstBatter);
                    await startAtBatForBatter(firstBatter, 0, newInning);
                } else {
                    setCurrentBatter(null);
                }
            }
            // In 'both' mode or visitor games, game mode switches automatically on re-render
        } catch (error) {
            console.error('Failed to advance inning:', error);
            alert('Failed to advance inning');
        }
    };

    const handleEndAtBat = async (result: string, extra?: { rbi?: number; runs_scored?: number }) => {
        if (!currentAtBat) return;

        try {
            const outsFromPlay = getOutsForResult(result);
            const newOutCount = currentOuts + outsFromPlay;

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

            if (outsFromPlay > 0) {
                if (newOutCount >= 3) {
                    setCurrentOuts(0);
                    if (game?.charting_mode === 'both') {
                        await advanceInning(0);
                    } else {
                        setTeamRunsScored('0');
                        setInningChangeInfo({
                            inning: game?.current_inning || 1,
                            half: game?.inning_half || 'top',
                        });
                        setShowInningChange(true);
                    }
                } else {
                    setCurrentOuts(newOutCount);
                    const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
                    setCurrentBattingOrder(nextOrder);
                    const nextBatter = opponentLineup.find((p) => p.batting_order === nextOrder && !p.replaced_by_id);
                    if (nextBatter) {
                        setCurrentBatter(nextBatter);
                        await startAtBatForBatter(nextBatter, newOutCount, currentInning);
                    } else {
                        setCurrentBatter(null);
                    }
                }
            } else {
                const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
                setCurrentBattingOrder(nextOrder);
                const nextBatter = opponentLineup.find((p) => p.batting_order === nextOrder && !p.replaced_by_id);
                if (nextBatter) {
                    setCurrentBatter(nextBatter);
                    await startAtBatForBatter(nextBatter, currentOuts, currentInning);
                } else {
                    setCurrentBatter(null);
                }
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to end at-bat');
        }
    };

    // Map PitchType to PitchCallAbbrev for the call record
    const toPitchCallAbbrev = (pt: string): import('@pitch-tracker/shared').PitchCallAbbrev => {
        const map: Record<string, import('@pitch-tracker/shared').PitchCallAbbrev> = {
            fastball: 'FB',
            '4-seam': 'FB',
            '2-seam': '2S',
            cutter: 'CT',
            sinker: '2S',
            slider: 'SL',
            curveball: 'CB',
            changeup: 'CH',
            splitter: 'CH',
            knuckleball: 'CB',
            other: 'FB',
        };
        return map[pt] || 'FB';
    };

    const handleSendCall = async () => {
        if (!targetZone || !gameId || !game) return;

        setSendingCall(true);
        try {
            const call = await pitchCallService.createCall({
                game_id: gameId,
                team_id: game.home_team_id || '',
                pitch_type: toPitchCallAbbrev(state.pitchType),
                zone: targetZone,
                at_bat_id: currentAtBat?.id,
                pitcher_id: currentPitcher?.player_id,
                opponent_batter_id: currentBatter?.id,
                inning: game.current_inning,
                balls_before: currentAtBat?.balls,
                strikes_before: currentAtBat?.strikes,
            });
            setActiveCall(call);
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to send pitch call');
        } finally {
            setSendingCall(false);
        }
    };

    const handleLogPitch = async () => {
        if (!currentAtBat || !pitchLocation) {
            alert('Please select a pitch location');
            return;
        }

        if (!currentPitcher || !currentBatter) {
            alert('Pitcher and batter must be selected');
            return;
        }

        try {
            const targetCoords = targetZone ? PITCH_CALL_ZONE_COORDS[targetZone] : null;

            await dispatch(
                logPitch({
                    at_bat_id: currentAtBat.id,
                    game_id: gameId!,
                    pitcher_id: currentPitcher.player_id,
                    opponent_batter_id: currentBatter.id,
                    pitch_number: pitches.length + 1,
                    pitch_type: pitchType,
                    velocity: velocity ? parseFloat(velocity) : undefined,
                    location_x: pitchLocation.x,
                    location_y: pitchLocation.y,
                    target_location_x: targetCoords?.x,
                    target_location_y: targetCoords?.y,
                    target_zone: targetZone || undefined,
                    pitch_result: pitchResult,
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

            if (pitchResult === 'ball') {
                newBalls++;
            } else if (pitchResult === 'called_strike' || pitchResult === 'swinging_strike') {
                newStrikes++;
            } else if (pitchResult === 'foul' && newStrikes < 2) {
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

            // Log result on the active pitch call if one exists
            if (activeCall) {
                const callResult =
                    pitchResult === 'called_strike' || pitchResult === 'swinging_strike'
                        ? 'strike'
                        : pitchResult === 'hit_by_pitch'
                          ? 'ball'
                          : (pitchResult as 'ball' | 'foul' | 'in_play');
                try {
                    await pitchCallService.logResult(activeCall.id, callResult);
                } catch {
                    // Non-critical — pitch was already logged
                }
                setActiveCall(null);
            }

            setPitchLocation(null);
            setTargetZone(null);
            setVelocity('');
            setPitchResult('ball');

            if (newBalls >= 4) {
                handleEndAtBat('walk');
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
            alert(error instanceof Error ? error.message : 'Failed to log pitch');
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

    const handleDiamondResult = async (result: string) => {
        // Capture before clearing
        const capturedHitLocation = hitLocation;
        const capturedAtBat = currentAtBat;
        const capturedPitches = pitches;

        setShowDiamondModal(false);
        setHitLocation(null);
        setTargetZone(null);
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
                // Runs scored while our team is pitching go to opponent (away_score)
                if (suggestedRuns > 0 && game) {
                    const newAwayScore = (game.away_score || 0) + suggestedRuns;
                    await gamesApi.updateScore(gameId, game.home_score || 0, newAwayScore);
                    dispatch(fetchGameById(gameId));
                }
            }
            await handleEndAtBat(result, { rbi: suggestedRuns, runs_scored: suggestedRuns });
        } else {
            await handleEndAtBat(result);
        }

        // Record play with derived fielder position (non-critical, fire-and-forget)
        if (capturedHitLocation && capturedAtBat) {
            const lastPitch = capturedPitches[capturedPitches.length - 1];
            if (lastPitch?.id) {
                const fieldedBy = deriveFielderPosition(capturedHitLocation.x, capturedHitLocation.y);
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

            dispatch(fetchGameById(gameId));

            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            // Set up next opponent batter
            const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
            setCurrentBattingOrder(nextOrder);
            const firstBatter = opponentLineup.find((p) => p.batting_order === nextOrder && !p.replaced_by_id);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
            } else {
                setCurrentBatter(null);
            }
        } catch (error) {
            console.error('Failed to confirm team at bat:', error);
            alert('Failed to advance inning');
        }
    };

    const handleRunnerAdvancementConfirm = async (newRunners: BaseRunners, runsScored: number) => {
        if (!gameId || !game) return;

        try {
            // Update base runners on server
            await gamesApi.updateBaseRunners(gameId, newRunners);
            setBaseRunners(newRunners);

            // Runs scored while our team is pitching go to opponent (away_score)
            if (runsScored > 0) {
                const newAwayScore = (game.away_score || 0) + runsScored;
                await gamesApi.updateScore(gameId, game.home_score || 0, newAwayScore);
                dispatch(fetchGameById(gameId));
            }

            setShowRunnerAdvancementModal(false);

            // Now end the at-bat with the pending result.
            // Credit the batter with an RBI for each run scored (sac fly, hit, forced walk/HBP).
            const result = state.pendingHitResult;
            setPendingHitResult(null);
            if (result) {
                await handleEndAtBat(result, { rbi: runsScored, runs_scored: runsScored });
            }
        } catch (error) {
            console.error('Failed to update runner advancement:', error);
            alert('Failed to update runner positions');
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
            if (newOuts >= 3) {
                setCurrentOuts(0);
                if (game?.charting_mode === 'both') {
                    await advanceInning(0);
                } else {
                    setTeamRunsScored('0');
                    setInningChangeInfo({
                        inning: game?.current_inning || 1,
                        half: game?.inning_half || 'top',
                    });
                    setShowInningChange(true);
                }
            } else {
                setCurrentOuts(newOuts);
            }

            setShowBaserunnerOutModal(false);
        } catch (error) {
            console.error('Failed to record baserunner out:', error);
            alert('Failed to record baserunner out');
        }
    };

    const handleStartAtBat = async () => {
        if (!gameId || !currentPitcher || !currentBatter) {
            alert('Please select both a pitcher and a batter first');
            return;
        }

        if (!currentInning) {
            alert('No current inning found. Please start the game first.');
            return;
        }

        const success = await startAtBatForBatter(currentBatter, currentOuts, currentInning);
        if (!success) {
            alert('Failed to start at-bat');
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
            alert(error instanceof Error ? error.message : 'Failed to start game');
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
            navigate('/');
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to end game');
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
            alert(error instanceof Error ? error.message : 'Failed to resume game');
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

    const handleToggleHomeAway = async () => {
        if (!gameId) return;

        try {
            await dispatch(toggleHomeAway(gameId)).unwrap();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to toggle home/away');
        }
    };

    const handleSituationalCall = async (type: SituationalCallType) => {
        if (!gameId || !game) return;
        try {
            await pitchCallService.createSituationalCall({
                game_id: gameId,
                team_id: game.home_team_id || '',
                situational_type: type,
                pitcher_id: state.currentPitcher?.player_id,
                at_bat_id: currentAtBat?.id,
                inning: game.current_inning,
            });
            if (type === 'shake') {
                setLocalShakeCount((prev) => prev + 1);
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to record situational call');
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

    return {
        handleSendCall,
        handleSituationalCall,
        handleLogPitch,
        handleEndAtBat,
        handleDiamondResult,
        handleInningChangeConfirm,
        handleTeamAtBatConfirm,
        handleRunnerAdvancementConfirm,
        handleRecordBaserunnerOut,
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
    };
}
