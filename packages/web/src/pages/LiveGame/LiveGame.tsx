import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BatterSelector from '../../components/game/BatterSelector';
import PitcherSelector from '../../components/game/PitcherSelector';
import BaseballDiamond, { HitType, HitLocation } from '../../components/live/BaseballDiamond';
import BatterHistory from '../../components/live/BatterHistory';
import PitcherStats from '../../components/live/PitcherStats';
import StrikeZone from '../../components/live/StrikeZone';
import useHeatZones from '../../hooks/useHeatZones';
import api from '../../services/api';
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
    StrikeZoneRow,
    StrikeZoneContainer,
    PitchForm,
    FormGroup,
    Label,
    Input,
    ResultButtons,
    ResultButton,
    LogButton,
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
    OutsContainer,
    OutsLabel,
    OutIndicator,
    InningChangeOverlay,
    InningChangeModal,
    InningChangeText,
    InningChangeSubtext,
    InningChangeDismiss,
    DiamondModalOverlay,
    DiamondModal,
    DiamondModalHeader,
    DiamondModalTitle,
    DiamondModalClose,
    HitTypeSelector,
    HitTypeButton,
    DiamondInstructions,
    DiamondContainer,
    DiamondResultSection,
    DiamondResultTitle,
    DiamondResultGrid,
    DiamondResultButton,
    OpenDiamondButton,
    HeatZoneToggle,
    StepIndicator,
    Step,
    StepNumber,
    StepLabel,
    StepConnector,
    PitchTypeSelector,
    PitchTypeSelectorTitle,
    PitchTypeGrid,
    PitchTypeButton,
    CurrentStepCard,
    CurrentStepTitle,
    CurrentStepDescription,
} from './styles';

const ALL_PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curveball' },
    { value: 'changeup', label: 'Changeup' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckleball' },
    { value: 'other', label: 'Other' },
];

const LiveGame: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { selectedGame: game, currentAtBat, pitches, loading } = useAppSelector((state) => state.games);

    // Pitch form state
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
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

    // Trigger to refresh pitcher stats after each pitch
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    // Pitcher's available pitch types
    const [pitcherPitchTypes, setPitcherPitchTypes] = useState<PitchType[]>([]);

    // Opponent lineup for auto-advancing batters
    const [opponentLineup, setOpponentLineup] = useState<OpponentLineupPlayer[]>([]);

    // Out tracking
    const [currentOuts, setCurrentOuts] = useState(0);

    // Inning change notification
    const [showInningChange, setShowInningChange] = useState(false);
    const [inningChangeInfo, setInningChangeInfo] = useState<{ inning: number; half: string } | null>(null);

    // Baseball diamond modal for in-play recording
    const [showDiamondModal, setShowDiamondModal] = useState(false);
    const [hitType, setHitType] = useState<HitType>('line_drive');
    const [hitLocation, setHitLocation] = useState<HitLocation | null>(null);

    // Heat zones
    const [showHeatZones, setShowHeatZones] = useState(false);
    const { zones: heatZones } = useHeatZones(currentPitcher?.player_id, gameId);

    useEffect(() => {
        if (gameId) {
            dispatch(fetchGameById(gameId));
            // Fetch opponent lineup for auto-advancing
            api.get<{ lineup: OpponentLineupPlayer[] }>(`/opponent-lineup/game/${gameId}`)
                .then((response) => {
                    const lineup = response.data.lineup || [];
                    setOpponentLineup(lineup);
                    // If we have a lineup and no current batter, set the first batter
                    if (lineup.length > 0) {
                        const firstBatter = lineup.find((p) => p.batting_order === 1);
                        if (firstBatter) {
                            setCurrentBatter((prev) => (prev ? prev : firstBatter));
                        }
                    }
                })
                .catch((err) => console.error('Failed to load opponent lineup:', err));
            // Fetch current inning
            gamesApi.getCurrentInning(gameId).then(setCurrentInning);
        }
    }, [dispatch, gameId]);

    // Load pitcher's pitch types when pitcher changes
    useEffect(() => {
        if (currentPitcher?.player_id) {
            api.get<{ pitch_types: string[] }>(`/players/${currentPitcher.player_id}/pitch-types`)
                .then((response) => {
                    const types = (response.data.pitch_types || []) as PitchType[];
                    setPitcherPitchTypes(types);
                    // Set default pitch type to first available if current selection not in pitcher's repertoire
                    if (types.length > 0) {
                        setPitchType((prev) => (types.includes(prev) ? prev : types[0]));
                    }
                })
                .catch(() => setPitcherPitchTypes([]));
        } else {
            setPitcherPitchTypes([]);
        }
    }, [currentPitcher?.player_id]);

    // Filter pitch types: use pitcher's types if available, otherwise show all
    const availablePitchTypes =
        pitcherPitchTypes.length > 0 ? ALL_PITCH_TYPES.filter((pt) => pitcherPitchTypes.includes(pt.value)) : ALL_PITCH_TYPES;

    const handleLocationSelect = (x: number, y: number) => {
        setPitchLocation({ x, y });
    };

    const handleTargetSelect = (x: number, y: number) => {
        setTargetLocation({ x, y });
    };

    const handleTargetClear = () => {
        setTargetLocation(null);
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

            // Refresh pitcher stats
            setStatsRefreshTrigger((prev) => prev + 1);

            // Reset form
            setPitchLocation(null);
            setTargetLocation(null);
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

    // Helper function to determine if a result is an out
    const isOutResult = (result: string): boolean => {
        const outResults = [
            'strikeout',
            'groundout',
            'flyout',
            'lineout',
            'popout',
            'double_play',
            'triple_play',
            'fielders_choice',
            'force_out',
            'tag_out',
            'caught_stealing',
            'sacrifice_fly',
            'sacrifice_bunt',
        ];
        return outResults.includes(result);
    };

    // Get number of outs for a result (e.g., double play = 2)
    const getOutsForResult = (result: string): number => {
        if (result === 'double_play') return 2;
        if (result === 'triple_play') return 3;
        if (isOutResult(result)) return 1;
        return 0;
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

            // Reset for next at-bat
            dispatch(setCurrentAtBat(null));
            dispatch(clearPitches());

            // Handle out tracking and inning advancement
            if (outsFromPlay > 0) {
                if (newOutCount >= 3) {
                    // 3 outs - advance to next half-inning
                    setCurrentOuts(0);
                    try {
                        const updatedGame = await gamesApi.advanceInning(gameId!);
                        // Refresh game state
                        dispatch(fetchGameById(gameId!));
                        // Fetch new inning
                        const newInning = await gamesApi.getCurrentInning(gameId!);
                        setCurrentInning(newInning);
                        // Show inning change notification
                        setInningChangeInfo({
                            inning: updatedGame.current_inning,
                            half: updatedGame.inning_half,
                        });
                        setShowInningChange(true);
                        // Reset batting order to top when inning changes
                        setCurrentBattingOrder(1);
                        const firstBatter = opponentLineup.find((p) => p.batting_order === 1);
                        setCurrentBatter(firstBatter || null);
                    } catch (error) {
                        console.error('Failed to advance inning:', error);
                    }
                } else {
                    setCurrentOuts(newOutCount);
                    // Advance to next batter
                    advanceBattingOrder();
                }
            } else {
                // Not an out (walk, hit, etc.) - advance to next batter
                advanceBattingOrder();
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Failed to end at-bat');
        }
    };

    const handleDiamondResult = async (result: string) => {
        // Close the modal and reset state
        setShowDiamondModal(false);
        setHitLocation(null);
        // End the at-bat with the selected result
        await handleEndAtBat(result);
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
                    outs_before: currentOuts,
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

        // Auto-select the next batter from the lineup if available
        const nextBatter = opponentLineup.find((p) => p.batting_order === nextOrder);
        if (nextBatter) {
            setCurrentBatter(nextBatter);
        } else {
            setCurrentBatter(null); // Clear batter if not found in lineup
        }
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

    const pitcherName = currentPitcher?.player
        ? `${currentPitcher.player.first_name} ${currentPitcher.player.last_name}`
        : undefined;

    return (
        <Container>
            {/* Left Panel - Batter History & Pitcher Stats */}
            <LeftPanel>
                <PitcherStats
                    pitcherId={currentPitcher?.player_id || ''}
                    gameId={gameId || ''}
                    pitcherName={pitcherName}
                    refreshTrigger={statsRefreshTrigger}
                />
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
                        <InningHalf>{game.inning_half === 'top' ? '▲ Top' : '▼ Bottom'}</InningHalf>
                        <OutsContainer>
                            <OutsLabel>Outs</OutsLabel>
                            <OutIndicator active={currentOuts >= 1} />
                            <OutIndicator active={currentOuts >= 2} />
                        </OutsContainer>
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
                        </CountDisplay>

                        {/* Step Indicator */}
                        <StepIndicator>
                            <Step completed={!!pitchType} active={!pitchType}>
                                <StepNumber completed={!!pitchType} active={!pitchType}>
                                    {pitchType ? '✓' : '1'}
                                </StepNumber>
                                <StepLabel active={!pitchType}>Type</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchType} />
                            <Step completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>
                                <StepNumber completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>
                                    {targetLocation ? '✓' : '2'}
                                </StepNumber>
                                <StepLabel active={!!pitchType && !targetLocation && !pitchLocation}>Target</StepLabel>
                            </Step>
                            <StepConnector completed={!!targetLocation || !!pitchLocation} />
                            <Step completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>
                                <StepNumber completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>
                                    {pitchLocation ? '✓' : '3'}
                                </StepNumber>
                                <StepLabel active={!!pitchType && !pitchLocation}>Location</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchLocation} />
                            <Step completed={!!velocity} active={!!pitchLocation && !velocity}>
                                <StepNumber completed={!!velocity} active={!!pitchLocation && !velocity}>
                                    {velocity ? '✓' : '4'}
                                </StepNumber>
                                <StepLabel active={!!pitchLocation && !velocity}>Velocity</StepLabel>
                            </Step>
                            <StepConnector completed={!!velocity || !!pitchLocation} />
                            <Step completed={!!pitchResult} active={!!pitchLocation}>
                                <StepNumber completed={!!pitchResult} active={!!pitchLocation}>
                                    {pitchResult ? '✓' : '5'}
                                </StepNumber>
                                <StepLabel active={!!pitchLocation}>Result</StepLabel>
                            </Step>
                        </StepIndicator>

                        {/* Step 1: Pitch Type Selection */}
                        <PitchTypeSelector>
                            <PitchTypeSelectorTitle>Step 1: Select Pitch Type</PitchTypeSelectorTitle>
                            <PitchTypeGrid>
                                {availablePitchTypes.map(({ value, label }) => (
                                    <PitchTypeButton key={value} active={pitchType === value} onClick={() => setPitchType(value)}>
                                        {label}
                                    </PitchTypeButton>
                                ))}
                            </PitchTypeGrid>
                        </PitchTypeSelector>

                        {/* Steps 2-3: Target & Location via Strike Zone */}
                        <CurrentStepCard stepColor={!pitchLocation ? theme.colors.primary[600] : theme.colors.green[500]}>
                            <CurrentStepTitle>
                                {!targetLocation && !pitchLocation
                                    ? 'Step 2: Click to Set Target Location (optional)'
                                    : !pitchLocation
                                      ? 'Step 3: Click to Set Actual Pitch Location'
                                      : 'Location Set'}
                            </CurrentStepTitle>
                            <CurrentStepDescription>
                                {!targetLocation && !pitchLocation
                                    ? 'Click on the zone where the pitcher intended to throw. Skip by clicking directly for actual location.'
                                    : !pitchLocation
                                      ? 'Click where the pitch actually ended up. Right-click or double-click to clear target.'
                                      : `Pitch located at (${pitchLocation.x.toFixed(2)}, ${pitchLocation.y.toFixed(2)})`}
                            </CurrentStepDescription>
                        </CurrentStepCard>

                        <StrikeZoneRow>
                            <StrikeZoneContainer>
                                <HeatZoneToggle active={showHeatZones} onClick={() => setShowHeatZones(!showHeatZones)}>
                                    {showHeatZones ? 'Hide' : 'Show'} Heat Zones
                                </HeatZoneToggle>
                                <StrikeZone
                                    onLocationSelect={handleLocationSelect}
                                    onTargetSelect={handleTargetSelect}
                                    onTargetClear={handleTargetClear}
                                    targetLocation={targetLocation}
                                    previousPitches={pitches}
                                    heatZones={heatZones}
                                    showHeatZones={showHeatZones}
                                />
                            </StrikeZoneContainer>

                            <PitchForm>
                                {/* Step 4: Velocity */}
                                <FormGroup>
                                    <Label>Step 4: Velocity (mph) - Optional</Label>
                                    <Input
                                        type="number"
                                        value={velocity}
                                        onChange={(e) => setVelocity(e.target.value)}
                                        placeholder="85"
                                        min="0"
                                        max="120"
                                    />
                                </FormGroup>

                                {/* Step 5: Result */}
                                <FormGroup>
                                    <Label>Step 5: Result</Label>
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
                                    <OpenDiamondButton onClick={() => setShowDiamondModal(true)}>
                                        <span>&#9918;</span> Record Hit Location & Result
                                    </OpenDiamondButton>
                                )}
                            </PitchForm>
                        </StrikeZoneRow>
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

            {/* Inning Change Notification */}
            {showInningChange && inningChangeInfo && (
                <InningChangeOverlay>
                    <InningChangeModal>
                        <InningChangeText>
                            {inningChangeInfo.half === 'top' ? '▲' : '▼'}{' '}
                            {inningChangeInfo.half.charAt(0).toUpperCase() + inningChangeInfo.half.slice(1)} of{' '}
                            {inningChangeInfo.inning}
                        </InningChangeText>
                        <InningChangeSubtext>3 outs recorded. Moving to next half-inning.</InningChangeSubtext>
                        <InningChangeDismiss onClick={() => setShowInningChange(false)}>Continue</InningChangeDismiss>
                    </InningChangeModal>
                </InningChangeOverlay>
            )}

            {/* Baseball Diamond Modal for In-Play Recording */}
            {showDiamondModal && (
                <DiamondModalOverlay>
                    <DiamondModal>
                        <DiamondModalHeader>
                            <DiamondModalTitle>Record Hit Location</DiamondModalTitle>
                            <DiamondModalClose
                                onClick={() => {
                                    setShowDiamondModal(false);
                                    setHitLocation(null);
                                }}
                            >
                                &times;
                            </DiamondModalClose>
                        </DiamondModalHeader>

                        <HitTypeSelector>
                            <HitTypeButton
                                active={hitType === 'fly_ball'}
                                hitColor={theme.colors.primary[500]}
                                onClick={() => setHitType('fly_ball')}
                            >
                                Fly Ball
                            </HitTypeButton>
                            <HitTypeButton
                                active={hitType === 'line_drive'}
                                hitColor={theme.colors.red[500]}
                                onClick={() => setHitType('line_drive')}
                            >
                                Line Drive
                            </HitTypeButton>
                            <HitTypeButton
                                active={hitType === 'ground_ball'}
                                hitColor={theme.colors.yellow[600]}
                                onClick={() => setHitType('ground_ball')}
                            >
                                Ground Ball
                            </HitTypeButton>
                        </HitTypeSelector>

                        <DiamondInstructions>Click on the field to mark where the ball was hit</DiamondInstructions>

                        <DiamondContainer>
                            <BaseballDiamond
                                hitType={hitType}
                                selectedLocation={hitLocation}
                                onLocationSelect={(location) => setHitLocation(location)}
                            />
                        </DiamondContainer>

                        <DiamondResultSection>
                            <DiamondResultTitle>Select Result {!hitLocation && '(select location first)'}</DiamondResultTitle>
                            <DiamondResultGrid>
                                {/* Hit Results */}
                                <DiamondResultButton disabled={!hitLocation} onClick={() => handleDiamondResult('single')}>
                                    Single
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} onClick={() => handleDiamondResult('double')}>
                                    Double
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} onClick={() => handleDiamondResult('triple')}>
                                    Triple
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} onClick={() => handleDiamondResult('home_run')}>
                                    Home Run
                                </DiamondResultButton>
                                {/* Out Results */}
                                <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleDiamondResult('groundout')}>
                                    Groundout
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleDiamondResult('flyout')}>
                                    Flyout
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleDiamondResult('lineout')}>
                                    Lineout
                                </DiamondResultButton>
                                <DiamondResultButton disabled={!hitLocation} isOut onClick={() => handleDiamondResult('popout')}>
                                    Popout
                                </DiamondResultButton>
                                {/* Other Results */}
                                <DiamondResultButton disabled={!hitLocation} onClick={() => handleDiamondResult('error')}>
                                    Error
                                </DiamondResultButton>
                                <DiamondResultButton
                                    disabled={!hitLocation}
                                    isOut
                                    onClick={() => handleDiamondResult('fielders_choice')}
                                >
                                    FC
                                </DiamondResultButton>
                                <DiamondResultButton
                                    disabled={!hitLocation}
                                    isOut
                                    onClick={() => handleDiamondResult('double_play')}
                                >
                                    DP
                                </DiamondResultButton>
                                <DiamondResultButton
                                    disabled={!hitLocation}
                                    isOut
                                    onClick={() => handleDiamondResult('sacrifice_fly')}
                                >
                                    Sac Fly
                                </DiamondResultButton>
                            </DiamondResultGrid>
                        </DiamondResultSection>
                    </DiamondModal>
                </DiamondModalOverlay>
            )}
        </Container>
    );
};

export default LiveGame;
