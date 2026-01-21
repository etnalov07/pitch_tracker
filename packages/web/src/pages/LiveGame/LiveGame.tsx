import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BatterSelector from '../../components/game/BatterSelector';
import PitcherSelector from '../../components/game/PitcherSelector';
import BatterHistory from '../../components/live/BatterHistory';
import StrikeZone from '../../components/live/StrikeZone';
import {
    useAppDispatch,
    useAppSelector,
    fetchGameById,
    startGame,
    logPitch,
    createAtBat,
    updateAtBat,
    setCurrentAtBat,
    clearPitches,
} from '../../state';
import { gamesApi } from '../../state/games/api/gamesApi';
import { theme } from '../../styles/theme';
import { PitchType, PitchResult, OpponentLineupPlayer, GamePitcherWithPlayer, Inning as InningType } from '../../types';
import {
    Container,
    LeftPanel,
    MainPanel,
    GameHeader,
    TeamInfo,
    TeamName,
    Score,
    GameInfo,
    Inning,
    InningHalf,
    CountDisplay,
    CountLabel,
    CountValue,
    OutsDisplay,
    PitchForm,
    FormRow,
    FormGroup,
    Label,
    Select,
    Input,
    ResultButtons,
    ResultButton,
    LogButton,
    EndAtBatButton,
    NoAtBatContainer,
    NoAtBatText,
    StartAtBatButton,
    LoadingContainer,
    ErrorContainer,
    PlayerDisplay,
    PlayerInfo,
    PlayerLabel,
    PlayerName,
    PlayerNumber,
    ChangeButton,
    PlayersRow,
    SetupPrompt,
    SetupText,
    SetupButton,
    TopBar,
    BackButton,
    GameStatus,
    StartGameButton,
    StartGamePrompt,
    StartGameText,
} from './styles';

const LiveGame: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { selectedGame: game, currentAtBat, pitches, loading } = useAppSelector((state) => state.games);

    // Pitch form state
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [pitchType, setPitchType] = useState<PitchType>('fastball');
    const [velocity, setVelocity] = useState<string>('');
    const [pitchResult, setPitchResult] = useState<PitchResult>('ball');

    // Current pitcher and batter
    const [currentPitcher, setCurrentPitcher] = useState<GamePitcherWithPlayer | null>(null);
    const [currentBatter, setCurrentBatter] = useState<OpponentLineupPlayer | null>(null);
    const [currentBattingOrder, setCurrentBattingOrder] = useState(1);

    // Modal visibility
    const [showPitcherSelector, setShowPitcherSelector] = useState(false);
    const [showBatterSelector, setShowBatterSelector] = useState(false);

    // Current inning
    const [currentInning, setCurrentInning] = useState<InningType | null>(null);

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameById(gameId));
            // Fetch current inning
            gamesApi.getCurrentInning(gameId).then(setCurrentInning);
        }
    }, [dispatch, gameId]);

    const handleLocationSelect = (x: number, y: number) => {
        setPitchLocation({ x, y });
    };

    const handleLogPitch = async () => {
        if (!currentAtBat || !pitchLocation) {
            alert('Please select a pitch location');
            return;
        }

        try {
            await dispatch(
                logPitch({
                    at_bat_id: currentAtBat.id,
                    pitch_number: pitches.length + 1,
                    pitch_type: pitchType,
                    velocity: velocity ? parseFloat(velocity) : undefined,
                    location_x: pitchLocation.x,
                    location_y: pitchLocation.y,
                    pitch_result: pitchResult,
                })
            ).unwrap();

            // Update count
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

            // Reset form
            setPitchLocation(null);
            setVelocity('');

            // Check for end of at-bat
            if (newBalls >= 4) {
                handleEndAtBat('walk');
            } else if (newStrikes >= 3) {
                handleEndAtBat('strikeout');
            } else if (pitchResult === 'in_play') {
                // Coach will record play details separately
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to log pitch');
        }
    };

    const handleEndAtBat = async (result: string) => {
        if (!currentAtBat) return;

        try {
            await dispatch(
                updateAtBat({
                    id: currentAtBat.id,
                    data: { result },
                })
            ).unwrap();
            // Reset for next at-bat
            dispatch(setCurrentAtBat(null));
            dispatch(clearPitches());
            // Advance to next batter
            advanceBattingOrder();
            alert(`At-bat ended: ${result}`);
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to end at-bat');
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

        try {
            await dispatch(
                createAtBat({
                    game_id: gameId,
                    inning_id: currentInning.id,
                    opponent_batter_id: currentBatter.id,
                    pitcher_id: currentPitcher.player_id,
                    balls: 0,
                    strikes: 0,
                    outs_before: 0,
                })
            ).unwrap();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to start at-bat');
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

    const advanceBattingOrder = () => {
        // Advance to next batter in lineup (1-9, then wrap to 1)
        const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
        setCurrentBattingOrder(nextOrder);
        setCurrentBatter(null); // Clear batter so user selects the next one
    };

    const handleStartGame = async () => {
        if (!gameId) return;

        try {
            await dispatch(startGame(gameId)).unwrap();
            // Refresh game and fetch the newly created inning
            dispatch(fetchGameById(gameId));
            const inning = await gamesApi.getCurrentInning(gameId);
            setCurrentInning(inning);
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to start game');
        }
    };

    const handleBackToDashboard = () => {
        navigate('/');
    };

    if (loading) {
        return <LoadingContainer>Loading game...</LoadingContainer>;
    }

    if (!game) {
        return <ErrorContainer>Game not found</ErrorContainer>;
    }

    const needsSetup = !currentPitcher || !currentBatter;

    return (
        <Container>
            {/* Left Panel - Batter History */}
            <LeftPanel>
                <BatterHistory batterId={currentBatter?.id || ''} pitcherId={currentPitcher?.player_id || ''} />
            </LeftPanel>

            {/* Main Panel - Strike Zone & Pitch Entry */}
            <MainPanel>
                <TopBar>
                    <BackButton onClick={handleBackToDashboard}>← Back to Dashboard</BackButton>
                    <GameStatus status={game.status}>
                        {game.status === 'scheduled' ? 'Scheduled' : game.status === 'in_progress' ? 'In Progress' : 'Completed'}
                    </GameStatus>
                </TopBar>

                {/* Show Start Game prompt if game hasn't started */}
                {game.status === 'scheduled' && (
                    <StartGamePrompt>
                        <StartGameText>Game is scheduled but not yet started. Click below to begin tracking.</StartGameText>
                        <StartGameButton onClick={handleStartGame}>Start Game</StartGameButton>
                    </StartGamePrompt>
                )}

                <GameHeader>
                    <TeamInfo>
                        <TeamName>{game.opponent_name || 'Away Team'}</TeamName>
                        <Score>{game.away_score || 0}</Score>
                    </TeamInfo>
                    <GameInfo>
                        <Inning>Inning {game.current_inning || 1}</Inning>
                        <InningHalf>{game.inning_half || 'top'}</InningHalf>
                    </GameInfo>
                    <TeamInfo>
                        <TeamName>Your Team</TeamName>
                        <Score>{game.home_score || 0}</Score>
                    </TeamInfo>
                </GameHeader>

                {/* Pitcher and Batter Display */}
                <PlayersRow>
                    <PlayerDisplay>
                        <PlayerInfo>
                            <PlayerLabel>Pitcher</PlayerLabel>
                            {currentPitcher ? (
                                <>
                                    <PlayerNumber>{currentPitcher.player?.jersey_number || '#'}</PlayerNumber>
                                    <PlayerName>
                                        {currentPitcher.player?.first_name} {currentPitcher.player?.last_name}
                                    </PlayerName>
                                </>
                            ) : (
                                <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                            )}
                        </PlayerInfo>
                        <ChangeButton onClick={() => setShowPitcherSelector(true)}>
                            {currentPitcher ? 'Change' : 'Select'}
                        </ChangeButton>
                    </PlayerDisplay>

                    <PlayerDisplay>
                        <PlayerInfo>
                            <PlayerLabel>Batter (#{currentBattingOrder})</PlayerLabel>
                            {currentBatter ? (
                                <>
                                    <PlayerName>{currentBatter.player_name}</PlayerName>
                                </>
                            ) : (
                                <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                            )}
                        </PlayerInfo>
                        <ChangeButton onClick={() => setShowBatterSelector(true)}>
                            {currentBatter ? 'Change' : 'Select'}
                        </ChangeButton>
                    </PlayerDisplay>
                </PlayersRow>

                {/* Setup Prompt if no lineup */}
                {needsSetup && !currentAtBat && (
                    <SetupPrompt>
                        <SetupText>
                            {!currentPitcher && !currentBatter
                                ? 'Select your pitcher and the opponent batter to start tracking pitches.'
                                : !currentPitcher
                                  ? 'Select your pitcher to continue.'
                                  : 'Select the opponent batter to continue.'}
                        </SetupText>
                        {!currentBatter && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/lineup`)}>Setup Opponent Lineup</SetupButton>
                        )}
                    </SetupPrompt>
                )}

                {currentAtBat ? (
                    <>
                        <CountDisplay>
                            <CountLabel>Count</CountLabel>
                            <CountValue>
                                {currentAtBat.balls}-{currentAtBat.strikes}
                            </CountValue>
                            <OutsDisplay>{currentAtBat.outs_before} Outs</OutsDisplay>
                        </CountDisplay>

                        <StrikeZone onLocationSelect={handleLocationSelect} previousPitches={pitches} />

                        <PitchForm>
                            <FormRow>
                                <FormGroup>
                                    <Label>Pitch Type</Label>
                                    <Select value={pitchType} onChange={(e) => setPitchType(e.target.value as PitchType)}>
                                        <option value="fastball">Fastball</option>
                                        <option value="2-seam">2-Seam</option>
                                        <option value="4-seam">4-Seam</option>
                                        <option value="cutter">Cutter</option>
                                        <option value="sinker">Sinker</option>
                                        <option value="slider">Slider</option>
                                        <option value="curveball">Curveball</option>
                                        <option value="changeup">Changeup</option>
                                        <option value="splitter">Splitter</option>
                                        <option value="other">Other</option>
                                    </Select>
                                </FormGroup>

                                <FormGroup>
                                    <Label>Velocity (mph)</Label>
                                    <Input
                                        type="number"
                                        value={velocity}
                                        onChange={(e) => setVelocity(e.target.value)}
                                        placeholder="85"
                                        min="0"
                                        max="120"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormGroup>
                                <Label>Result</Label>
                                <ResultButtons>
                                    <ResultButton
                                        active={pitchResult === 'ball'}
                                        onClick={() => setPitchResult('ball')}
                                        color={theme.colors.gray[400]}
                                    >
                                        Ball
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'called_strike'}
                                        onClick={() => setPitchResult('called_strike')}
                                        color={theme.colors.green[500]}
                                    >
                                        Called Strike
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'swinging_strike'}
                                        onClick={() => setPitchResult('swinging_strike')}
                                        color={theme.colors.red[500]}
                                    >
                                        Swinging Strike
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'foul'}
                                        onClick={() => setPitchResult('foul')}
                                        color={theme.colors.yellow[500]}
                                    >
                                        Foul
                                    </ResultButton>
                                    <ResultButton
                                        active={pitchResult === 'in_play'}
                                        onClick={() => setPitchResult('in_play')}
                                        color={theme.colors.primary[600]}
                                    >
                                        In Play
                                    </ResultButton>
                                </ResultButtons>
                            </FormGroup>

                            <LogButton onClick={handleLogPitch} disabled={!pitchLocation}>
                                Log Pitch
                            </LogButton>

                            {pitchResult === 'in_play' && (
                                <EndAtBatButton onClick={() => handleEndAtBat('in_play')}>Record Play & End At-Bat</EndAtBatButton>
                            )}
                        </PitchForm>
                    </>
                ) : (
                    <NoAtBatContainer>
                        <NoAtBatText>No active at-bat</NoAtBatText>
                        <StartAtBatButton onClick={handleStartAtBat} disabled={needsSetup}>
                            Start New At-Bat
                        </StartAtBatButton>
                    </NoAtBatContainer>
                )}
            </MainPanel>

            {/* Pitcher Selector Modal */}
            {showPitcherSelector && gameId && game.home_team_id && (
                <PitcherSelector
                    gameId={gameId}
                    teamId={game.home_team_id}
                    currentInning={game.current_inning || 1}
                    onPitcherSelected={handlePitcherSelected}
                    onClose={() => setShowPitcherSelector(false)}
                />
            )}

            {/* Batter Selector Modal */}
            {showBatterSelector && gameId && (
                <BatterSelector
                    gameId={gameId}
                    currentBattingOrder={currentBattingOrder}
                    onBatterSelected={handleBatterSelected}
                    onClose={() => setShowBatterSelector(false)}
                />
            )}
        </Container>
    );
};

export default LiveGame;
