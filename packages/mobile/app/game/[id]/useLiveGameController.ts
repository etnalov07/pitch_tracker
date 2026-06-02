import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';
import {
    ABBREV_TO_PITCH_TYPE,
    GameMode,
    GamePitcherWithPlayer,
    HeatZoneData,
    OpponentLineupPlayer,
    PITCH_CALL_ZONE_COORDS,
    Pitch,
    PitchCall,
    PitchCallAbbrev,
    PitchCallZone,
    PitcherEffectiveness,
    PitchResult,
    PitchType,
    Player,
    RunnerBase,
    deriveGameMode,
} from '@pitch-tracker/shared';
import { analyticsApi } from '../../../src/state/analytics/api/analyticsApi';

import { useToast } from '../../../src/hooks/useToast';
import { useConfirm } from '../../../src/hooks/useConfirm';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { useOfflineActions } from '../../../src/hooks/useOfflineActions';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import { useStalkerRadar } from '../../../src/hooks/useStalkerRadar';
import { RADAR_FEATURE_ENABLED } from '../../../src/utils/stalkerRadar/stalkerRadarService';
import { getZoneCoords, getEffectiveSide } from '../../../src/components/live/StrikeZone/strikeZoneCoords';
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
    const pendingCount = useAppSelector((state) => state.offline.pendingCount);

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
    // Which base's contextual action menu is open (tap a runner pip in
    // BaseRunnerDiamond -> small dialog with Advance/Out buttons). null = closed.
    const [runnerActionBase, setRunnerActionBase] = useState<RunnerBase | null>(null);
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
    // Scrimmage: practice game, no auto-end on 3 outs, score hidden, coach
    // manually ends each half via the dedicated button. Treated as 'our_pitcher'
    // for everything else (gameMode derives 'our_pitcher' because the game was
    // created with is_home_game=true + we always sit in inning_half='top').
    const isScrimmageMode = game?.charting_mode === 'scrimmage';
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

    // Effective batter side for strike-zone mirroring (same inputs the StrikeZone
    // uses) — needed so the pitch_call location pre-fill below mirrors for RHH.
    const prefillBatterSide =
        !isScoutingMode && gameMode === 'opp_pitcher'
            ? (currentMyBatter?.player?.bats as 'R' | 'L' | 'S' | undefined)
            : (currentBatter?.bats as 'R' | 'L' | 'S' | undefined);
    const prefillPitcherThrows =
        isScoutingMode || gameMode === 'opp_pitcher'
            ? (currentOpposingPitcher?.throws as 'R' | 'L' | undefined)
            : (currentPitcher?.player?.throws as 'R' | 'L' | undefined);

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
                // Pre-fill location to the zone center so the receiver only needs to pick a
                // result → Log Pitch. Must mirror for handedness exactly like the StrikeZone
                // render — using raw canonical coords lands RHH dots on the wrong side of the
                // plate (same class as 4db186c). See strikeZoneCoords.getZoneCoords.
                const zc = getZoneCoords(zone, getEffectiveSide(prefillBatterSide, prefillPitcherThrows));
                setPitchLocation({ x: zc.x, y: zc.y });
            }
        },
        // UX-PC-09: a catcher device POST'd /pitch-calls/:id/transmitted; flip the
        // local activeCall's bt_transmitted so the active-call badge can light a
        // ✓ Received pill. No-op if this device isn't the sender of that call.
        pitch_call_transmitted: (payload) => {
            const callId = payload.id as string | undefined;
            if (!callId) return;
            setActiveCall((prev) => (prev && prev.id === callId ? { ...prev, bt_transmitted: true } : prev));
        },
    });

    // Effectiveness — feeds the pitch-type chip tint + strike-zone heat overlay.
    // Scoped to (current pitcher × current batter handedness × career window).
    const effPitcherId = isScoutingMode || gameMode === 'opp_pitcher' ? currentOpposingPitcher?.id : currentPitcher?.player_id;
    const effBatterHand: 'L' | 'R' | null =
        gameMode === 'opp_pitcher'
            ? currentMyBatter?.player?.bats === 'L' || currentMyBatter?.player?.bats === 'R'
                ? (currentMyBatter.player.bats as 'L' | 'R')
                : null
            : currentBatter?.bats === 'L' || currentBatter?.bats === 'R'
              ? (currentBatter.bats as 'L' | 'R')
              : null;
    const [effectiveness, setEffectiveness] = useState<PitcherEffectiveness | null>(null);
    useEffect(() => {
        if (!effPitcherId || !effBatterHand) {
            setEffectiveness(null);
            return;
        }
        let cancelled = false;
        analyticsApi
            .getPitcherEffectiveness(effPitcherId, effBatterHand, 'career')
            .then((res) => {
                if (!cancelled) setEffectiveness(res);
            })
            .catch(() => {
                if (!cancelled) setEffectiveness(null);
            });
        return () => {
            cancelled = true;
        };
    }, [effPitcherId, effBatterHand]);

    // Sample-size gate (n ≥ 15). Color scale matches web:
    //   ≥70% green · ≥60% amber · 50–60% slate · <50% red.
    const effectivenessTints: Partial<Record<PitchType, string>> = {};
    if (effectiveness?.has_data) {
        for (const pt of effectiveness.pitch_types) {
            if (pt.n < 15) continue;
            let tint: string;
            if (pt.strike_pct >= 70) tint = 'rgba(34, 197, 94, 0.22)';
            else if (pt.strike_pct >= 60) tint = 'rgba(245, 158, 11, 0.22)';
            else if (pt.strike_pct < 50) tint = 'rgba(239, 68, 68, 0.20)';
            else tint = 'rgba(148, 163, 184, 0.18)';
            effectivenessTints[pt.pitch_type as PitchType] = tint;
        }
    }

    // Heat-zone overlay for the *selected* pitch type: per-zone strike%.
    let effectivenessHeatZones: HeatZoneData[] | undefined;
    if (effectiveness?.has_data && selectedPitchType) {
        const row = effectiveness.pitch_types.find((p) => p.pitch_type === selectedPitchType);
        if (row && row.n >= 15) {
            effectivenessHeatZones = row.by_zone.map((z) => ({
                zone_id: z.zone,
                total_pitches: z.n,
                strikes: Math.round((z.strike_pct * z.n) / 100),
                strike_percentage: z.strike_pct,
            }));
        }
    }

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
        pendingCount,
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
        radarEnabled: RADAR_FEATURE_ENABLED && radarEnabled,

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

        // Pitch effectiveness (career, current pitcher × batter handedness)
        effectivenessTints,
        effectivenessHeatZones,

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
        runnerActionBase,
        setRunnerActionBase,
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
        isScrimmageMode,
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
