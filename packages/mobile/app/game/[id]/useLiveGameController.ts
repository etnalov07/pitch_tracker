import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import {
    ABBREV_TO_PITCH_TYPE,
    GameMode,
    GamePitcherWithPlayer,
    OpponentLineupPlayer,
    PITCH_CALL_ZONE_COORDS,
    Pitch,
    PitchCall,
    PitchCallAbbrev,
    PitchCallZone,
    PitchResult,
    PitchType,
    Player,
    deriveGameMode,
} from '@pitch-tracker/shared';

import { _toastDiagnostics, useToast } from '../../../src/hooks/useToast';
import { useConfirm } from '../../../src/hooks/useConfirm';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { useOfflineActions } from '../../../src/hooks/useOfflineActions';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import { useStalkerRadar } from '../../../src/hooks/useStalkerRadar';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { activateBTAudio, forceDeactivateBTAudio } from '../../../src/utils/pitchCallAudio';
import { isPassthroughActive, stopPassthrough } from '../../../src/utils/walkieTalkie';
import {
    fetchBaseRunners,
    fetchCurrentGameState,
    fetchCurrentInning,
    fetchGameById,
    fetchGamePitchers,
    fetchMyTeamLineup,
    fetchOpponentLineup,
    fetchOpposingPitchers,
    fetchTeamPitcherRoster,
    fetchTeamPlayers,
    setCurrentAtBat,
    setCurrentGameRole,
    setCurrentMyBatter,
    useAppDispatch,
    useAppSelector,
} from '../../../src/state';
import type { CompletedAtBatEntry } from '../../../src/components/live';

/**
 * Live game controller — extracted from `app/game/[id]/live.tsx` as part of
 * UX audit item C continuation. Owns:
 *   - all local UI state (~30 useState pairs)
 *   - Redux selector reads (games, settings, teams)
 *   - data-loading useEffects (game state, pitchers, lineups, etc.)
 *   - derived values (game mode, count, derived display strings, etc.)
 *   - WebSocket subscription
 *
 * Returns a single flat object. Handlers stay in the component (they reference
 * destructured values via closure — moving them too would have ballooned this
 * batch). The split mirrors web's useLiveGameState + useLiveGameActions pattern.
 */
export function useLiveGameController() {
    // -------------------------------------------------------------------------
    // Framework hooks
    // -------------------------------------------------------------------------
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    // DIAGNOSTIC — temp breadcrumb. Logs before useToast() so we can see in
    // console (when reachable) that the controller is being entered, and what
    // the toast module thinks its state is right before the call. Remove with
    // the rest of the toast-debug instrumentation once root-caused.
    console.log(`[useLiveGameController] enter; ${_toastDiagnostics()}`);
    const toast = useToast();
    const confirm = useConfirm();
    const { isTablet, isLandscape } = useDeviceType();
    const { isOnline, logPitchOffline } = useOfflineActions();

    // -------------------------------------------------------------------------
    // Redux state
    // -------------------------------------------------------------------------
    const {
        currentGameState,
        selectedGame,
        currentAtBat,
        currentInning,
        gamePitchers,
        opponentLineup,
        myTeamLineup,
        currentMyBatter,
        pitches,
        baseRunners,
        opposingPitchers,
        currentOpposingPitcher,
        currentGameRole,
        gameStateLoading,
        loading,
        error,
    } = useAppSelector((state) => state.games);
    const teamPlayers = useAppSelector((state) => state.teams.players) || [];
    const { pitchCallingEnabled, velocityEnabled, radarEnabled } = useAppSelector((state) => state.settings);

    // -------------------------------------------------------------------------
    // Local state — keep in same order/groups as the original live.tsx so the
    // diff stays reviewable.
    // -------------------------------------------------------------------------

    // Historical pitches for completed-game read-only view
    const [allGamePitches, setAllGamePitches] = useState<Pitch[]>([]);
    const [pitchTypeFilter, setPitchTypeFilter] = useState<string>('all');
    const [showBreakdown, setShowBreakdown] = useState(false);

    // Local state for pitch entry
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [selectedResult, setSelectedResult] = useState<PitchResult | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetZone, setTargetZone] = useState<PitchCallZone | null>(null);
    const [isLogging, setIsLogging] = useState(false);
    const isLoggingRef = useRef(false);

    // Pitcher/Batter selection state
    const [currentPitcher, setCurrentPitcher] = useState<GamePitcherWithPlayer | null>(null);
    const [currentBatter, setCurrentBatter] = useState<OpponentLineupPlayer | null>(null);
    const [pitcherModalVisible, setPitcherModalVisible] = useState(false);
    const [batterModalVisible, setBatterModalVisible] = useState(false);
    const [pitcherPitchTypes, setPitcherPitchTypes] = useState<PitchType[]>([]);

    // At-bat tracking state
    const [currentOuts, setCurrentOuts] = useState(0);
    const [currentBattingOrder, setCurrentBattingOrder] = useState(1);

    // In-play modal state
    const [showInPlayModal, setShowInPlayModal] = useState(false);

    // Inning change modal state
    const [showInningChange, setShowInningChange] = useState(false);
    const [teamRunsScored, setTeamRunsScored] = useState('0');
    const [inningChangeInfo, setInningChangeInfo] = useState<{ inning: number; half: string } | null>(null);
    const [inningEndedByBaserunnerOut, setInningEndedByBaserunnerOut] = useState(false);

    // Base runner modals state
    const [showRunnerEventModal, setShowRunnerEventModal] = useState(false);
    const [runnerEventDefaultTab, setRunnerEventDefaultTab] = useState<'advance' | 'out'>('advance');
    const [showRunnerAdvancementModal, setShowRunnerAdvancementModal] = useState(false);
    const [pendingHitResult, setPendingHitResult] = useState<string | null>(null);
    const [showDoublePlayModal, setShowDoublePlayModal] = useState(false);

    // Team at bat modal state (visitor games)
    const [showTeamAtBat, setShowTeamAtBat] = useState(false);
    const [teamAtBatRuns, setTeamAtBatRuns] = useState('0');

    // Previous at-bats tracking (keyed by opponent_batter_id)
    const [completedAtBatsByBatter, setCompletedAtBatsByBatter] = useState<Record<string, CompletedAtBatEntry[]>>({});
    const [showPreviousAtBats, setShowPreviousAtBats] = useState(false);

    // Pitch call state (integrated from pitch-calling screen)
    const [activeCall, setActiveCall] = useState<PitchCall | null>(null);
    const [sendingCall, setSendingCall] = useState(false);
    const [changingCallId, setChangingCallId] = useState<string | null>(null);

    // Tendencies modal state
    const [showPitcherTendencies, setShowPitcherTendencies] = useState(false);
    const [showHitterTendencies, setShowHitterTendencies] = useState(false);

    // Shake count — number of times SHAKE pressed since last pitch logged
    const [pendingShakeCount, setPendingShakeCount] = useState(0);

    // Velocity state (optional)
    const [velocity, setVelocity] = useState<string>('');

    // Opposing pitcher modal + other modals
    const [showOpposingPitcherModal, setShowOpposingPitcherModal] = useState(false);
    const [myBatterModalVisible, setMyBatterModalVisible] = useState(false);
    const [showCountBreakdownModal, setShowCountBreakdownModal] = useState(false);
    const [showPitcherStatsModal, setShowPitcherStatsModal] = useState(false);
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    // Cumulative pitch count for current pitcher (UX-LG-13). Populated by an effect below.
    const [pitcherGamePitchCount, setPitcherGamePitchCount] = useState<number | undefined>(undefined);

    // Fix Last Pitch — most-recent logged pitch for the snackbar EDIT action (UX-LG-01).
    const [editResultPitch, setEditResultPitch] = useState<{ id: string; result: PitchResult } | null>(null);
    const [editResultModalVisible, setEditResultModalVisible] = useState(false);

    // Walkie-talkie state
    const [walkieTalkieActive, setWalkieTalkieActive] = useState(false);

    // -------------------------------------------------------------------------
    // Stalker radar — auto-fills the velocity field as readings arrive.
    // -------------------------------------------------------------------------
    const radar = useStalkerRadar();
    useEffect(() => {
        if (radar.lastReadingAt != null && radar.lastVelocity != null) {
            setVelocity(String(radar.lastVelocity));
        }
    }, [radar.lastReadingAt, radar.lastVelocity]);

    // -------------------------------------------------------------------------
    // Derived constants
    // -------------------------------------------------------------------------
    const game = currentGameState?.game || selectedGame;
    const gameMode: GameMode = game ? deriveGameMode(game.is_home_game ?? true, game.inning_half) : 'our_pitcher';
    const isScoutingMode = game?.charting_mode === 'scouting';
    // TOP = away bats (home pitches), BOTTOM = home bats (away pitches)
    const scoutingBattingSide = isScoutingMode ? (game?.inning_half === 'top' ? 'away' : 'home') : null;
    const scoutingPitchingSide = isScoutingMode ? (game?.inning_half === 'top' ? 'home' : 'away') : null;
    const scoutingFocus = game?.scouting_focus;
    const shouldSkipHalf =
        isScoutingMode &&
        game?.status === 'in_progress' &&
        scoutingFocus &&
        scoutingFocus !== 'both' &&
        ((scoutingFocus === 'home' && game?.inning_half === 'bottom') || (scoutingFocus === 'away' && game?.inning_half === 'top'));

    const activeBatters = opponentLineup
        .filter((b) => !b.replaced_by_id && (isScoutingMode ? b.team_side === scoutingBattingSide : true))
        .sort((a, b) => a.batting_order - b.batting_order);
    const lineupSize = game?.lineup_size ?? 9;

    // Calculate count from pitches
    const balls = pitches.filter((p) => p.pitch_result === 'ball').length;
    const effectiveStrikes = (() => {
        let s = 0;
        for (const p of pitches) {
            if (p.pitch_result === 'called_strike' || p.pitch_result === 'swinging_strike') s++;
            else if (p.pitch_result === 'foul' && s < 2) s++;
        }
        return s;
    })();
    const strikes = Math.min(effectiveStrikes, 2);

    // Defensive derived values — computed every render. game may be null during
    // loading; downstream consumers guard via existing conditional returns.
    const isReadOnly = game ? game.status !== 'in_progress' : false;
    const filteredGamePitches =
        pitchTypeFilter === 'all' ? allGamePitches : allGamePitches.filter((p) => (p.pitch_type || 'other') === pitchTypeFilter);

    const previousAtBatsForCurrentBatter = currentBatter ? completedAtBatsByBatter[currentBatter.id] || [] : [];
    const hasPreviousAtBats = previousAtBatsForCurrentBatter.length > 0;
    const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
    const isUserBatting = !!game && game.status === 'in_progress' && !game.is_home_game && game.inning_half === 'top';

    const canStartAtBat =
        gameMode === 'opp_pitcher'
            ? !!currentOpposingPitcher && !!currentMyBatter && !currentAtBat
            : !!currentPitcher && !!currentBatter && !currentAtBat;

    const activePitcherDisplay =
        gameMode === 'opp_pitcher'
            ? currentOpposingPitcher
                ? ({
                      first_name: currentOpposingPitcher.pitcher_name.split(' ')[0] ?? currentOpposingPitcher.pitcher_name,
                      last_name: currentOpposingPitcher.pitcher_name.split(' ').slice(1).join(' ') || '',
                  } as Player)
                : null
            : currentPitcher?.player || null;

    const activeBatterDisplay =
        gameMode === 'opp_pitcher' && currentMyBatter?.player
            ? {
                  name: `${currentMyBatter.player.first_name} ${currentMyBatter.player.last_name}`,
                  batting_order: currentMyBatter.batting_order,
              }
            : currentBatter
              ? { name: currentBatter.player_name, batting_order: currentBatter.batting_order }
              : null;

    // -------------------------------------------------------------------------
    // Effects — keep in the same order as live.tsx for diff readability.
    // -------------------------------------------------------------------------

    // Cumulative pitch count for the current pitcher this game (UX-LG-13).
    useEffect(() => {
        if (!id || !currentPitcher?.player_id || isScoutingMode || gameMode === 'opp_pitcher') {
            setPitcherGamePitchCount(undefined);
            return;
        }
        gamesApi
            .getPitcherGameStats(currentPitcher.player_id, id)
            .then((stats) => setPitcherGamePitchCount(stats.total_pitches))
            .catch(() => setPitcherGamePitchCount(undefined));
    }, [id, currentPitcher?.player_id, isScoutingMode, gameMode, statsRefreshTrigger]);

    // Activate Bluetooth audio for pitch calls (only when enabled)
    useEffect(() => {
        if (!pitchCallingEnabled) return;
        activateBTAudio();
        return () => {
            if (isPassthroughActive()) {
                stopPassthrough();
            }
            forceDeactivateBTAudio();
        };
    }, [pitchCallingEnabled]);

    // Load game state on mount
    useEffect(() => {
        if (id) {
            // Always reset role/at-bat/batter so stale state from a previous game doesn't carry over
            dispatch(setCurrentGameRole(null));
            dispatch(setCurrentAtBat(null));
            dispatch(setCurrentMyBatter(null));
            dispatch(fetchCurrentGameState(id))
                .unwrap()
                .catch(() => {
                    dispatch(fetchGameById(id));
                });
            dispatch(fetchCurrentInning(id));
            dispatch(fetchGamePitchers(id));
            dispatch(fetchOpponentLineup(id));
            dispatch(fetchBaseRunners(id));
            dispatch(fetchOpposingPitchers(id));
            gamesApi
                .getGamePitches(id)
                .then(setAllGamePitches)
                .catch(() => setAllGamePitches([]));
        }
    }, [id, dispatch]);

    // Load my team lineup only after game is known and only in non-scouting modes
    useEffect(() => {
        if (id && game?.id === id && game.charting_mode !== 'scouting') {
            dispatch(fetchMyTeamLineup(id));
        }
    }, [dispatch, id, game?.id, game?.charting_mode]);

    useEffect(() => {
        if (game?.id === id && game?.home_team_id && game?.charting_mode !== 'scouting') {
            dispatch(fetchTeamPlayers(game.home_team_id));
            dispatch(fetchTeamPitcherRoster(game.home_team_id));
        }
    }, [game?.id, game?.home_team_id, game?.charting_mode, dispatch, id]);

    useEffect(() => {
        if (gamePitchers.length > 0 && !currentPitcher) {
            const active = gamePitchers.find((p) => !p.inning_exited);
            if (active) setCurrentPitcher(active);
        }
    }, [gamePitchers, currentPitcher]);

    useEffect(() => {
        if (currentPitcher?.player_id) {
            gamesApi
                .getPitcherPitchTypes(currentPitcher.player_id)
                .then((types) => {
                    setPitcherPitchTypes(types as PitchType[]);
                    if (types.length > 0 && selectedPitchType && !types.includes(selectedPitchType)) {
                        setSelectedPitchType(types[0] as PitchType);
                    }
                })
                .catch(() => setPitcherPitchTypes([]));
        } else {
            setPitcherPitchTypes([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPitcher?.player_id]);

    // Auto-show TeamAtBat modal when user's team is batting (visitor games),
    // except when charting_mode is 'both' or 'scouting' — in those modes we chart at-bats directly.
    useEffect(() => {
        if (isUserBatting && !showInningChange && game?.charting_mode !== 'both' && game?.charting_mode !== 'scouting') {
            setShowTeamAtBat(true);
        }
    }, [isUserBatting, game?.current_inning, game?.inning_half, game?.charting_mode, showInningChange]);

    // Must be here (before any conditional returns) to avoid "more hooks than previous render" violation
    useEffect(() => {
        if (currentGameRole === 'viewer' && id) {
            router.replace(`/game/${id}/viewer` as any);
        }
    }, [currentGameRole, id, router]);

    // WebSocket subscription — keeps the screen in sync with the catcher tablet
    // (pitch_call pre-fills selection) and refreshes stats when other devices log.
    useGameWebSocket(id ?? null, {
        pitch_logged: () => setStatsRefreshTrigger((prev) => prev + 1),
        at_bat_ended: () => setStatsRefreshTrigger((prev) => prev + 1),
        inning_changed: () => setStatsRefreshTrigger((prev) => prev + 1),
        runners_updated: () => setStatsRefreshTrigger((prev) => prev + 1),
        pitch_call: (payload) => {
            const abbrev = payload.pitch_type as PitchCallAbbrev;
            const zone = payload.zone as PitchCallZone;
            if (abbrev && ABBREV_TO_PITCH_TYPE[abbrev]) {
                setSelectedPitchType(ABBREV_TO_PITCH_TYPE[abbrev]);
            }
            if (zone && PITCH_CALL_ZONE_COORDS[zone]) {
                setTargetZone(zone);
                // Pre-fill location to zone center so receiver only needs to pick result → Log Pitch
                const zc = PITCH_CALL_ZONE_COORDS[zone];
                setPitchLocation({ x: zc.x, y: zc.y });
            }
        },
    });

    return {
        // Framework
        id,
        router,
        theme,
        dispatch,
        toast,
        confirm,
        isTablet,
        isLandscape,
        isOnline,
        logPitchOffline,

        // Redux selectors
        currentGameState,
        selectedGame,
        currentAtBat,
        currentInning,
        gamePitchers,
        opponentLineup,
        myTeamLineup,
        currentMyBatter,
        pitches,
        baseRunners,
        opposingPitchers,
        currentOpposingPitcher,
        currentGameRole,
        gameStateLoading,
        loading,
        error,
        teamPlayers,
        pitchCallingEnabled,
        velocityEnabled,
        radarEnabled,

        // Local state + setters
        allGamePitches,
        setAllGamePitches,
        pitchTypeFilter,
        setPitchTypeFilter,
        showBreakdown,
        setShowBreakdown,

        selectedPitchType,
        setSelectedPitchType,
        selectedResult,
        setSelectedResult,
        pitchLocation,
        setPitchLocation,
        targetZone,
        setTargetZone,
        isLogging,
        setIsLogging,
        isLoggingRef,

        currentPitcher,
        setCurrentPitcher,
        currentBatter,
        setCurrentBatter,
        pitcherModalVisible,
        setPitcherModalVisible,
        batterModalVisible,
        setBatterModalVisible,
        pitcherPitchTypes,
        setPitcherPitchTypes,

        currentOuts,
        setCurrentOuts,
        currentBattingOrder,
        setCurrentBattingOrder,

        showInPlayModal,
        setShowInPlayModal,

        showInningChange,
        setShowInningChange,
        teamRunsScored,
        setTeamRunsScored,
        inningChangeInfo,
        setInningChangeInfo,
        inningEndedByBaserunnerOut,
        setInningEndedByBaserunnerOut,

        showRunnerEventModal,
        setShowRunnerEventModal,
        runnerEventDefaultTab,
        setRunnerEventDefaultTab,
        showRunnerAdvancementModal,
        setShowRunnerAdvancementModal,
        pendingHitResult,
        setPendingHitResult,
        showDoublePlayModal,
        setShowDoublePlayModal,

        showTeamAtBat,
        setShowTeamAtBat,
        teamAtBatRuns,
        setTeamAtBatRuns,

        completedAtBatsByBatter,
        setCompletedAtBatsByBatter,
        showPreviousAtBats,
        setShowPreviousAtBats,

        activeCall,
        setActiveCall,
        sendingCall,
        setSendingCall,
        changingCallId,
        setChangingCallId,

        showPitcherTendencies,
        setShowPitcherTendencies,
        showHitterTendencies,
        setShowHitterTendencies,

        pendingShakeCount,
        setPendingShakeCount,

        velocity,
        setVelocity,

        showOpposingPitcherModal,
        setShowOpposingPitcherModal,
        myBatterModalVisible,
        setMyBatterModalVisible,
        showCountBreakdownModal,
        setShowCountBreakdownModal,
        showPitcherStatsModal,
        setShowPitcherStatsModal,
        statsRefreshTrigger,
        setStatsRefreshTrigger,

        pitcherGamePitchCount,
        setPitcherGamePitchCount,

        editResultPitch,
        setEditResultPitch,
        editResultModalVisible,
        setEditResultModalVisible,

        walkieTalkieActive,
        setWalkieTalkieActive,

        // Radar
        radar,

        // Derived values
        game,
        gameMode,
        isScoutingMode,
        scoutingBattingSide,
        scoutingPitchingSide,
        scoutingFocus,
        shouldSkipHalf,
        activeBatters,
        lineupSize,
        balls,
        effectiveStrikes,
        strikes,
        isReadOnly,
        filteredGamePitches,
        previousAtBatsForCurrentBatter,
        hasPreviousAtBats,
        hasRunnersOnBase,
        isUserBatting,
        canStartAtBat,
        activePitcherDisplay,
        activeBatterDisplay,
    };
}

export type LiveGameController = ReturnType<typeof useLiveGameController>;
