import { ABBREV_TO_PITCH_TYPE, PitchCallZone, PitchType } from '@pitch-tracker/shared';
import React from 'react';
import BatterSelector from '../../components/game/BatterSelector';
import PitcherSelector from '../../components/game/PitcherSelector';
import BaseRunnerDisplay from '../../components/live/BaseRunnerDisplay';
import BatterHistory from '../../components/live/BatterHistory';
import CountBreakdownPanel from '../../components/live/CountBreakdownPanel';
import EditResultModal from '../../components/live/EditResultModal';
import HitterTendenciesPanel from '../../components/live/HitterTendenciesPanel';
import OpposingPitcherPanel from '../../components/live/OpposingPitcherPanel';
import PitcherStats from '../../components/live/PitcherStats';
import PitcherTendenciesPanel from '../../components/live/PitcherTendenciesPanel';
import StrikeZone from '../../components/live/StrikeZone';
import BatterBreakdownModal from '../../components/liveGame/BatterBreakdownModal';
import { useGameWebSocket } from '../../hooks/useGameWebSocket';
import { myTeamLineupService } from '../../services/myTeamLineupService';
import { opposingPitcherService } from '../../services/opposingPitcherService';
import { theme } from '../../styles/theme';
import DiamondModal from './DiamondModal';
import DoublePlayModal from './DoublePlayModal';
import InningChangeModal from './InningChangeModal';
import MyBatterSubModal from './MyBatterSubModal';
import PitcherStatsModal from './PitcherStatsModal';
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
    SettingsAnchor,
    SettingsPanel,
    SettingsPanelTitle,
    SettingsRow,
    SettingsCheckbox,
    SettingsRowLabel,
    SettingsRowSub,
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
    const [showBreakdown, setShowBreakdown] = React.useState(false);
    const [showMyBatterSub, setShowMyBatterSub] = React.useState(false);

    const {
        gameId,
        navigate,
        game,
        currentAtBat,
        pitches,
        loading,
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
        showPitcherStatsModal,
        setShowPitcherStatsModal,
        hitType,
        setHitType,
        hitLocation,
        setHitLocation,
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
        chooseRole,
        setStatsRefreshTrigger,
        myTeamLineup,
        setMyTeamLineup,
        teamRosterPlayers,
        opponentLineup,
        currentMyBatter,
        setCurrentMyBatter,
        settings,
        updateSetting,
        activeCallId,
        setTargetZone,
        setActiveCallId,
        editResultPitch,
        showEditResultModal,
        setShowEditResultModal,
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
                        <RoleButton onClick={() => chooseRole('charter')}>Charter</RoleButton>
                        <RoleButton onClick={() => chooseRole('viewer')}>Viewer</RoleButton>
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

    // Lineup-setup CTAs are visible pre-game (status === 'scheduled') until the user starts
    // the game, and also during the in-game select prompt when a lineup is still empty.
    const showOpponentLineupCTA = !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && opponentLineup.length === 0;
    const showMyLineupCTA = !isScoutingMode && game?.charting_mode !== 'our_pitcher' && myTeamLineup.length === 0;
    const showSetupSelectPrompt = needsSetup && !currentAtBat;
    const showPreGameLineupCTAs = game?.status === 'scheduled' && (showOpponentLineupCTA || showMyLineupCTA);

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
                        <SwapButton onClick={actions.handleToggleHomeAway} title="Swap home/away">
                            ⇄ Home/Away
                        </SwapButton>
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
                        {gameId && (
                            <SwapButton
                                onClick={() => setShowBreakdown(true)}
                                title="See how the current batter was attacked earlier this game"
                            >
                                🪧 Batter Breakdown
                            </SwapButton>
                        )}
                        {gameId && currentBatter && (
                            <SwapButton
                                onClick={() => setShowHitterTendencies(true)}
                                title="Scouting report & tendencies for the current hitter"
                            >
                                🎯 Hitter
                            </SwapButton>
                        )}
                        {gameId && currentPitcher && !isScoutingMode && gameMode !== 'opp_pitcher' && (
                            <SwapButton
                                onClick={() => setShowPitcherTendencies(true)}
                                title="Pitch mix, zone tendencies, and suggested sequence for the current pitcher"
                            >
                                📊 Pitcher
                            </SwapButton>
                        )}
                        {/* Settings gear — opens a small panel to toggle velocity + pitch calls */}
                        <SettingsAnchor>
                            <SwapButton title="Settings" onClick={() => setShowSettingsPanel((v) => !v)}>
                                ⚙ Settings
                            </SwapButton>
                            {showSettingsPanel && (
                                <SettingsPanel>
                                    <SettingsPanelTitle>Chart Settings</SettingsPanelTitle>
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
                                        <SettingsRow key={key}>
                                            <SettingsCheckbox
                                                type="checkbox"
                                                checked={settings[key]}
                                                onChange={(e) => updateSetting(key, e.target.checked)}
                                            />
                                            <div>
                                                <SettingsRowLabel>{label}</SettingsRowLabel>
                                                <SettingsRowSub>{sub}</SettingsRowSub>
                                            </div>
                                        </SettingsRow>
                                    ))}
                                </SettingsPanel>
                            )}
                        </SettingsAnchor>
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
                        {/* Left = away_score. Per the client scoring convention, opponent runs always
                            land in away_score regardless of is_home_game — this column is always the
                            opponent outside of scouting. */}
                        <TeamName>{isScoutingMode ? game.opponent_name || 'Away Team' : game.opponent_name || 'Opponent'}</TeamName>
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
                                        Runner Adv
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
                        {/* Right = home_score. Per the client scoring convention, the user's runs always
                            land in home_score regardless of is_home_game — this column is always the
                            user's team outside of scouting. */}
                        <TeamName>
                            {isScoutingMode ? game.scouting_home_team || 'Home Team' : game.home_team_name || 'Your Team'}
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
                            <>
                                {currentPitcher && (
                                    <ChangeButton onClick={() => setShowPitcherStatsModal(true)}>Stats</ChangeButton>
                                )}
                                <ChangeButton onClick={() => setShowPitcherSelector(true)}>
                                    {currentPitcher ? 'Change' : 'Select'}
                                </ChangeButton>
                            </>
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
                                        .filter((p) => !p.replaced_by_id)
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
                            {myTeamLineup.length > 0 && <ChangeButton onClick={() => setShowMyBatterSub(true)}>Sub</ChangeButton>}
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

                {(showSetupSelectPrompt || showPreGameLineupCTAs) && (
                    <SetupPrompt>
                        {showSetupSelectPrompt && (
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
                        )}
                        {isScoutingMode && showSetupSelectPrompt && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/lineup`)}>Setup Lineups</SetupButton>
                        )}
                        {showOpponentLineupCTA && (
                            <SetupButton onClick={() => navigate(`/game/${gameId}/lineup`)}>Setup Opponent Lineup</SetupButton>
                        )}
                        {showMyLineupCTA && (
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
                                <StrikeZone
                                    onLocationSelect={actions.handleLocationSelect}
                                    onTargetZoneSelect={actions.handleTargetZoneSelect}
                                    onTargetClear={actions.handleTargetClear}
                                    targetZone={targetZone}
                                    previousPitches={pitches}
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
                                            onClick={() => {
                                                setPitchResult('ball');
                                                actions.handleLogPitch('ball');
                                            }}
                                            color={theme.colors.gray[400]}
                                        >
                                            Ball
                                        </ResultButton>
                                        <ResultButton
                                            active={pitchResult === 'called_strike'}
                                            onClick={() => {
                                                setPitchResult('called_strike');
                                                actions.handleLogPitch('called_strike');
                                            }}
                                            color={theme.colors.green[500]}
                                        >
                                            Called Strike
                                        </ResultButton>
                                        <ResultButton
                                            active={pitchResult === 'swinging_strike'}
                                            onClick={() => {
                                                setPitchResult('swinging_strike');
                                                actions.handleLogPitch('swinging_strike');
                                            }}
                                            color={theme.colors.red[500]}
                                        >
                                            Swinging Strike
                                        </ResultButton>
                                        <ResultButton
                                            active={pitchResult === 'foul'}
                                            onClick={() => {
                                                setPitchResult('foul');
                                                actions.handleLogPitch('foul');
                                            }}
                                            color={theme.colors.yellow[500]}
                                        >
                                            Foul
                                        </ResultButton>
                                        <ResultButton
                                            active={pitchResult === 'hit_by_pitch'}
                                            onClick={() => {
                                                setPitchResult('hit_by_pitch');
                                                actions.handleLogPitch('hit_by_pitch');
                                            }}
                                            color={theme.colors.orange[500]}
                                        >
                                            HBP
                                        </ResultButton>
                                        <ResultButton
                                            active={pitchResult === 'in_play'}
                                            onClick={() => {
                                                setPitchResult('in_play');
                                                actions.handleLogPitch('in_play');
                                            }}
                                            color={theme.accents.green}
                                        >
                                            In Play
                                        </ResultButton>
                                    </ResultButtons>
                                </FormGroup>

                                {pitches.length > 0 && (
                                    <LogRow>
                                        <UndoButton onClick={() => setShowUndoPitch(true)} type="button">
                                            ↶ Undo
                                        </UndoButton>
                                    </LogRow>
                                )}

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

            {showMyBatterSub && (
                <MyBatterSubModal
                    lineup={myTeamLineup}
                    rosterPlayers={teamRosterPlayers}
                    currentInningNumber={game?.current_inning}
                    initialBatterId={currentMyBatter?.id}
                    onClose={() => setShowMyBatterSub(false)}
                    onSubstituted={async () => {
                        if (!gameId) return;
                        const updated = await myTeamLineupService.getByGame(gameId);
                        setMyTeamLineup(updated);
                        // If the current batter was the one replaced, point at the new sub in that slot.
                        if (currentMyBatter) {
                            const stillActive = updated.find((p) => p.id === currentMyBatter.id && !p.replaced_by_id);
                            if (!stillActive) {
                                const replacement = updated.find(
                                    (p) => p.batting_order === currentMyBatter.batting_order && !p.replaced_by_id
                                );
                                if (replacement) setCurrentMyBatter(replacement);
                            }
                        }
                    }}
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

            {showPitcherStatsModal && currentPitcher && (
                <PitcherStatsModal
                    pitcherId={currentPitcher.player_id}
                    gameId={gameId || ''}
                    pitcherName={pitcherName}
                    refreshTrigger={statsRefreshTrigger}
                    onClose={() => setShowPitcherStatsModal(false)}
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

            {showBreakdown && gameId && (
                <BatterBreakdownModal
                    gameId={gameId}
                    currentBatterId={currentBatter?.id}
                    currentBatterName={currentBatter?.player_name}
                    onClose={() => setShowBreakdown(false)}
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

            {showEditResultModal && (
                <EditResultModal
                    currentResult={editResultPitch?.result}
                    onCancel={() => setShowEditResultModal(false)}
                    onSelect={actions.handleEditLastPitchResult}
                />
            )}
        </Container>
    );
};

export default LiveGame;
