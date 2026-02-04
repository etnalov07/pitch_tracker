import { fetchGameById, startGame, logPitch, createAtBat, updateAtBat, setCurrentAtBat, clearPitches } from '../../state';
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
        targetLocation,
        setTargetLocation,
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
        setHitLocation,
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

    const handleEndAtBat = async (result: string) => {
        if (!currentAtBat) return;

        try {
            const outsFromPlay = getOutsForResult(result);
            const newOutCount = currentOuts + outsFromPlay;

            await dispatch(
                updateAtBat({
                    id: currentAtBat.id,
                    data: {
                        result,
                        outs_after: Math.min(newOutCount, 3),
                    },
                })
            ).unwrap();

            dispatch(setCurrentAtBat(null));
            dispatch(clearPitches());

            if (outsFromPlay > 0) {
                if (newOutCount >= 3) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({
                        inning: game?.current_inning || 1,
                        half: game?.inning_half || 'top',
                    });
                    setShowInningChange(true);
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
                    target_location_x: targetLocation?.x,
                    target_location_y: targetLocation?.y,
                    pitch_result: pitchResult,
                    balls_before: currentAtBat.balls,
                    strikes_before: currentAtBat.strikes,
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

            setPitchLocation(null);
            setTargetLocation(null);
            setVelocity('');
            setPitchResult('ball');

            if (newBalls >= 4) {
                handleEndAtBat('walk');
            } else if (newStrikes >= 3) {
                handleEndAtBat('strikeout');
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to log pitch');
        }
    };

    const handleDiamondResult = async (result: string) => {
        setShowDiamondModal(false);
        setHitLocation(null);
        setTargetLocation(null);
        setPitchLocation(null);
        await handleEndAtBat(result);
    };

    const handleInningChangeConfirm = async () => {
        if (!gameId || !game) return;

        try {
            const runsToAdd = parseInt(teamRunsScored, 10) || 0;

            const currentHomeScore = game.home_score || 0;
            const currentAwayScore = game.away_score || 0;
            await gamesApi.updateScore(gameId, currentHomeScore + runsToAdd, currentAwayScore);

            await gamesApi.advanceInning(gameId);
            await gamesApi.advanceInning(gameId);

            dispatch(fetchGameById(gameId));

            const newInning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(newInning);

            setShowInningChange(false);

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
            console.error('Failed to advance inning:', error);
            alert('Failed to advance inning');
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

    const handleTargetSelect = (x: number, y: number) => {
        setTargetLocation({ x, y });
    };

    const handleTargetClear = () => {
        setTargetLocation(null);
    };

    return {
        handleLogPitch,
        handleEndAtBat,
        handleDiamondResult,
        handleInningChangeConfirm,
        handleStartAtBat,
        handlePitcherSelected,
        handleBatterSelected,
        handleStartGame,
        handleEndGame,
        handleResumeGame,
        handleLocationSelect,
        handleTargetSelect,
        handleTargetClear,
    };
}
