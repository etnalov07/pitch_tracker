import { ABBREV_TO_PITCH_TYPE, PitchCallZone, PitchType } from '@pitch-tracker/shared';
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
import StrikeZone from '../../components/live/StrikeZone';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { theme } from '../../styles/theme';
import DiamondModal from './DiamondModal';
import DoublePlayModal from './DoublePlayModal';
import InningChangeModal from './InningChangeModal';
import RunnerAdvancementModal from './RunnerAdvancementModal';
import RunnerEventModal from './RunnerEventModal';
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
    LogRow,
    UndoButton,
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
    PitchTypeSelector,
    PitchTypeSelectorTitle,
    PitchTypeGrid,
    PitchTypeButton,
    SwapButton,
    RoleSelectOverlay,
    RoleSelectCard,
    RoleSelectTitle,
    RoleSelectSubtitle,
    RoleSelectButtons,
    RoleButton,
    DroppedThirdOverlay,
    DroppedThirdDialog,
    DroppedThirdTitle,
    DroppedThirdMessage,
    DroppedThirdButtons,
    DroppedThirdBtn,
} from './styles';
import TeamAtBatModal from './TeamAtBatModal';
import UndoPitchModal from './UndoPitchModal';
import { useLiveGameActions } from './useLiveGameActions';
import { useLiveGameState } from './useLiveGameState';
import ViewerDashboard from './ViewerDashboard';

const LiveGame: React.FC = () => {
    const state = useLiveGameState();
    const actions = useLiveGameActions(state);
    const [showSettingsPanel, setShowSettingsPanel] = React.useState(false);
    const [showUndoPitch, setShowUndoPitch] = React.useState(false);

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
        showRunnerEventModal,
        setShowRunnerEventModal,
        runnerEventDefaultTab,
        setRunnerEventDefaultTab,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        showDroppedThirdModal,
        setShowDroppedThirdModal,
        showDoublePlayModal,
        setShowDoublePlayModal,
        showTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,
        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,
        opposingPitchers,
        setOpposingPitchers,
        currentOpposingPitcher,
        setCurrentOpposingPitcher,
        showCountBreakdown,
        setShowCountBreakdown,
        gameMode,
        isScoutingMode,
        scoutingBattingSide,
        scoutingPitchingSide,
        gameRole,
        setGameRole,
        setStatsRefreshTrigger,
        myTeamLineup,
        currentMyBatter,
        setCurrentMyBatter,
        settings,
        updateSetting,
        activeCallId,
        setTargetZone,
        setActiveCallId,
    } = state;

    // Pull out settings flags for readability
    const { showVelocity, pitchCallEnabled } = settings;

    useGameWebSocket(gameId ?? null, {
        pitch_logged: () => setStatsRefreshTrigger((prev) => prev + 1),
        at_bat_ended: () => setStatsRefreshTrigger((prev) => prev + 1),
        inning_changed: () => setStatsRefreshTrigger((prev) => prev + 1),
        runners_updated: () => setStatsRefreshTrigger((prev) => prev + 1),
        // Incoming pitch call — pre-fill pitch type + target zone on a second device (e.g. catcher tablet)
        pitch_call: (payload) => {
            const { pitch_type, zone, id } = payload as { pitch_type?: string; zone?: string; id?: string };
            if (pitch_type) {
                const mapped = ABBREV_TO_PITCH_TYPE[pitch_type as keyof typeof ABBREV_TO_PITCH_TYPE] as PitchType | undefined;
                if (mapped) setPitchType(mapped);
            }
            if (zone) setTargetZone(zone as PitchCallZone);
            if (id) setActiveCallId(id);
        },
    });

    if (loading) {
        return <LoadingContainer>Loading game...</LoadingContainer>;
    }

    if (!game) {
        return <ErrorContainer>Game not found</ErrorContainer>;
    }

    if (gameRole === null && game.status === 'in_progress') {
        return (
            <RoleSelectOverlay>
                <RoleSelectCard>
                    <RoleSelectTitle>Join Game</RoleSelectTitle>
                    <RoleSelectSubtitle>Select your role for this session</RoleSelectSubtitle>
                    <RoleSelectButtons>
                        <RoleButton onClick={() => setGameRole('charter')}>Charter</RoleButton>
                        <RoleButton onClick={() => setGameRole('viewer')}>Viewer</RoleButton>
                    </RoleSelectButtons>
                </RoleSelectCard>
            </RoleSelectOverlay>
        );
    }

    if (gameRole === 'viewer' || game.status === 'completed') {
        return <ViewerDashboard game={game} refreshTrigger={statsRefreshTrigger} onExit={() => navigate('/')} />;
    }

    const needsSetup = isScoutingMode
        ? !currentOpposingPitcher || !currentBatter
        : gameMode === 'opp_pitcher'
          ? !currentOpposingPitcher
          : !currentPitcher || !currentBatter;

    // Single-team scouting: true when the current half is NOT the focus team's pitching half
    const scoutingFocus = game?.scouting_focus;
    const shouldSkipHalf =
        isScoutingMode &&
        game?.status === 'in_progress' &&
        scoutingFocus &&
        scoutingFocus !== 'both' &&
        ((scoutingFocus === 'home' && game.inning_half === 'bottom') || (scoutingFocus === 'away' && game.inning_half === 'top'));

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
                        opposingPitchers={
                            isScoutingMode ? opposingPitchers.filter((p) => p.team_side === scoutingPitchingSide) : opposingPitchers
                        }
                        currentOpposingPitcher={currentOpposingPitcher}
                        onSelect={setCurrentOpposingPitcher}
                        opponentName={
                            isScoutingMode
                                ? scoutingPitchingSide === 'home'
                                    ? game.scouting_home_team || 'Home Team'
                                    : game.opponent_name || 'Away Team'
                                : game.opponent_name
                        }
                        onCreate={async (params) => {
                            const pitcher = await opposingPitcherService.create({
                                ...params,
                                team_side: isScoutingMode ? (scoutingPitchingSide as 'home' | 'away') : undefined,
                            });
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
                        {/* Settings gear — opens a small panel to toggle velocity + pitch calls */}
                        <div style={{ position: 'relative' }}>
                            <SwapButton title="Settings" onClick={() => setShowSettingsPanel((v) => !v)}>
                                ⚙ Settings
                            </SwapButton>
                            {showSettingsPanel && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '110%',
                                        right: 0,
                                        background: 'white',
                                        border: `1px solid ${theme.colors.gray[200]}`,
                                        borderRadius: '10px',
                                        boxShadow: theme.shadows.md,
                                        padding: '14px 18px',
                                        minWidth: '220px',
                                        zIndex: 200,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            color: theme.colors.gray[700],
                                            marginBottom: '12px',
                                        }}
                                    >
                                        Chart Settings
                                    </div>
                                    {[
                                        {
                                            key: 'showVelocity' as const,
                                            label: 'Record velocity',
                                            sub: 'Adds a velocity field after location',
                                        },
                                        {
                                            key: 'pitchCallEnabled' as const,
                                            label: 'Pitch call transmission',
                                            sub: 'Send calls to catcher before each pitch',
                                        },
                                    ].map(({ key, label, sub }) => (
                                        <label
                                            key={key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '10px',
                                                marginBottom: '10px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={settings[key]}
                                                onChange={(e) => updateSetting(key, e.target.checked)}
                                                style={{ marginTop: '2px', cursor: 'pointer' }}
                                            />
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.gray[800] }}>
                                                    {label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: theme.colors.gray[500] }}>{sub}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        {game.status === 'in_progress' && <EndGameButton onClick={actions.handleEndGame}>End Game</EndGameButton>}
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
                            {isScoutingMode
                                ? game.opponent_name || 'Away Team'
                                : game.is_home_game === false
                                  ? game.home_team_name || 'Your Team'
                                  : game.opponent_name || 'Away Team'}
                        </TeamName>
                        <Score>{game.away_score || 0}</Score>
                        {isScoutingMode && (
                            <div style={{ fontSize: '10px', color: theme.colors.gray[500], marginTop: '2px' }}>
                                {scoutingBattingSide === 'away' ? '⚾ BATTING' : '🏟 PITCHING'}
                            </div>
                        )}
                    </TeamInfo>
                    <GameInfo>
                        {isScoutingMode && (
                            <div
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: theme.colors.primary[600],
                                    background: theme.colors.primary[50],
                                    border: `1px solid ${theme.colors.primary[200]}`,
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    marginBottom: '4px',
                                }}
                            >
                                🔍 SCOUTING
                            </div>
                        )}
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
                        {!isScoutingMode &&
                            (baseRunners.first || baseRunners.second || baseRunners.third) &&
                            game.status === 'in_progress' && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => {
                                            setRunnerEventDefaultTab('advance');
                                            setShowRunnerEventModal(true);
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            background: theme.colors.green[50],
                                            color: theme.colors.green[700],
                                            border: `1px solid ${theme.colors.green[200]}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        SB / WP / PB / BLK
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRunnerEventDefaultTab('out');
                                            setShowRunnerEventModal(true);
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            background: theme.colors.red[50],
                                            color: theme.colors.red[700],
                                            border: `1px solid ${theme.colors.red[200]}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Runner Out
                                    </button>
                                </div>
                            )}
                    </GameInfo>
                    <TeamInfo>
                        <TeamName>
                            {isScoutingMode
                                ? game.scouting_home_team || 'Home Team'
                                : game.is_home_game === false
                                  ? game.opponent_name || 'Home Team'
                                  : game.home_team_name || 'Your Team'}
                        </TeamName>
                        <Score>{game.home_score || 0}</Score>
                        {isScoutingMode && (
                            <div style={{ fontSize: '10px', color: theme.colors.gray[500], marginTop: '2px' }}>
                                {scoutingPitchingSide === 'home' ? '🏟 PITCHING' : '⚾ BATTING'}
                            </div>
                        )}
                    </TeamInfo>
                </GameHeader>

                <PlayersRow>
                    <PlayerDisplay>
                        <PlayerInfo>
                            <PlayerLabel>
                                {isScoutingMode
                                    ? `Pitcher (${scoutingPitchingSide === 'home' ? game.scouting_home_team || 'Home' : game.opponent_name || 'Away'})`
                                    : 'Pitcher'}
                            </PlayerLabel>
                            {isScoutingMode || gameMode === 'opp_pitcher' ? (
                                currentOpposingPitcher ? (
                                    <PlayerName>{currentOpposingPitcher.pitcher_name}</PlayerName>
                                ) : (
                                    <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                                )
                            ) : currentPitcher ? (
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
                        {!isScoutingMode && gameMode !== 'opp_pitcher' && (
                            <ChangeButton onClick={() => setShowPitcherSelector(true)}>
                                {currentPitcher ? 'Change' : 'Select'}
                            </ChangeButton>
                        )}
                    </PlayerDisplay>

                    {!isScoutingMode && gameMode === 'opp_pitcher' ? (
                        <PlayerDisplay>
                            <PlayerInfo>
                                <PlayerLabel>Our Batter</PlayerLabel>
                                {currentMyBatter?.player ? (
                                    <PlayerName>
                                        {currentMyBatter.player.jersey_number ? `#${currentMyBatter.player.jersey_number} ` : ''}
                                        {currentMyBatter.player.first_name} {currentMyBatter.player.last_name}
                                    </PlayerName>
                                ) : (
                                    <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                                )}
                            </PlayerInfo>
                            <ChangeButton
                                onClick={() => {
                                    /* inline select handled via dropdown below */
                                }}
                            >
                                <select
                                    value={currentMyBatter?.id ?? ''}
                                    onChange={(e) => {
                                        const found = myTeamLineup.find((p) => p.id === e.target.value);
                                        if (found) setCurrentMyBatter(found);
                                    }}
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    <option value="">Select batter</option>
                                    {myTeamLineup
                                        .sort((a, b) => a.batting_order - b.batting_order)
                                        .map((p) => (
                                            <option key={p.id} value={p.id}>
                                                #{p.batting_order}{' '}
                                                {p.player
                                                    ? `${p.player.first_name} ${p.player.last_name}`
                                                    : `Player ${p.batting_order}`}
                                            </option>
                                        ))}
                                </select>
                            </ChangeButton>
                        </PlayerDisplay>
                    ) : (
                        <PlayerDisplay>
                            <PlayerInfo>
                                <PlayerLabel>
                                    {isScoutingMode
                                        ? `Batter (${scoutingBattingSide === 'away' ? game.opponent_name || 'Away' : game.scouting_home_team || 'Home'}) #${currentBattingOrder}`
                                        : `Batter (#${currentBattingOrder})`}
                                </PlayerLabel>
                                {currentBatter ? (
                                    <PlayerName>{currentBatter.player_name}</PlayerName>
                                ) : (
                                    <PlayerName style={{ color: theme.colors.gray[400] }}>Not selected</PlayerName>
                                )}
                            </PlayerInfo>
                            <ChangeButton onClick={() => setShowBatterSelector(true)}>
                                {currentBatter ? 'Change' : 'Select'}
                            </ChangeButton>
                        </PlayerDisplay>
                    )}
                </PlayersRow>

                {needsSetup && !currentAtBat && (
                    <SetupPrompt>
                        <SetupText>
                            {isScoutingMode
                                ? !currentOpposingPitcher && !currentBatter
                                    ? 'Select the pitcher and batter to start scouting.'
                                    : !currentOpposingPitcher
                                      ? 'Select the pitcher to continue.'
                                      : 'Select the batter to continue.'
                                : !currentPitcher && gameMode === 'opp_pitcher'
                                  ? 'Select the opposing pitcher and your batter to start tracking.'
                                  : !currentPitcher && !currentBatter
                                    ? 'Select your pitcher and the opponent batter to start tracking pitches.'
                                    : !currentPitcher
                                      ? 'Select your pitcher to continue.'
                                      : 'Select the opponent batter to continue.'}
                        </SetupText>
                        {isScoutingMode && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/lineup`)}>Setup Lineups</SetupButton>
                        )}
                        {!isScoutingMode && !currentBatter && gameMode !== 'opp_pitcher' && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/lineup`)}>Setup Opponent Lineup</SetupButton>
                        )}
                        {!isScoutingMode && game?.charting_mode !== 'our_pitcher' && myTeamLineup.length === 0 && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/my-lineup?from=live`)}>
                                Setup My Team Lineup
                            </SetupButton>
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

                        <PitchTypeSelector>
                            <PitchTypeSelectorTitle>Step 1: Select Pitch Type</PitchTypeSelectorTitle>
                            <PitchTypeGrid>
                                {availablePitchTypes.map(({ value, label }) => (
                                    <PitchTypeButton key={value} active={pitchType === value} onClick={() => setPitchType(value)}>
                                        {label}
                                    </PitchTypeButton>
                                ))}
                            </PitchTypeGrid>

                            {/* Send Call button — visible when pitch calling is enabled */}
                            {pitchCallEnabled && (
                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={actions.handleSendCall}
                                        disabled={!targetZone}
                                        style={{
                                            flex: 1,
                                            padding: '10px 16px',
                                            background: targetZone
                                                ? activeCallId
                                                    ? theme.colors.green[600]
                                                    : theme.colors.primary[600]
                                                : theme.colors.gray[200],
                                            color: targetZone ? 'white' : theme.colors.gray[400],
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            cursor: targetZone ? 'pointer' : 'not-allowed',
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        {activeCallId ? '✓ Call Sent' : `📡 Send Call${targetZone ? '' : ' (set target first)'}`}
                                    </button>
                                </div>
                            )}
                        </PitchTypeSelector>

                        <StrikeZoneRow>
                            <StrikeZoneContainer>
                                {!isScoutingMode && (
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
                                )}
                                <StrikeZone
                                    onLocationSelect={actions.handleLocationSelect}
                                    onTargetZoneSelect={actions.handleTargetZoneSelect}
                                    onTargetClear={actions.handleTargetClear}
                                    targetZone={targetZone}
                                    previousPitches={pitches}
                                    heatZones={heatZones}
                                    showHeatZones={showHeatZones}
                                    batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                                    pitcherThrows={
                                        (isScoutingMode || gameMode === 'opp_pitcher'
                                            ? currentOpposingPitcher?.throws
                                            : currentPitcher?.player?.throws) as 'R' | 'L' | undefined
                                    }
                                />
                            </StrikeZoneContainer>

                            <PitchForm>
                                {showVelocity && (
                                    <FormGroup>
                                        <Label>Step 3: Velocity (mph)</Label>
                                        <Input
                                            type="number"
                                            value={velocity}
                                            onChange={(e) => setVelocity(e.target.value)}
                                            placeholder="85"
                                            min="0"
                                            max="120"
                                        />
                                    </FormGroup>
                                )}

                                <FormGroup>
                                    <Label>{showVelocity ? 'Step 4' : 'Step 3'}: Result</Label>
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
                                            active={pitchResult === 'hit_by_pitch'}
                                            onClick={() => setPitchResult('hit_by_pitch')}
                                            color={theme.colors.orange[500]}
                                        >
                                            HBP
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

                                <LogRow>
                                    <LogButton onClick={actions.handleLogPitch} disabled={!pitchLocation}>
                                        Log Pitch
                                    </LogButton>
                                    {pitches.length > 0 && (
                                        <UndoButton onClick={() => setShowUndoPitch(true)} type="button">
                                            ↶ Undo
                                        </UndoButton>
                                    )}
                                </LogRow>

                                {pitchResult === 'in_play' && (
                                    <OpenDiamondButton onClick={() => setShowDiamondModal(true)}>
                                        <span>&#9918;</span> Record Hit Location & Result
                                    </OpenDiamondButton>
                                )}
                            </PitchForm>
                        </StrikeZoneRow>
                    </>
                ) : shouldSkipHalf ? (
                    <NoAtBatContainer>
                        <NoAtBatText>
                            {scoutingFocus === 'home' ? game.scouting_home_team || 'Home' : game.opponent_name || 'Away'} team
                            batting — not charting this half.
                        </NoAtBatText>
                        <StartAtBatButton onClick={actions.handleSkipHalf}>Skip to Next Half →</StartAtBatButton>
                    </NoAtBatContainer>
                ) : (
                    <NoAtBatContainer>
                        <NoAtBatText>No active at-bat</NoAtBatText>
                        <StartAtBatButton onClick={actions.handleStartAtBat} disabled={needsSetup}>
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
                    currentInning={game?.current_inning ?? 1}
                    onBatterSelected={actions.handleBatterSelected}
                    onLineupChanged={state.refreshOpponentLineup}
                    onClose={() => setShowBatterSelector(false)}
                    teamSide={isScoutingMode ? (scoutingBattingSide as 'home' | 'away') : undefined}
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
                    showRunsInput={game?.scouting_focus === 'home' || game?.scouting_focus === 'away'}
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

            {showDoublePlayModal && (
                <DoublePlayModal
                    isOpen={showDoublePlayModal}
                    onClose={() => setShowDoublePlayModal(false)}
                    runners={baseRunners}
                    currentOuts={currentOuts}
                    onConfirm={actions.handleDoublePlayConfirm}
                />
            )}

            {showRunnerEventModal && (
                <RunnerEventModal
                    isOpen={showRunnerEventModal}
                    onClose={() => setShowRunnerEventModal(false)}
                    runners={baseRunners}
                    currentOuts={currentOuts}
                    defaultTab={runnerEventDefaultTab}
                    onRecordAdvancement={actions.handleRecordAdvancement}
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

            <UndoPitchModal
                isOpen={showUndoPitch}
                pitch={pitches.length > 0 ? pitches[pitches.length - 1] : null}
                onCancel={() => setShowUndoPitch(false)}
                onConfirm={async () => {
                    setShowUndoPitch(false);
                    await actions.handleUndoLastPitch();
                }}
            />

            {showDroppedThirdModal && (
                <DroppedThirdOverlay onClick={() => setShowDroppedThirdModal(false)}>
                    <DroppedThirdDialog onClick={(e) => e.stopPropagation()}>
                        <DroppedThirdTitle>Third Strike</DroppedThirdTitle>
                        <DroppedThirdMessage>Was the third strike dropped?</DroppedThirdMessage>
                        <DroppedThirdButtons>
                            <DroppedThirdBtn
                                variant="yes"
                                onClick={() => {
                                    setShowDroppedThirdModal(false);
                                    actions.handleDroppedThird(true);
                                }}
                            >
                                Yes
                            </DroppedThirdBtn>
                            <DroppedThirdBtn
                                variant="no"
                                onClick={() => {
                                    setShowDroppedThirdModal(false);
                                    actions.handleDroppedThird(false);
                                }}
                            >
                                No
                            </DroppedThirdBtn>
                        </DroppedThirdButtons>
                    </DroppedThirdDialog>
                </DroppedThirdOverlay>
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
