import { PITCH_CALL_ZONE_LABELS } from '@pitch-tracker/shared';
import React from 'react';
import BatterSelector from '../../components/game/BatterSelector';
import PitcherSelector from '../../components/game/PitcherSelector';
import BaseRunnerDisplay from '../../components/live/BaseRunnerDisplay';
import BatterHistory from '../../components/live/BatterHistory';
import CountBreakdownPanel from '../../components/live/CountBreakdownPanel';
import HitterTendenciesPanel from '../../components/live/HitterTendenciesPanel';
import OpposingPitcherPanel from '../../components/live/OpposingPitcherPanel';
import PitcherStats from '../../components/live/PitcherStats';
import PitcherTendenciesPanel from '../../components/live/PitcherTendenciesPanel';
import SituationalCallsRow from '../../components/live/SituationalCallsRow';
import StrikeZone from '../../components/live/StrikeZone';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { theme } from '../../styles/theme';
import BaserunnerOutModal from './BaserunnerOutModal';
import DiamondModal from './DiamondModal';
import InningChangeModal from './InningChangeModal';
import RunnerAdvancementModal from './RunnerAdvancementModal';
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
    SwapButton,
} from './styles';
import TeamAtBatModal from './TeamAtBatModal';
import { useLiveGameActions } from './useLiveGameActions';
import { useLiveGameState } from './useLiveGameState';

const LiveGame: React.FC = () => {
    const state = useLiveGameState();
    const actions = useLiveGameActions(state);

    const {
        gameId,
        navigate,
        game,
        currentAtBat,
        pitches,
        loading,
        pitchLocation,
        targetZone,
        pitchType,
        setPitchType,
        velocity,
        setVelocity,
        pitchResult,
        setPitchResult,
        currentPitcher,
        currentBatter,
        currentBattingOrder,
        showPitcherSelector,
        setShowPitcherSelector,
        showBatterSelector,
        setShowBatterSelector,
        statsRefreshTrigger,
        availablePitchTypes,
        currentOuts,
        showInningChange,
        inningChangeInfo,
        teamRunsScored,
        setTeamRunsScored,
        showDiamondModal,
        setShowDiamondModal,
        hitType,
        setHitType,
        hitLocation,
        setHitLocation,
        showHeatZones,
        setShowHeatZones,
        heatZones,
        baseRunners,
        showBaserunnerOutModal,
        setShowBaserunnerOutModal,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        showTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        activeCall,
        sendingCall,
        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,
        localShakeCount,
        opposingPitchers,
        setOpposingPitchers,
        currentOpposingPitcher,
        setCurrentOpposingPitcher,
        showCountBreakdown,
        setShowCountBreakdown,
        gameMode,
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
                {game.charting_mode !== 'our_pitcher' && gameId && (
                    <OpposingPitcherPanel
                        gameId={gameId}
                        opposingPitchers={opposingPitchers}
                        currentOpposingPitcher={currentOpposingPitcher}
                        onSelect={setCurrentOpposingPitcher}
                        opponentName={game.opponent_name}
                        onCreate={async (params) => {
                            const pitcher = await opposingPitcherService.create(params);
                            setOpposingPitchers((prev) => [...prev, pitcher]);
                            setCurrentOpposingPitcher(pitcher);
                        }}
                        onDelete={async (id) => {
                            await opposingPitcherService.delete(id);
                            setOpposingPitchers((prev) => prev.filter((p) => p.id !== id));
                            if (currentOpposingPitcher?.id === id) setCurrentOpposingPitcher(null);
                        }}
                    />
                )}
                {gameId && (
                    <>
                        <button
                            onClick={() => setShowCountBreakdown((v) => !v)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: showCountBreakdown ? theme.colors.primary[600] : theme.colors.gray[100],
                                color: showCountBreakdown ? 'white' : theme.colors.gray[700],
                                border: `1px solid ${showCountBreakdown ? theme.colors.primary[400] : theme.colors.gray[300]}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                width: '100%',
                            }}
                        >
                            {showCountBreakdown ? 'Hide' : 'Show'} Count Breakdown
                        </button>
                        {showCountBreakdown && (
                            <CountBreakdownPanel
                                gameId={gameId}
                                pitcherId={gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined}
                                teamSide={gameMode === 'our_pitcher' ? 'our_team' : 'opponent'}
                                refreshTrigger={statsRefreshTrigger}
                            />
                        )}
                    </>
                )}
            </LeftPanel>

            <MainPanel>
                <TopBar>
                    <BackButton onClick={() => navigate('/')}>← Back to Dashboard</BackButton>
                    <TopBarRight>
                        <GameStatus status={game.status}>
                            {game.status === 'scheduled'
                                ? 'Scheduled'
                                : game.status === 'in_progress'
                                  ? 'In Progress'
                                  : 'Completed'}
                        </GameStatus>
                        {!game.total_pitches && (
                            <SwapButton onClick={actions.handleToggleHomeAway} title="Swap home/away">
                                ⇄ Home/Away
                            </SwapButton>
                        )}
                        {game.home_team_id && gameId && (
                            <SwapButton
                                onClick={async () => {
                                    try {
                                        const { default: svc } = await import('../../services/scoutingReportService');
                                        const existing = await svc.getByGameId(gameId);
                                        if (existing) {
                                            navigate(`/teams/${game.home_team_id}/scouting/${existing.id}`);
                                        } else {
                                            navigate(`/teams/${game.home_team_id}/scouting`);
                                        }
                                    } catch {
                                        navigate(`/teams/${game.home_team_id}/scouting`);
                                    }
                                }}
                                title="Open scouting report for this game"
                            >
                                📋 Scouting
                            </SwapButton>
                        )}
                        {game.status === 'in_progress' && <EndGameButton onClick={actions.handleEndGame}>End Game</EndGameButton>}
                        {game.status === 'completed' && (
                            <ResumeGameButton onClick={actions.handleResumeGame}>Resume Game</ResumeGameButton>
                        )}
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
                        <TeamName>
                            {game.is_home_game === false ? game.home_team_name || 'Your Team' : game.opponent_name || 'Away Team'}
                        </TeamName>
                        <Score>{game.is_home_game === false ? game.home_score || 0 : game.away_score || 0}</Score>
                    </TeamInfo>
                    <GameInfo>
                        <Inning>Inning {game.current_inning || 1}</Inning>
                        <InningHalf>{game.inning_half === 'top' ? '▲ Top' : '▼ Bottom'}</InningHalf>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                            <OutsContainer>
                                <OutsLabel>Outs</OutsLabel>
                                <OutIndicator active={currentOuts >= 1} />
                                <OutIndicator active={currentOuts >= 2} />
                            </OutsContainer>
                            <BaseRunnerDisplay runners={baseRunners} size={50} />
                        </div>
                        {(baseRunners.first || baseRunners.second || baseRunners.third) && game.status === 'in_progress' && (
                            <button
                                onClick={() => setShowBaserunnerOutModal(true)}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    background: theme.colors.red[50],
                                    color: theme.colors.red[700],
                                    border: `1px solid ${theme.colors.red[200]}`,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                }}
                            >
                                Record Runner Out
                            </button>
                        )}
                    </GameInfo>
                    <TeamInfo>
                        <TeamName>
                            {game.is_home_game === false ? game.opponent_name || 'Home Team' : game.home_team_name || 'Your Team'}
                        </TeamName>
                        <Score>{game.is_home_game === false ? game.away_score || 0 : game.home_score || 0}</Score>
                    </TeamInfo>
                </GameHeader>

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                            <ChangeButton onClick={() => setShowPitcherSelector(true)} disabled={game.status === 'completed'}>
                                {currentPitcher ? 'Change' : 'Select'}
                            </ChangeButton>
                            {currentPitcher && (
                                <button
                                    onClick={() => setShowPitcherTendencies(true)}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: theme.colors.primary[600],
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: theme.borderRadius.sm,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap' as const,
                                    }}
                                >
                                    Tendencies
                                </button>
                            )}
                        </div>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                            <ChangeButton onClick={() => setShowBatterSelector(true)} disabled={game.status === 'completed'}>
                                {currentBatter ? 'Change' : 'Select'}
                            </ChangeButton>
                            {currentBatter && (
                                <button
                                    onClick={() => setShowHitterTendencies(true)}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: theme.colors.green[600],
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: theme.borderRadius.sm,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap' as const,
                                    }}
                                >
                                    Tendencies
                                </button>
                            )}
                        </div>
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
                            <CountValue>
                                {currentAtBat.balls}-{currentAtBat.strikes}
                            </CountValue>
                        </CountDisplay>

                        <StepIndicator>
                            <Step completed={!!pitchType} active={!pitchType}>
                                <StepNumber completed={!!pitchType} active={!pitchType}>
                                    {pitchType ? '✓' : '1'}
                                </StepNumber>
                                <StepLabel active={!pitchType}>Type</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchType} />
                            <Step completed={!!targetZone} active={!!pitchType && !targetZone}>
                                <StepNumber completed={!!targetZone} active={!!pitchType && !targetZone}>
                                    {targetZone ? '✓' : '2'}
                                </StepNumber>
                                <StepLabel active={!!pitchType && !targetZone}>Target</StepLabel>
                            </Step>
                            <StepConnector completed={!!targetZone} />
                            <Step completed={!!activeCall} active={!!targetZone && !activeCall}>
                                <StepNumber completed={!!activeCall} active={!!targetZone && !activeCall}>
                                    {activeCall ? '✓' : '3'}
                                </StepNumber>
                                <StepLabel active={!!targetZone && !activeCall}>Send</StepLabel>
                            </Step>
                            <StepConnector completed={!!activeCall} />
                            <Step completed={!!pitchLocation} active={!!activeCall && !pitchLocation}>
                                <StepNumber completed={!!pitchLocation} active={!!activeCall && !pitchLocation}>
                                    {pitchLocation ? '✓' : '4'}
                                </StepNumber>
                                <StepLabel active={!!activeCall && !pitchLocation}>Location</StepLabel>
                            </Step>
                            <StepConnector completed={!!pitchLocation} />
                            <Step completed={!!pitchResult} active={!!pitchLocation}>
                                <StepNumber completed={!!pitchResult} active={!!pitchLocation}>
                                    {pitchResult ? '✓' : '5'}
                                </StepNumber>
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

                        {/* Send Call button - appears after type + zone selected */}
                        {targetZone && !activeCall && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    padding: '10px 16px',
                                    background: '#F5A623',
                                    borderRadius: '8px',
                                    cursor: sendingCall ? 'wait' : 'pointer',
                                    opacity: sendingCall ? 0.6 : 1,
                                }}
                                onClick={sendingCall ? undefined : actions.handleSendCall}
                            >
                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0A1628' }}>
                                    {sendingCall ? 'SENDING...' : `SEND CALL: ${pitchType} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                                </span>
                            </div>
                        )}

                        {/* Active call badge */}
                        {activeCall && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: theme.colors.green[50],
                                    border: `1px solid ${theme.colors.green[300]}`,
                                    borderRadius: '8px',
                                }}
                            >
                                <span style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.green[700] }}>
                                    Call Sent: {activeCall.pitch_type} →{' '}
                                    {activeCall.zone ? PITCH_CALL_ZONE_LABELS[activeCall.zone] : ''}
                                </span>
                            </div>
                        )}

                        {/* Situational calls row */}
                        <SituationalCallsRow
                            gameId={game.id}
                            teamId={game.home_team_id || ''}
                            pitcherId={currentPitcher?.player_id}
                            opponentBatterId={currentBatter?.id}
                            inning={game.current_inning}
                            shakeCount={(game.shake_count ?? 0) + localShakeCount}
                            disabled={game.status !== 'in_progress'}
                            onCallSent={actions.handleSituationalCall}
                        />

                        <StrikeZoneRow>
                            <StrikeZoneContainer>
                                <HeatZoneToggleContainer>
                                    <HeatZoneToggleLabel>{showHeatZones ? 'Hide' : 'Show'} Heat Zones</HeatZoneToggleLabel>
                                    <ToggleSwitch>
                                        <ToggleSwitchInput
                                            type="checkbox"
                                            checked={showHeatZones}
                                            onChange={() => setShowHeatZones(!showHeatZones)}
                                        />
                                        <ToggleSwitchSlider />
                                    </ToggleSwitch>
                                </HeatZoneToggleContainer>
                                <StrikeZone
                                    onLocationSelect={actions.handleLocationSelect}
                                    onTargetZoneSelect={actions.handleTargetZoneSelect}
                                    onTargetClear={actions.handleTargetClear}
                                    targetZone={targetZone}
                                    previousPitches={pitches}
                                    heatZones={heatZones}
                                    showHeatZones={showHeatZones}
                                    batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                                    pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                                />
                            </StrikeZoneContainer>

                            <PitchForm>
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

                                <LogButton onClick={actions.handleLogPitch} disabled={!pitchLocation}>
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

            {showTeamAtBat && game && (
                <TeamAtBatModal
                    inning={game.current_inning || 1}
                    inningHalf={game.inning_half || 'top'}
                    teamRunsScored={teamAtBatRuns}
                    onTeamRunsChange={setTeamAtBatRuns}
                    onConfirm={actions.handleTeamAtBatConfirm}
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
                    onClose={() => {
                        setShowDiamondModal(false);
                        setHitLocation(null);
                    }}
                />
            )}

            {showBaserunnerOutModal && (
                <BaserunnerOutModal
                    isOpen={showBaserunnerOutModal}
                    onClose={() => setShowBaserunnerOutModal(false)}
                    runners={baseRunners}
                    currentOuts={currentOuts}
                    onRecordOut={(eventType, runnerBase) => actions.handleRecordBaserunnerOut(runnerBase, eventType)}
                />
            )}

            {showRunnerAdvancementModal && pendingHitResult && (
                <RunnerAdvancementModal
                    isOpen={showRunnerAdvancementModal}
                    onClose={() => setShowRunnerAdvancementModal(false)}
                    currentRunners={baseRunners}
                    hitResult={pendingHitResult}
                    onConfirm={actions.handleRunnerAdvancementConfirm}
                />
            )}

            {showPitcherTendencies && currentPitcher && (
                <PitcherTendenciesPanel
                    pitcherId={currentPitcher.player_id}
                    pitcherName={pitcherName || 'Pitcher'}
                    initialBatterHand={(currentBatter?.bats as 'L' | 'R') || 'R'}
                    onClose={() => setShowPitcherTendencies(false)}
                />
            )}

            {showHitterTendencies && currentBatter && (
                <HitterTendenciesPanel
                    batterId={currentBatter.id}
                    batterName={currentBatter.player_name}
                    batterType="opponent"
                    onClose={() => setShowHitterTendencies(false)}
                    gameId={gameId || undefined}
                />
            )}
        </Container>
    );
};

export default LiveGame;
