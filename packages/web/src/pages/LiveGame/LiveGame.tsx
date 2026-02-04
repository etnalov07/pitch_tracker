import React from 'react';
import BatterSelector from '../../components/game/BatterSelector';
import PitcherSelector from '../../components/game/PitcherSelector';
import BatterHistory from '../../components/live/BatterHistory';
import PitcherStats from '../../components/live/PitcherStats';
import StrikeZone from '../../components/live/StrikeZone';
import { theme } from '../../styles/theme';
import DiamondModal from './DiamondModal';
import InningChangeModal from './InningChangeModal';
import { useLiveGameState } from './useLiveGameState';
import { useLiveGameActions } from './useLiveGameActions';
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
    TopBarRight,
    EndGameButton,
    ResumeGameButton,
    StartGamePrompt,
    StartGameText,
    OutsContainer,
    OutsLabel,
    OutIndicator,
    OpenDiamondButton,
    HeatZoneToggleContainer,
    HeatZoneToggleLabel,
    ToggleSwitch,
    ToggleSwitchInput,
    ToggleSwitchSlider,
    StepIndicator,
    Step,
    StepNumber,
    StepLabel,
    StepConnector,
    PitchTypeSelector,
    PitchTypeSelectorTitle,
    PitchTypeGrid,
    PitchTypeButton,
} from './styles';

const LiveGame: React.FC = () => {
    const state = useLiveGameState();
    const actions = useLiveGameActions(state);

    const {
        gameId, navigate,
        game, currentAtBat, pitches, loading,
        pitchLocation, targetLocation, pitchType, setPitchType,
        velocity, setVelocity, pitchResult, setPitchResult,
        currentPitcher, currentBatter, currentBattingOrder,
        showPitcherSelector, setShowPitcherSelector,
        showBatterSelector, setShowBatterSelector,
        statsRefreshTrigger, availablePitchTypes,
        currentOuts,
        showInningChange, inningChangeInfo, teamRunsScored, setTeamRunsScored,
        showDiamondModal, setShowDiamondModal,
        hitType, setHitType, hitLocation, setHitLocation,
        showHeatZones, setShowHeatZones, heatZones,
    } = state;

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
            <LeftPanel>
                <PitcherStats
                    pitcherId={currentPitcher?.player_id || ''}
                    gameId={gameId || ''}
                    pitcherName={pitcherName}
                    refreshTrigger={statsRefreshTrigger}
                />
                <BatterHistory batterId={currentBatter?.id || ''} pitcherId={currentPitcher?.player_id || ''} />
            </LeftPanel>

            <MainPanel>
                <TopBar>
                    <BackButton onClick={() => navigate('/')}>← Back to Dashboard</BackButton>
                    <TopBarRight>
                        <GameStatus status={game.status}>
                            {game.status === 'scheduled' ? 'Scheduled' : game.status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </GameStatus>
                        {game.status === 'in_progress' && <EndGameButton onClick={actions.handleEndGame}>End Game</EndGameButton>}
                        {game.status === 'completed' && <ResumeGameButton onClick={actions.handleResumeGame}>Resume Game</ResumeGameButton>}
                    </TopBarRight>
                </TopBar>

                {game.status === 'scheduled' && (
                    <StartGamePrompt>
                        <StartGameText>Game is scheduled but not yet started. Click below to begin tracking.</StartGameText>
                        <StartGameButton onClick={actions.handleStartGame}>Start Game</StartGameButton>
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

                <PlayersRow>
                    <PlayerDisplay>
                        <PlayerInfo>
                            <PlayerLabel>Pitcher</PlayerLabel>
                            {currentPitcher ? (
                                <>
                                    <PlayerNumber>{currentPitcher.player?.jersey_number || '#'}</PlayerNumber>
                                    <PlayerName>{currentPitcher.player?.first_name} {currentPitcher.player?.last_name}</PlayerName>
                                </>
                            ) : (
                                <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                            )}
                        </PlayerInfo>
                        <ChangeButton onClick={() => setShowPitcherSelector(true)} disabled={game.status === 'completed'}>
                            {currentPitcher ? 'Change' : 'Select'}
                        </ChangeButton>
                    </PlayerDisplay>

                    <PlayerDisplay>
                        <PlayerInfo>
                            <PlayerLabel>Batter (#{currentBattingOrder})</PlayerLabel>
                            {currentBatter ? (
                                <PlayerName>{currentBatter.player_name}</PlayerName>
                            ) : (
                                <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                            )}
                        </PlayerInfo>
                        <ChangeButton onClick={() => setShowBatterSelector(true)} disabled={game.status === 'completed'}>
                            {currentBatter ? 'Change' : 'Select'}
                        </ChangeButton>
                    </PlayerDisplay>
                </PlayersRow>

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
                            <CountValue>{currentAtBat.balls}-{currentAtBat.strikes}</CountValue>
                        </CountDisplay>

                        <StepIndicator>
                            <Step completed={!!pitchType} active={!pitchType}>
                                <StepNumber completed={!!pitchType} active={!pitchType}>{pitchType ? '✓' : '1'}</StepNumber>
                                <StepLabel active={!pitchType}>Type</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchType} />
                            <Step completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>
                                <StepNumber completed={!!targetLocation} active={!!pitchType && !targetLocation && !pitchLocation}>{targetLocation ? '✓' : '2'}</StepNumber>
                                <StepLabel active={!!pitchType && !targetLocation && !pitchLocation}>Target</StepLabel>
                            </Step>
                            <StepConnector completed={!!targetLocation || !!pitchLocation} />
                            <Step completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>
                                <StepNumber completed={!!pitchLocation} active={!!pitchType && !pitchLocation}>{pitchLocation ? '✓' : '3'}</StepNumber>
                                <StepLabel active={!!pitchType && !pitchLocation}>Location</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchLocation} />
                            <Step completed={!!velocity} active={!!pitchLocation && !velocity}>
                                <StepNumber completed={!!velocity} active={!!pitchLocation && !velocity}>{velocity ? '✓' : '4'}</StepNumber>
                                <StepLabel active={!!pitchLocation && !velocity}>Velocity</StepLabel>
                            </Step>
                            <StepConnector completed={!!velocity || !!pitchLocation} />
                            <Step completed={!!pitchResult} active={!!pitchLocation}>
                                <StepNumber completed={!!pitchResult} active={!!pitchLocation}>{pitchResult ? '✓' : '5'}</StepNumber>
                                <StepLabel active={!!pitchLocation}>Result</StepLabel>
                            </Step>
                        </StepIndicator>

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

                        <StrikeZoneRow>
                            <StrikeZoneContainer>
                                <HeatZoneToggleContainer>
                                    <HeatZoneToggleLabel>{showHeatZones ? 'Hide' : 'Show'} Heat Zones</HeatZoneToggleLabel>
                                    <ToggleSwitch>
                                        <ToggleSwitchInput type="checkbox" checked={showHeatZones} onChange={() => setShowHeatZones(!showHeatZones)} />
                                        <ToggleSwitchSlider />
                                    </ToggleSwitch>
                                </HeatZoneToggleContainer>
                                <StrikeZone
                                    onLocationSelect={actions.handleLocationSelect}
                                    onTargetSelect={actions.handleTargetSelect}
                                    onTargetClear={actions.handleTargetClear}
                                    targetLocation={targetLocation}
                                    previousPitches={pitches}
                                    heatZones={heatZones}
                                    showHeatZones={showHeatZones}
                                />
                            </StrikeZoneContainer>

                            <PitchForm>
                                <FormGroup>
                                    <Label>Step 4: Velocity (mph) - Optional</Label>
                                    <Input type="number" value={velocity} onChange={(e) => setVelocity(e.target.value)} placeholder="85" min="0" max="120" />
                                </FormGroup>

                                <FormGroup>
                                    <Label>Step 5: Result</Label>
                                    <ResultButtons>
                                        <ResultButton active={pitchResult === 'ball'} onClick={() => setPitchResult('ball')} color={theme.colors.gray[400]}>Ball</ResultButton>
                                        <ResultButton active={pitchResult === 'called_strike'} onClick={() => setPitchResult('called_strike')} color={theme.colors.green[500]}>Called Strike</ResultButton>
                                        <ResultButton active={pitchResult === 'swinging_strike'} onClick={() => setPitchResult('swinging_strike')} color={theme.colors.red[500]}>Swinging Strike</ResultButton>
                                        <ResultButton active={pitchResult === 'foul'} onClick={() => setPitchResult('foul')} color={theme.colors.yellow[500]}>Foul</ResultButton>
                                        <ResultButton active={pitchResult === 'in_play'} onClick={() => setPitchResult('in_play')} color={theme.colors.primary[600]}>In Play</ResultButton>
                                    </ResultButtons>
                                </FormGroup>

                                <LogButton onClick={actions.handleLogPitch} disabled={!pitchLocation}>Log Pitch</LogButton>

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
                        <NoAtBatText>
                            {game.status === 'completed' ? 'Game completed - Resume to continue tracking' : 'No active at-bat'}
                        </NoAtBatText>
                        <StartAtBatButton onClick={actions.handleStartAtBat} disabled={needsSetup || game.status === 'completed'}>
                            Start New At-Bat
                        </StartAtBatButton>
                    </NoAtBatContainer>
                )}
            </MainPanel>

            {showPitcherSelector && gameId && game.home_team_id && (
                <PitcherSelector
                    gameId={gameId}
                    teamId={game.home_team_id}
                    currentInning={game.current_inning || 1}
                    onPitcherSelected={actions.handlePitcherSelected}
                    onClose={() => setShowPitcherSelector(false)}
                />
            )}

            {showBatterSelector && gameId && (
                <BatterSelector
                    gameId={gameId}
                    currentBattingOrder={currentBattingOrder}
                    onBatterSelected={actions.handleBatterSelected}
                    onClose={() => setShowBatterSelector(false)}
                />
            )}

            {showInningChange && inningChangeInfo && (
                <InningChangeModal
                    inningChangeInfo={inningChangeInfo}
                    teamRunsScored={teamRunsScored}
                    onTeamRunsChange={setTeamRunsScored}
                    onConfirm={actions.handleInningChangeConfirm}
                />
            )}

            {showDiamondModal && (
                <DiamondModal
                    hitType={hitType}
                    hitLocation={hitLocation}
                    onHitTypeChange={setHitType}
                    onHitLocationChange={setHitLocation}
                    onResult={actions.handleDiamondResult}
                    onClose={() => { setShowDiamondModal(false); setHitLocation(null); }}
                />
            )}
        </Container>
    );
};

export default LiveGame;
