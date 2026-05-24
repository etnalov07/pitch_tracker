import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TextInput, Pressable, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, IconButton, Portal, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import { useToast } from '../../../src/hooks/useToast';
import { useConfirm } from '../../../src/hooks/useConfirm';
import { colors, semantic } from '../../../src/styles/theme';
import {
    Pitch,
    PitchType,
    PitchResult,
    PitchCall,
    PitchCallAbbrev,
    PitchCallZone,
    PITCH_CALL_ZONE_LABELS,
    PITCH_CALL_ZONE_COORDS,
    PITCH_TYPE_TO_ABBREV,
    ABBREV_TO_PITCH_TYPE,
    Player,
    GamePitcherWithPlayer,
    OpponentLineupPlayer,
    Inning,
    isOutResult,
    getOutsForResult,
    BaseRunners,
    RunnerBase,
    BaserunnerEventType,
    getSuggestedAdvancement,
    clearBases,
    deriveGameMode,
    GameMode,
    ContactType,
    PlayerPosition,
    getNextBatter,
} from '@pitch-tracker/shared';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { pitchCallingApi } from '../../../src/state/pitchCalling/api/pitchCallingApi';
import scoutingReportsApi from '../../../src/state/scouting/api/scoutingReportsApi';
import { BatterBreakdownSheet } from '../../../src/components/batterBreakdown';
import { speakPitchCall, activateBTAudio, forceDeactivateBTAudio } from '../../../src/utils/pitchCallAudio';
import { startPassthrough, stopPassthrough, isPassthroughActive } from '../../../src/utils/walkieTalkie';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { useOfflineActions } from '../../../src/hooks/useOfflineActions';
import {
    useAppDispatch,
    useAppSelector,
    fetchCurrentGameState,
    fetchGameById,
    toggleHomeAway,
    fetchTeamPlayers,
    fetchCurrentInning,
    fetchGamePitchers,
    changePitcher,
    fetchOpponentLineup,
    fetchTeamPitcherRoster,
    createAtBat,
    updateAtBat,
    endAtBat,
    endGame,
    setCurrentAtBat,
    clearPitches,
    updatePitch,
    undoLastPitch,
    setBaseRunners,
    updateBaseRunners,
    recordBaserunnerEvent,
    fetchBaseRunners,
    fetchOpposingPitchers,
    createOpposingPitcher,
    deleteOpposingPitcher,
    setCurrentOpposingPitcher,
    setCurrentGameRole,
    fetchMyTeamLineup,
    setCurrentMyBatter,
} from '../../../src/state';
import { useGameWebSocket } from '../../../src/hooks/useGameWebSocket';
import { useStalkerRadar } from '../../../src/hooks/useStalkerRadar';
import RadarStatusPill from '../../../src/components/radar/RadarStatusPill';
import {
    StrikeZone,
    PITCH_TYPE_COLORS,
    PITCH_TYPE_LABELS,
    PitchTypeGrid,
    ResultButtons,
    GameHeader,
    InPlayModal,
    PitcherSelectorModal,
    BatterSelectorModal,
    MyBatterSelectorModal,
    InningChangeModal,
    TeamAtBatModal,
    RunnerAdvancementModal,
    PreviousAtBatsModal,
    PitcherTendenciesModal,
    HitterTendenciesModal,
    PitcherStatsModal,
    EditResultModal,
} from '../../../src/components/live';
import DoublePlayModal from '../../../src/components/live/DoublePlayModal';
import RunnerEventModal from '../../../src/components/live/RunnerEventModal';
import OpposingPitcherModal from '../../../src/components/live/OpposingPitcherModal';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';
import type { CompletedAtBatEntry } from '../../../src/components/live';
import type { ErrorAdvancement, Throwout } from '../../../src/components/live/RunnerAdvancementModal/RunnerAdvancementModal';
import { SyncStatusBadge, LoadingScreen, ErrorScreen } from '../../../src/components/common';
import { HitLocation } from '../../../src/components/live/InPlayModal';

export default function LiveGameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();
    const { isTablet, isLandscape } = useDeviceType();
    const { isOnline, logPitchOffline } = useOfflineActions();

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
    // Synchronous in-flight guard — blocks a double-tap from logging the pitch twice.
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
    // True when the inning-ending out was recorded by a baserunner (caught stealing,
    // pickoff, thrown_out_advancing). When set, the leadoff batter when this team
    // returns is the on-deck slot — do NOT advance the lineup pointer further.
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

    // Opposing pitcher modal
    const [showOpposingPitcherModal, setShowOpposingPitcherModal] = useState(false);
    const [myBatterModalVisible, setMyBatterModalVisible] = useState(false);
    const [showCountBreakdownModal, setShowCountBreakdownModal] = useState(false);
    const [showPitcherStatsModal, setShowPitcherStatsModal] = useState(false);
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    // Pitch count state — populated by the effect below, after gameMode/isScoutingMode are derived.
    const [pitcherGamePitchCount, setPitcherGamePitchCount] = useState<number | undefined>(undefined);

    // Fix Last Pitch — tracks the most-recent logged pitch so the snackbar EDIT action
    // can open EditResultModal for it (UX-LG-01).
    const [editResultPitch, setEditResultPitch] = useState<{ id: string; result: PitchResult } | null>(null);
    const [editResultModalVisible, setEditResultModalVisible] = useState(false);

    // Settings
    const { pitchCallingEnabled, velocityEnabled, radarEnabled } = useAppSelector((state) => state.settings);

    // Stalker radar — auto-fills the velocity field as readings arrive.
    const radar = useStalkerRadar();
    useEffect(() => {
        if (radar.lastReadingAt != null && radar.lastVelocity != null) {
            setVelocity(String(radar.lastVelocity));
        }
    }, [radar.lastReadingAt, radar.lastVelocity]);

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

    // Cumulative pitch count for the current pitcher this game (per UX-LG-13).
    // Refreshes when the pitcher changes or after each logged pitch (statsRefreshTrigger).
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

    // Walkie-talkie state
    const [walkieTalkieActive, setWalkieTalkieActive] = useState(false);

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

    const activeBatters = opponentLineup
        .filter((b) => !b.replaced_by_id && (isScoutingMode ? b.team_side === scoutingBattingSide : true))
        .sort((a, b) => a.batting_order - b.batting_order);
    const lineupSize = game?.lineup_size ?? 9;

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
    }, [currentPitcher?.player_id]);

    // Auto-show TeamAtBat modal when user's team is batting (visitor games),
    // except when charting_mode is 'both' or 'scouting' — in those modes we chart at-bats directly.
    const isUserBatting = game && game.status === 'in_progress' && !game.is_home_game && game.inning_half === 'top';
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

    const updateScoreForRuns = useCallback(
        async (runsScored: number) => {
            if (!id || runsScored <= 0) return;
            const freshGame = await dispatch(fetchGameById(id)).unwrap();
            if (isScoutingMode) {
                if (scoutingBattingSide === 'away') {
                    await gamesApi.updateScore(id, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
                } else {
                    await gamesApi.updateScore(id, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
                }
            } else if (gameMode === 'opp_pitcher') {
                await gamesApi.updateScore(id, (freshGame.home_score || 0) + runsScored, freshGame.away_score || 0);
            } else {
                await gamesApi.updateScore(id, freshGame.home_score || 0, (freshGame.away_score || 0) + runsScored);
            }
            dispatch(fetchGameById(id));
        },
        [id, gameMode, isScoutingMode, scoutingBattingSide, dispatch]
    );

    // Start at-bat for a specific batter
    const startAtBatForBatter = useCallback(
        async (batter: OpponentLineupPlayer, outs: number, inning: Inning | null): Promise<boolean> => {
            if (!id || !inning) return false;
            if (!isScoutingMode && !currentPitcher) return false;
            try {
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: inning.id,
                        opponent_batter_id: batter.id,
                        pitcher_id: isScoutingMode ? undefined : currentPitcher?.player_id,
                        opposing_pitcher_id: isScoutingMode ? currentOpposingPitcher?.id : undefined,
                        batting_order: batter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: outs,
                    })
                ).unwrap();
                return true;
            } catch {
                console.error('Failed to start at-bat');
                return false;
            }
        },
        [id, currentPitcher, currentOpposingPitcher, isScoutingMode, dispatch]
    );

    // Finds the next active batter after currentOrder using sorted-list position,
    // so gaps in batting order (substitutions, small lineups) never return null.
    const findNextActiveBatter = useCallback(
        (batters: OpponentLineupPlayer[], currentOrder: number): OpponentLineupPlayer | null => {
            const sorted = [...batters].sort((a, b) => a.batting_order - b.batting_order);
            if (sorted.length === 0) return null;
            const idx = sorted.findIndex((b) => b.batting_order === currentOrder);
            return sorted[(idx + 1) % sorted.length] ?? null;
        },
        []
    );

    // Resolves the leadoff batter when this team returns to bat. When the inning
    // ended via a baserunner out, the player at currentOrder leads off (no advance);
    // otherwise advance to the next slot.
    const findInningLeadoffBatter = useCallback(
        (batters: OpponentLineupPlayer[], currentOrder: number, lastOutWasBaserunnerOut: boolean): OpponentLineupPlayer | null => {
            if (lastOutWasBaserunnerOut) {
                const sorted = [...batters].sort((a, b) => a.batting_order - b.batting_order);
                return sorted.find((b) => b.batting_order === currentOrder) ?? null;
            }
            return findNextActiveBatter(batters, currentOrder);
        },
        [findNextActiveBatter]
    );

    const advanceInningWithRuns = useCallback(
        async (runs: number) => {
            if (!id || !game) return;
            try {
                // Fetch fresh game state before computing scores — prevents stale closure
                // from overwriting scores that were already written during the half-inning
                const freshGame = await dispatch(fetchGameById(id)).unwrap();

                const homeScore = freshGame.home_score || 0;
                const awayScore = freshGame.away_score || 0;
                const isHomeGame = freshGame.is_home_game !== false;
                const totalInnings = freshGame.total_innings ?? 7;
                const isLastInningOrLater = freshGame.current_inning >= totalInnings;

                if (isScoutingMode) {
                    // Scouting: credit runs to the team that just batted
                    if (scoutingBattingSide === 'away') {
                        await gamesApi.updateScore(id, homeScore, awayScore + runs);
                    } else {
                        await gamesApi.updateScore(id, homeScore + runs, awayScore);
                    }
                    await gamesApi.advanceInning(id);
                } else {
                    const newAwayScore = awayScore + runs;
                    await gamesApi.updateScore(id, homeScore, newAwayScore);

                    if (isLastInningOrLater) {
                        if (isHomeGame && homeScore > newAwayScore) {
                            await dispatch(endGame({ gameId: id, finalData: { home_score: homeScore, away_score: newAwayScore } }));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.replace(`/game/${id}` as any);
                            return;
                        }
                        if (!isHomeGame && homeScore !== newAwayScore) {
                            await dispatch(endGame({ gameId: id, finalData: { home_score: homeScore, away_score: newAwayScore } }));
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.replace(`/game/${id}` as any);
                            return;
                        }
                    }

                    if (freshGame.is_home_game === false || freshGame.charting_mode === 'both') {
                        await gamesApi.advanceInning(id);
                    } else {
                        await gamesApi.advanceInning(id);
                        await gamesApi.advanceInning(id);
                    }
                }

                dispatch(setBaseRunners(clearBases()));
                const updatedGame = await dispatch(fetchGameById(id)).unwrap();
                const newInning = await gamesApi.getCurrentInning(id);
                setShowInningChange(false);

                if (isScoutingMode) {
                    // Switch batting team and pitcher to the new sides
                    const newBattingSide = updatedGame.inning_half === 'top' ? 'away' : 'home';
                    const newPitchingSide = updatedGame.inning_half === 'top' ? 'home' : 'away';
                    const newBattingLineup = opponentLineup
                        .filter((p) => p.team_side === newBattingSide && !p.replaced_by_id)
                        .sort((a, b) => a.batting_order - b.batting_order);
                    const firstBatter = newBattingLineup.find((p) => p.batting_order === 1) || newBattingLineup[0] || null;
                    if (firstBatter) {
                        setCurrentBattingOrder(firstBatter.batting_order);
                        setCurrentBatter(firstBatter);
                        if (newInning) await startAtBatForBatter(firstBatter, 0, newInning);
                    } else {
                        setCurrentBatter(null);
                    }
                    // Switch to the new pitching team's last pitcher
                    const newPitchingPitchers = opposingPitchers.filter((p) => p.team_side === newPitchingSide);
                    if (newPitchingPitchers.length > 0) {
                        dispatch(setCurrentOpposingPitcher(newPitchingPitchers[newPitchingPitchers.length - 1]));
                    } else {
                        dispatch(setCurrentOpposingPitcher(null));
                    }
                    dispatch(fetchCurrentInning(id));
                } else if (freshGame.is_home_game !== false && freshGame.charting_mode !== 'both') {
                    const firstBatter = findInningLeadoffBatter(activeBatters, currentBattingOrder, inningEndedByBaserunnerOut);
                    if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
                    if (firstBatter && newInning) {
                        setCurrentBatter(firstBatter);
                        await startAtBatForBatter(firstBatter, 0, newInning);
                        dispatch(fetchCurrentInning(id));
                    } else {
                        setCurrentBatter(firstBatter); // keep batter even if newInning is null
                        dispatch(fetchCurrentInning(id));
                    }
                } else {
                    await Promise.all([
                        dispatch(fetchOpposingPitchers(id))
                            .unwrap()
                            .catch(() => null),
                        dispatch(fetchMyTeamLineup(id))
                            .unwrap()
                            .catch(() => null),
                    ]);
                    dispatch(fetchCurrentInning(id));
                }
                setInningEndedByBaserunnerOut(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to advance inning', type: 'error' });
            }
        },
        [
            id,
            game,
            currentBattingOrder,
            activeBatters,
            isScoutingMode,
            scoutingBattingSide,
            opponentLineup,
            opposingPitchers,
            dispatch,
            startAtBatForBatter,
            findInningLeadoffBatter,
            inningEndedByBaserunnerOut,
            router,
            toast,
        ]
    );

    const handleEndAtBat = useCallback(
        async (
            result: string,
            finalPitch?: Partial<Pitch>,
            extra?: { rbi?: number; runs_scored?: number; outs_before_override?: number }
        ) => {
            if (!currentAtBat) return;
            try {
                // Capture before clearing; append finalPitch if provided (covers stale-closure case
                // where the last pitch was just dispatched but Redux state hasn't re-rendered yet)
                const endedAtBat = currentAtBat;
                const endedPitches = finalPitch ? [...pitches, finalPitch as Pitch] : [...pitches];
                const endedBatterId =
                    gameMode === 'opp_pitcher' ? (currentMyBatter?.player_id ?? currentMyBatter?.player?.id) : currentBatter?.id;

                // outs_before_override lets the post-hit advancement flow pass in the
                // outs count after recording N throwouts — currentOuts is still stale
                // here because setCurrentOuts hasn't flushed.
                const outsBefore = extra?.outs_before_override ?? currentOuts;
                const outsFromPlay = getOutsForResult(result);
                const newOutCount = outsBefore + outsFromPlay;
                await dispatch(
                    endAtBat({
                        id: endedAtBat.id,
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

                // Record completed at-bat for previous at-bats view
                if (endedBatterId) {
                    setCompletedAtBatsByBatter((prev) => ({
                        ...prev,
                        [endedBatterId]: [...(prev[endedBatterId] || []), { atBat: endedAtBat, result, pitches: endedPitches }],
                    }));
                }

                if (outsFromPlay > 0 && newOutCount >= 3) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                } else {
                    if (outsFromPlay > 0) setCurrentOuts(newOutCount);
                    if (!isScoutingMode && gameMode === 'opp_pitcher') {
                        // Advance to next batter in my team's lineup
                        // Active lineup = one row per slot (starter, or the sub that
                        // replaced them) — so the rotation includes substitutes.
                        const myStarters = myTeamLineup
                            .filter((p) => !p.replaced_by_id)
                            .sort((a, b) => a.batting_order - b.batting_order);
                        const currentMyOrder = currentMyBatter?.batting_order ?? 1;
                        const myLineupSize = myStarters.length;
                        const nextMyOrder = currentMyOrder >= myLineupSize ? 1 : currentMyOrder + 1;
                        const nextMyBatter = myStarters.find((p) => p.batting_order === nextMyOrder) ?? myStarters[0] ?? null;
                        dispatch(setCurrentMyBatter(nextMyBatter));
                    } else {
                        const nextBatter = findNextActiveBatter(activeBatters, currentBattingOrder);
                        if (nextBatter) setCurrentBattingOrder(nextBatter.batting_order);
                        if (nextBatter) {
                            setCurrentBatter(nextBatter);
                            await startAtBatForBatter(nextBatter, outsFromPlay > 0 ? newOutCount : outsBefore, currentInning);
                        } else {
                            setCurrentBatter(null);
                        }
                    }
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to end at-bat', type: 'error' });
            }
        },
        [
            currentAtBat,
            currentOuts,
            currentBattingOrder,
            activeBatters,
            currentInning,
            game,
            pitches,
            currentBatter,
            gameMode,
            isScoutingMode,
            currentMyBatter,
            myTeamLineup,
            dispatch,
            startAtBatForBatter,
            findNextActiveBatter,
            advanceInningWithRuns,
            toast,
        ]
    );

    const handleInningChangeConfirm = useCallback(async () => {
        await advanceInningWithRuns(parseInt(teamRunsScored, 10) || 0);
    }, [advanceInningWithRuns, teamRunsScored]);

    const handleSkipHalf = useCallback(async () => {
        await advanceInningWithRuns(0);
    }, [advanceInningWithRuns]);

    const handleTeamAtBatConfirm = useCallback(async () => {
        if (!id || !game) return;
        try {
            const runsToAdd = parseInt(teamAtBatRuns, 10) || 0;
            const newHomeScore = (game.home_score || 0) + runsToAdd;
            const awayScore = game.away_score || 0;
            const totalInnings = game.total_innings ?? 7;
            const isLastInningOrLater = game.current_inning >= totalInnings;
            const isHomeGame = game.is_home_game !== false;

            // User's runs go to home_score (user is always home_score)
            await gamesApi.updateScore(id, newHomeScore, awayScore);

            // Check for walk-off / game-over after home team bats in last inning
            if (isLastInningOrLater && isHomeGame) {
                if (newHomeScore !== awayScore) {
                    // Game is decided (home wins walk-off or home lost)
                    await dispatch(endGame({ gameId: id, finalData: { home_score: newHomeScore, away_score: awayScore } }));
                    setShowTeamAtBat(false);
                    setTeamAtBatRuns('0');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.replace(`/game/${id}` as any);
                    return;
                }
                // Tied → extra innings, fall through
            }

            // Advance 1 half-inning (from user's batting half to opponent's batting half)
            await gamesApi.advanceInning(id);

            // Clear base runners
            dispatch(setBaseRunners(clearBases()));
            // Await so game.inning_half is current before batter setup and re-render
            await dispatch(fetchGameById(id)).unwrap();
            const newInning = await gamesApi.getCurrentInning(id);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            // Set up next opponent batter, honoring whether the prior half-inning
            // ended via a baserunner out (don't advance the lineup pointer in that case).
            const firstBatter = findInningLeadoffBatter(activeBatters, currentBattingOrder, inningEndedByBaserunnerOut);
            if (firstBatter) setCurrentBattingOrder(firstBatter.batting_order);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
                dispatch(fetchCurrentInning(id));
            } else {
                setCurrentBatter(firstBatter); // keep batter even if newInning is null
                dispatch(fetchCurrentInning(id));
            }
            setInningEndedByBaserunnerOut(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            toast.show({ message: 'Failed to advance inning', type: 'error' });
        }
    }, [
        id,
        game,
        teamAtBatRuns,
        currentBattingOrder,
        activeBatters,
        dispatch,
        startAtBatForBatter,
        findInningLeadoffBatter,
        inningEndedByBaserunnerOut,
        router,
        toast,
    ]);

    const handleSelectPitcher = async (player: Player) => {
        if (!id || !currentInning) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const activePitcher = gamePitchers.find((p) => !p.inning_exited);
        if (activePitcher && activePitcher.player_id === player.id) {
            setPitcherModalVisible(false);
            return;
        }
        try {
            const result = await dispatch(
                changePitcher({ gameId: id, playerId: player.id, inningEntered: game?.current_inning || 1 })
            ).unwrap();
            setCurrentPitcher(result);
            setPitcherModalVisible(false);
        } catch {
            toast.show({ message: 'Failed to change pitcher', type: 'error' });
        }
    };

    const handleSelectBatter = useCallback(
        async (batter: OpponentLineupPlayer) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setCurrentBatter(batter);
            // Only update batting order tracking when no at-bat is in progress;
            // mid-at-bat changes update the display but preserve sequence integrity.
            if (!currentAtBat) {
                setCurrentBattingOrder(batter.batting_order);
                // Auto-start the at-bat so the user doesn't need a separate tap.
                if (currentInning) {
                    await startAtBatForBatter(batter, currentOuts, currentInning);
                }
            }
            setBatterModalVisible(false);
        },
        [currentAtBat, currentInning, currentOuts, startAtBatForBatter]
    );

    const handleEndGame = useCallback(async () => {
        if (!id || !game) return;
        const ok = await confirm({
            title: 'End Game',
            message: 'Are you sure you want to end this game? This will mark it as completed.',
            confirmLabel: 'End Game',
            destructive: true,
        });
        if (!ok) return;
        try {
            await gamesApi.endGame(id, { home_score: game.home_score || 0, away_score: game.away_score || 0 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace(`/game/${id}/viewer` as any);
        } catch {
            toast.show({ message: 'Failed to end game', type: 'error' });
        }
    }, [id, game, router, confirm, toast]);

    // Toggle home/away. Pre-pitch: silent flip. Post-pitch: confirm dialog explaining
    // what's about to happen (UX-LG-12). The server flip is a clean one-field update
    // (game.service.ts toggleHomeAway), so the data stays consistent — only the inning-half
    // batting context flips for future pitches.
    const handleToggleHomeAway = useCallback(async () => {
        if (!id || !game) return;
        if ((game.total_pitches ?? 0) > 0) {
            const newSide = game.is_home_game === false ? 'home' : 'away';
            const ok = await confirm({
                title: 'Swap home/away?',
                message: `${game.total_pitches} pitches already logged. Switching makes your team the ${newSide} team going forward — already-logged pitches keep their inning-half. Scores (opponent vs. your team) stay attached to each team and don't move.`,
                confirmLabel: 'Swap',
            });
            if (!ok) return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await dispatch(toggleHomeAway(id));
    }, [id, game, dispatch, confirm]);

    const handleStartAtBat = useCallback(async () => {
        if (!id || !currentInning) return;
        try {
            if (isScoutingMode) {
                if (!currentOpposingPitcher || !currentBatter) return;
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        opponent_batter_id: currentBatter.id,
                        opposing_pitcher_id: currentOpposingPitcher.id,
                        batting_order: currentBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            } else if (gameMode === 'opp_pitcher') {
                if (!currentOpposingPitcher || !currentMyBatter) return;
                const batterId = currentMyBatter.player_id ?? currentMyBatter.player?.id;
                if (!batterId) {
                    toast.show({
                        message: 'Batter player record not found. Please re-select the batter.',
                        type: 'error',
                    });
                    return;
                }
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        batter_id: batterId,
                        opposing_pitcher_id: currentOpposingPitcher.id,
                        batting_order: currentMyBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            } else {
                if (!currentPitcher || !currentBatter) return;
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: currentInning.id,
                        opponent_batter_id: currentBatter.id,
                        pitcher_id: currentPitcher.player_id,
                        batting_order: currentBatter.batting_order,
                        balls: 0,
                        strikes: 0,
                        outs_before: currentOuts,
                    })
                ).unwrap();
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            toast.show({
                message: 'Failed to create at-bat. You can still log pitches offline.',
                type: 'error',
            });
        }
    }, [
        gameMode,
        isScoutingMode,
        currentPitcher,
        currentBatter,
        currentOpposingPitcher,
        currentMyBatter,
        id,
        currentInning,
        currentOuts,
        dispatch,
        toast,
    ]);

    // Map PitchType to PitchCallAbbrev using the shared canonical mapping
    const toPitchCallAbbrev = (pt: PitchType): PitchCallAbbrev => PITCH_TYPE_TO_ABBREV[pt] ?? 'FB';

    const handleSendCall = async () => {
        if (!selectedPitchType || !targetZone || !id || !game) return;
        setSendingCall(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            const abbrev = toPitchCallAbbrev(selectedPitchType);
            let call: PitchCall;
            if (changingCallId) {
                call = await pitchCallingApi.changeCall(changingCallId, {
                    pitch_type: abbrev,
                    zone: targetZone,
                });
                setChangingCallId(null);
            } else {
                call = await pitchCallingApi.createCall({
                    game_id: id,
                    team_id: game.home_team_id || '',
                    pitch_type: abbrev,
                    zone: targetZone,
                    at_bat_id: currentAtBat?.id,
                    pitcher_id: currentPitcher?.player_id,
                    opponent_batter_id: currentBatter?.id,
                    inning: game.current_inning,
                    balls_before: currentAtBat ? currentAtBat.balls : 0,
                    strikes_before: currentAtBat ? currentAtBat.strikes : 0,
                });
            }
            setActiveCall(call);
            await speakPitchCall(abbrev, targetZone, false, pendingShakeCount);
            await pitchCallingApi.markTransmitted(call.id);
        } catch {
            toast.show({ message: 'Failed to send pitch call', type: 'error' });
        } finally {
            setSendingCall(false);
        }
    };

    const handleResendCall = async () => {
        if (!activeCall) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        try {
            await speakPitchCall(activeCall.pitch_type, activeCall.zone, false, pendingShakeCount);
            await pitchCallingApi.markTransmitted(activeCall.id);
        } catch {
            toast.show({ message: 'Failed to re-send call', type: 'error' });
        }
    };

    const handleChangeCall = () => {
        if (!activeCall) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setChangingCallId(activeCall.id);
        setActiveCall(null);
        setTargetZone(null);
        setPitchLocation(null);
    };

    const handleShake = () => {
        setPendingShakeCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleTalkPressIn = async () => {
        try {
            await startPassthrough();
            setWalkieTalkieActive(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (err: any) {
            toast.show({ message: err?.message || 'Failed to start walkie-talkie', type: 'error' });
        }
    };

    const handleTalkPressOut = async () => {
        if (isPassthroughActive()) {
            await stopPassthrough();
            setWalkieTalkieActive(false);
        }
    };

    // Fix Last Pitch — result-only PATCH for the most recent pitch (UX-LG-01).
    // Server rejects AB-boundary-crossing edits with 409/AB_BOUNDARY; we surface a
    // toast that steers the user to the existing Undo flow in those cases.
    const handleEditLastPitchResult = useCallback(
        async (newResult: PitchResult) => {
            if (!editResultPitch) return;
            if (newResult === editResultPitch.result) {
                setEditResultModalVisible(false);
                return;
            }
            const oldResult = editResultPitch.result;
            try {
                const { pitch: updated, atBat: updatedAb } = await gamesApi.updatePitchResult(editResultPitch.id, newResult);
                // Refresh local state so the StrikeZone preview re-colors and AB count updates.
                dispatch(updatePitch(updated));
                dispatch(setCurrentAtBat(updatedAb));
                setEditResultPitch({ id: updated.id, result: updated.pitch_result });
                setEditResultModalVisible(false);
                setStatsRefreshTrigger((prev) => prev + 1);
                toast.show({
                    message: `Updated: ${oldResult.replace(/_/g, ' ')} → ${newResult.replace(/_/g, ' ')}`,
                    type: 'success',
                });
            } catch (err: unknown) {
                const e = err as { status?: number; code?: string; message?: string };
                if (e.status === 409 && e.code === 'AB_BOUNDARY') {
                    toast.show({
                        message: 'This pitch ended the at-bat — use Undo to revert and re-log.',
                        type: 'info',
                        duration: 5000,
                    });
                } else if (e.status === 409) {
                    toast.show({ message: 'Only the most recent pitch can be edited.', type: 'error' });
                } else {
                    toast.show({ message: e.message || 'Failed to update pitch', type: 'error' });
                }
                setEditResultModalVisible(false);
            }
        },
        [editResultPitch, dispatch, id, toast]
    );

    const handleUndoLastPitch = useCallback(async () => {
        if (pitches.length === 0) return;
        const last = pitches[pitches.length - 1];
        const formatPitchType = (t: string) => t.replace(/_/g, ' ');
        const formatResult = (r: string) => r.replace(/_/g, ' ');
        const ok = await confirm({
            title: 'Undo last pitch?',
            message: `${formatPitchType(last.pitch_type)} — ${formatResult(last.pitch_result)}\nCount before: ${last.balls_before}-${last.strikes_before}`,
            confirmLabel: 'Undo',
            destructive: true,
        });
        if (!ok) return;
        try {
            await dispatch(undoLastPitch(last.id)).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            toast.show({
                message: err instanceof Error ? err.message : 'Could not undo pitch',
                type: 'error',
            });
        }
    }, [pitches, dispatch, confirm, toast]);

    const handleLogPitch = async (resultOverride?: PitchResult) => {
        if (isLoggingRef.current) return;
        const effectiveResult = resultOverride ?? selectedResult;
        if (!selectedPitchType || !effectiveResult || !pitchLocation) {
            toast.show({ message: 'Please select pitch type and location', type: 'error' });
            return;
        }
        if (!isScoutingMode && gameMode === 'our_pitcher' && !currentPitcher) {
            toast.show({ message: 'Please select a pitcher first', type: 'error' });
            return;
        }
        if (isScoutingMode && (!currentOpposingPitcher || !currentBatter)) {
            toast.show({ message: 'Please select a pitcher and batter first', type: 'error' });
            return;
        }
        isLoggingRef.current = true;
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const veloNum = velocity ? parseFloat(velocity) : undefined;
            const logResult = await logPitchOffline({
                at_bat_id: currentAtBat?.id || '',
                game_id: id!,
                pitcher_id: !isScoutingMode && gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined,
                pitch_type: selectedPitchType,
                pitch_result: effectiveResult,
                location_x: pitchLocation.x,
                location_y: pitchLocation.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                target_zone: targetZone ?? undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                batter_id:
                    !isScoutingMode && gameMode === 'opp_pitcher'
                        ? (currentMyBatter?.player_id ?? currentMyBatter?.player?.id)
                        : undefined,
                opponent_batter_id: isScoutingMode || gameMode === 'our_pitcher' ? currentBatter?.id : undefined,
                balls_before: balls,
                strikes_before: strikes,
                team_side: isScoutingMode ? 'opponent' : gameMode === 'our_pitcher' ? 'our_team' : 'opponent',
            });
            if (!logResult.success) {
                toast.show({ message: 'Failed to log pitch', type: 'error' });
                return;
            }
            // Surface the EDIT affordance for the just-logged pitch (UX-LG-01 Fix Last Pitch).
            // The snackbar's action button opens EditResultModal pre-loaded with this pitch.
            if (logResult.pitch?.id) {
                const justLogged = { id: logResult.pitch.id, result: logResult.pitch.pitch_result };
                setEditResultPitch(justLogged);
                toast.show({
                    message: `Logged: ${effectiveResult.replace(/_/g, ' ')}`,
                    type: 'success',
                    duration: 5000,
                    action: {
                        label: 'EDIT',
                        onPress: () => {
                            setEditResultPitch(justLogged);
                            setEditResultModalVisible(true);
                        },
                    },
                });
            }
            setStatsRefreshTrigger((prev) => prev + 1);
            const newBalls = balls + (effectiveResult === 'ball' ? 1 : 0);
            const newStrikes =
                effectiveStrikes +
                (effectiveResult === 'called_strike' || effectiveResult === 'swinging_strike'
                    ? 1
                    : effectiveResult === 'foul' && effectiveStrikes < 2
                      ? 1
                      : 0);
            // Log result on active pitch call
            if (activeCall) {
                const callResult =
                    effectiveResult === 'called_strike' || effectiveResult === 'swinging_strike'
                        ? 'strike'
                        : effectiveResult === 'hit_by_pitch'
                          ? 'ball'
                          : (effectiveResult as 'ball' | 'foul' | 'in_play');
                try {
                    await pitchCallingApi.logResult(activeCall.id, callResult);
                } catch {
                    // Non-critical
                }
                setActiveCall(null);
            }
            // Capture pitch data before resetting local state — used to include the final pitch
            // in at-bat history when the at-bat ends (walk/strikeout) in the same call, before
            // the Redux pitches selector has a chance to reflect the new pitch.
            const finalPitch: Partial<Pitch> = {
                pitch_type: selectedPitchType,
                pitch_result: effectiveResult,
                location_x: pitchLocation!.x,
                location_y: pitchLocation!.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                balls_before: balls,
                strikes_before: strikes,
            };
            setSelectedPitchType(null);
            setSelectedResult(null);
            setPitchLocation(null);
            setTargetZone(null);
            setVelocity('');
            setChangingCallId(null);
            setPendingShakeCount(0);
            if (logResult.queued) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (effectiveResult === 'hit_by_pitch' || newBalls >= 4) {
                const endResult = effectiveResult === 'hit_by_pitch' ? 'hit_by_pitch' : 'walk';
                const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
                if (hasRunnersOnBase) {
                    setPendingHitResult(endResult);
                    setShowRunnerAdvancementModal(true);
                } else {
                    const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, endResult);
                    dispatch(setBaseRunners(suggestedRunners));
                    if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                    await updateScoreForRuns(suggestedRuns);
                    await handleEndAtBat(endResult, finalPitch, { rbi: suggestedRuns, runs_scored: suggestedRuns });
                }
            } else if (newStrikes >= 3) {
                // MLB rule: batter can reach on an uncaught third strike only when 1st base
                // is unoccupied, OR when there are 2 outs. Prompt the user to distinguish.
                const canDropThird = !baseRunners.first || currentOuts >= 2;
                if (canDropThird) {
                    const droppedYes = await confirm({
                        title: 'Third strike',
                        message: 'Was the third strike dropped?',
                        confirmLabel: 'Yes',
                        cancelLabel: 'No',
                    });
                    if (droppedYes) {
                        // Show runner advancement for the dropped K3. The suggested
                        // advancement places the batter on 1st and force-advances runners.
                        setPendingHitResult('strikeout_dropped');
                        setShowRunnerAdvancementModal(true);
                    } else {
                        await handleEndAtBat('strikeout', finalPitch);
                    }
                } else {
                    await handleEndAtBat('strikeout', finalPitch);
                }
            } else if (effectiveResult === 'in_play') setShowInPlayModal(true);
        } catch {
            toast.show({ message: 'Failed to log pitch', type: 'error' });
        } finally {
            isLoggingRef.current = false;
            setIsLogging(false);
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

    const handleInPlayResult = useCallback(
        async (result: string, hitLocation?: HitLocation, fieldedBy?: string) => {
            // Capture before any async clears state
            const capturedAtBat = currentAtBat;
            const capturedPitches = pitches;

            setShowInPlayModal(false);
            // For hits, show runner advancement modal
            const hitResults = [
                'single',
                'double',
                'triple',
                'home_run',
                'walk',
                'hit_by_pitch',
                'sacrifice_fly',
                'sacrifice_bunt',
            ];
            const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
            if (hitResults.includes(result) && hasRunnersOnBase) {
                setPendingHitResult(result);
                setShowRunnerAdvancementModal(true);
            } else if (hitResults.includes(result)) {
                // No runners on base, just apply standard advancement
                const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, result);
                dispatch(setBaseRunners(suggestedRunners));
                if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                await updateScoreForRuns(suggestedRuns);
                await handleEndAtBat(result, undefined, { rbi: suggestedRuns, runs_scored: suggestedRuns });
            } else if (result === 'double_play' && hasRunnersOnBase) {
                setShowDoublePlayModal(true);
            } else {
                // Out result - just end at-bat
                await handleEndAtBat(result);
            }

            // Record the play with hit location and fielder position
            if (hitLocation && capturedAtBat) {
                const lastPitch = capturedPitches[capturedPitches.length - 1];
                if (lastPitch?.id) {
                    // Use explicitly selected fielder; fall back to coordinate-derived position
                    const resolvedFielder = fieldedBy ?? deriveFielderPosition(hitLocation.x, hitLocation.y);
                    const isOut =
                        result !== 'single' &&
                        result !== 'double' &&
                        result !== 'triple' &&
                        result !== 'home_run' &&
                        result !== 'walk' &&
                        result !== 'hit_by_pitch' &&
                        result !== 'error';
                    const contactType =
                        result === 'popout'
                            ? 'pop_up'
                            : hitLocation.hitType === 'ground_ball'
                              ? 'ground_ball'
                              : hitLocation.hitType === 'fly_ball'
                                ? 'fly_ball'
                                : 'line_drive';
                    gamesApi
                        .recordPlay({
                            pitch_id: lastPitch.id,
                            at_bat_id: capturedAtBat.id,
                            contact_type: contactType as ContactType,
                            fielded_by_position: (resolvedFielder ?? undefined) as PlayerPosition | undefined,
                            is_error: result === 'error',
                            is_out: isOut,
                            runs_scored: 0,
                        })
                        .catch(() => {}); // non-critical
                }
            }
        },
        [handleEndAtBat, baseRunners, id, dispatch, currentAtBat, pitches, updateScoreForRuns]
    );

    const handleRunnerAdvancementConfirm = useCallback(
        async (
            newRunners: BaseRunners,
            runsScored: number,
            throwouts: Throwout[] = [],
            errorAdvancements: ErrorAdvancement[] = []
        ) => {
            if (!pendingHitResult) return;
            try {
                let lastOutsAfter = currentOuts;
                if (throwouts.length > 0 && id && currentInning) {
                    // Record N throwout events sequentially. Thread outs_before through each
                    // call so the service computes outs_after correctly. new_base_runners
                    // attaches only to the last event so games.base_runners lands once.
                    let runningOutsBefore = currentOuts;
                    for (let i = 0; i < throwouts.length; i++) {
                        if (runningOutsBefore >= 3) break;
                        const t = throwouts[i];
                        const isLast = i === throwouts.length - 1;
                        const event = await dispatch(
                            recordBaserunnerEvent({
                                game_id: id,
                                inning_id: currentInning.id,
                                at_bat_id: currentAtBat?.id,
                                event_type: 'thrown_out_advancing',
                                runner_base: t.fromBase,
                                runner_to_base: t.toBase,
                                fielder_sequence: t.fielderSeq,
                                outs_before: runningOutsBefore,
                                new_base_runners: isLast ? newRunners : undefined,
                            } as any)
                        ).unwrap();
                        runningOutsBefore = event.outs_after;
                        lastOutsAfter = event.outs_after;
                    }
                    dispatch(setBaseRunners(newRunners));
                } else {
                    dispatch(setBaseRunners(newRunners));
                    if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                }

                // Record any extra advances on throw/error the user flagged. The
                // base-runner state is already final, so each event passes
                // new_base_runners to keep the service from re-deriving it.
                if (errorAdvancements.length > 0 && id && currentInning) {
                    for (const adv of errorAdvancements) {
                        await dispatch(
                            recordBaserunnerEvent({
                                game_id: id,
                                inning_id: currentInning.id,
                                at_bat_id: currentAtBat?.id,
                                event_type: 'advance_on_throw',
                                runner_base: adv.fromBase === 'batter' ? 'home' : adv.fromBase,
                                runner_to_base: adv.toBase,
                                outs_before: lastOutsAfter,
                                new_base_runners: newRunners,
                            } as any)
                        ).unwrap();
                    }
                }

                await updateScoreForRuns(runsScored);
                setShowRunnerAdvancementModal(false);

                if (throwouts.length > 0) {
                    if (lastOutsAfter >= 3) {
                        setCurrentOuts(0);
                        setTeamRunsScored('0');
                        setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                        setShowInningChange(true);
                        // 3rd out came from a baserunner thrown out advancing — the
                        // on-deck batter (after handleEndAtBat advances the pointer for
                        // the completed hit) leads off without further advancement.
                        setInningEndedByBaserunnerOut(true);
                    } else {
                        setCurrentOuts(lastOutsAfter);
                    }
                }

                // Credit the batter with an RBI for each run scored on the play (sac fly, hit, etc.).
                // Walks/HBPs also legitimately credit forced runs. The hit still counts even if a
                // runner was thrown out trying to advance.
                // outs_before_override threads the post-throwout outs into handleEndAtBat — its
                // currentOuts closure is still pre-throwout because the setState hasn't flushed.
                await handleEndAtBat(pendingHitResult, undefined, {
                    rbi: runsScored,
                    runs_scored: runsScored,
                    outs_before_override: lastOutsAfter,
                });
                setPendingHitResult(null);
            } catch {
                toast.show({ message: 'Failed to update runner positions', type: 'error' });
            }
        },
        [pendingHitResult, id, dispatch, handleEndAtBat, updateScoreForRuns, currentInning, currentAtBat, currentOuts, game, toast]
    );

    const handleRecordBaserunnerOut = useCallback(
        async (eventType: BaserunnerEventType, runnerBase: RunnerBase) => {
            if (!id || !currentInning) return;
            try {
                await dispatch(
                    recordBaserunnerEvent({
                        game_id: id,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: eventType,
                        runner_base: runnerBase,
                        outs_before: currentOuts,
                    })
                ).unwrap();
                // Remove the runner from local + server base-runner state (the event table
                // does not cascade into games.base_runners; parity with web behavior).
                const newRunners: BaseRunners = { ...baseRunners, [runnerBase]: false };
                dispatch(setBaseRunners(newRunners));
                dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                const newOuts = currentOuts + 1;
                setCurrentOuts(newOuts);
                if (newOuts >= 3) {
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                    // The batter at the plate was not retired — they lead off when this
                    // team returns next inning.
                    setInningEndedByBaserunnerOut(true);
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record baserunner out', type: 'error' });
            }
        },
        [id, currentInning, currentAtBat, currentOuts, game, dispatch, baseRunners, advanceInningWithRuns, toast]
    );

    const handleRecordAdvancement = useCallback(
        async (
            eventType: 'stolen_base' | 'wild_pitch' | 'passed_ball' | 'balk' | 'advance_on_throw',
            fromBase: RunnerBase,
            newRunners: BaseRunners,
            runsScored: number,
            runnerToBase?: RunnerBase | 'home'
        ) => {
            if (!id || !currentInning) return;
            try {
                await dispatch(
                    recordBaserunnerEvent({
                        game_id: id,
                        inning_id: currentInning.id,
                        at_bat_id: currentAtBat?.id,
                        event_type: eventType,
                        runner_base: fromBase,
                        runner_to_base: runnerToBase,
                        new_base_runners: newRunners,
                        outs_before: currentOuts,
                    } as any)
                ).unwrap();
                dispatch(setBaseRunners(newRunners));
                await updateScoreForRuns(runsScored);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record runner advancement', type: 'error' });
            }
        },
        [id, currentInning, currentAtBat, currentOuts, dispatch, updateScoreForRuns, toast]
    );

    const handleDoublePlayConfirm = useCallback(
        async (outRunners: RunnerBase[], batterReachesFirst: boolean) => {
            if (!id || !currentInning) return;
            try {
                for (const runnerBase of outRunners) {
                    await dispatch(
                        recordBaserunnerEvent({
                            game_id: id,
                            inning_id: currentInning.id,
                            at_bat_id: currentAtBat?.id,
                            event_type: 'other',
                            runner_base: runnerBase,
                            outs_before: currentOuts,
                        })
                    ).unwrap();
                }

                const newRunners: BaseRunners = { ...baseRunners };
                for (const base of outRunners) {
                    newRunners[base] = false;
                }
                if (batterReachesFirst) {
                    newRunners.first = true;
                }

                dispatch(setBaseRunners(newRunners));
                dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
                setShowDoublePlayModal(false);
                await handleEndAtBat('double_play');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                toast.show({ message: 'Failed to record double play', type: 'error' });
            }
        },
        [id, currentInning, currentAtBat, currentOuts, baseRunners, dispatch, handleEndAtBat, toast]
    );

    const handleRunnerPress = useCallback(
        (base: RunnerBase) => {
            if (baseRunners[base]) {
                setRunnerEventDefaultTab('out');
                setShowRunnerEventModal(true);
            }
        },
        [baseRunners]
    );

    const canStartAtBat =
        gameMode === 'opp_pitcher'
            ? currentOpposingPitcher && currentMyBatter && !currentAtBat
            : currentPitcher && currentBatter && !currentAtBat;
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

    useGameWebSocket(id ?? null, {
        pitch_logged: () => setStatsRefreshTrigger((prev) => prev + 1),
        at_bat_ended: () => setStatsRefreshTrigger((prev) => prev + 1),
        inning_changed: () => setStatsRefreshTrigger((prev) => prev + 1),
        runners_updated: () => setStatsRefreshTrigger((prev) => prev + 1),
        // Coach sends a pitch call → pre-fill pitch type + target zone on receiver devices (catcher, etc.)
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

    if (gameStateLoading || loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <LoadingScreen message="Loading game..." />
            </SafeAreaView>
        );
    }

    if (!game) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <Text variant="titleLarge">Live Game</Text>
                    <View style={{ width: 48 }} />
                </View>
                <ErrorScreen
                    title="Game not found"
                    message={error || 'The game could not be loaded'}
                    onRetry={() => id && dispatch(fetchGameById(id))}
                    onGoBack={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    const isReadOnly = game.status !== 'in_progress';

    if (game.status === 'in_progress' && currentGameRole === null) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.roleSelectContainer}>
                    <Text variant="headlineMedium" style={styles.roleSelectTitle}>
                        Join Game
                    </Text>
                    <Text variant="bodyMedium" style={[styles.roleSelectSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                        Select your role for this session
                    </Text>
                    <View style={styles.roleSelectButtons}>
                        <Button
                            mode="contained"
                            onPress={async () => {
                                // Claim charter — server returns "viewer" if
                                // another user already holds it (one per game).
                                try {
                                    const rec = await gamesApi.assignGameRole(id, 'charter');
                                    dispatch(setCurrentGameRole(rec.role));
                                    if (rec.role === 'viewer') {
                                        toast.show({
                                            message: 'Someone is already charting this game — you have joined as a viewer.',
                                            type: 'info',
                                        });
                                        router.push(`/game/${id}/viewer` as any);
                                    }
                                } catch {
                                    dispatch(setCurrentGameRole('charter'));
                                }
                            }}
                            style={styles.roleButton}
                        >
                            Charter
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={async () => {
                                try {
                                    await gamesApi.assignGameRole(id, 'viewer');
                                } catch {
                                    // Non-fatal — still enter as a viewer locally.
                                }
                                dispatch(setCurrentGameRole('viewer'));
                                router.push(`/game/${id}/viewer` as any);
                            }}
                            style={styles.roleButton}
                        >
                            Viewer
                        </Button>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    const filteredGamePitches =
        pitchTypeFilter === 'all' ? allGamePitches : allGamePitches.filter((p) => (p.pitch_type || 'other') === pitchTypeFilter);

    const renderPitchTypeFilterBar = () => {
        if (!isReadOnly || allGamePitches.length === 0) return null;
        const types = Array.from(new Set(allGamePitches.map((p) => p.pitch_type || 'other')));
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pitchFilterBar}>
                <Chip
                    selected={pitchTypeFilter === 'all'}
                    onPress={() => setPitchTypeFilter('all')}
                    style={[styles.pitchFilterChip, pitchTypeFilter === 'all' && { backgroundColor: theme.colors.primary }]}
                    textStyle={pitchTypeFilter === 'all' ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                    compact
                >
                    All
                </Chip>
                {types.map((type) => (
                    <Chip
                        key={type}
                        selected={pitchTypeFilter === type}
                        onPress={() => setPitchTypeFilter(type)}
                        style={[
                            styles.pitchFilterChip,
                            pitchTypeFilter === type && { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[500] },
                        ]}
                        textStyle={pitchTypeFilter === type ? styles.pitchFilterChipTextActive : styles.pitchFilterChipText}
                        compact
                    >
                        {PITCH_TYPE_LABELS[type] ?? type}
                    </Chip>
                ))}
            </ScrollView>
        );
    };

    const renderPitchBreakdown = () => {
        if (!isReadOnly || allGamePitches.length === 0) return null;
        const byType: Record<string, { count: number; strikes: number; balls: number }> = {};
        for (const pitch of allGamePitches) {
            const t = pitch.pitch_type || 'other';
            if (!byType[t]) byType[t] = { count: 0, strikes: 0, balls: 0 };
            byType[t].count++;
            if (
                pitch.pitch_result === 'called_strike' ||
                pitch.pitch_result === 'swinging_strike' ||
                pitch.pitch_result === 'foul' ||
                pitch.pitch_result === 'in_play'
            ) {
                byType[t].strikes++;
            } else if (pitch.pitch_result === 'ball' || pitch.pitch_result === 'hit_by_pitch') {
                byType[t].balls++;
            }
        }
        const total = allGamePitches.length;
        const totalStrikes = Object.values(byType).reduce((s, v) => s + v.strikes, 0);
        const totalBalls = Object.values(byType).reduce((s, v) => s + v.balls, 0);
        const entries = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
        return (
            <View style={[styles.breakdownTable, { backgroundColor: theme.colors.surface }]}>
                <Text style={styles.breakdownTitle}>Pitch Breakdown</Text>
                <View style={[styles.breakdownRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownHeaderText]}>Type</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>#</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>K</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>B</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>%</Text>
                </View>
                {entries.map(([type, stats]) => (
                    <View key={type} style={styles.breakdownRow}>
                        <View style={[styles.breakdownTypeCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                            <View style={[styles.typeColorDot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? colors.gray[400] }]} />
                            <Text style={styles.breakdownText}>{PITCH_TYPE_LABELS[type] ?? type}</Text>
                        </View>
                        <Text style={styles.breakdownNumCell}>{stats.count}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.strikes}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.balls}</Text>
                        <Text style={styles.breakdownNumCell}>{Math.round((stats.count / total) * 100)}%</Text>
                    </View>
                ))}
                <View style={[styles.breakdownRow, styles.breakdownTotalRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownTotalText]}>Total</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{total}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalStrikes}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalBalls}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>100%</Text>
                </View>
            </View>
        );
    };

    // Zone-tap UX cues (UX-LG-02 / UX-LG-03). Subtitle communicates which tap is being
    // captured; the "Actual = Target" pill is a one-tap shortcut for on-spot pitches so
    // the coach doesn't have to tap the same zone twice.
    const renderZoneTapHint = () => {
        if (!targetZone) {
            return (
                <Text style={styles.zoneHint}>
                    <Text style={styles.zoneHintBold}>Tap target zone</Text>
                    {' · 1st tap'}
                </Text>
            );
        }
        if (!pitchLocation) {
            return (
                <Text style={styles.zoneHint}>
                    <Text style={styles.zoneHintBold}>Tap actual location</Text>
                    {' · 2nd tap (or pin to target below)'}
                </Text>
            );
        }
        return <Text style={[styles.zoneHint, styles.zoneHintReady]}>✓ Target + actual set — tap result to log</Text>;
    };

    const renderActualEqualsTargetButton = () => {
        if (!targetZone || pitchLocation) return null;
        const zc = PITCH_CALL_ZONE_COORDS[targetZone];
        return (
            <Button
                mode="outlined"
                compact
                icon="target"
                style={styles.actualEqualsTargetButton}
                onPress={() => {
                    Haptics.selectionAsync();
                    setPitchLocation({ x: zc.x, y: zc.y });
                }}
            >
                Pitch hit target ({PITCH_CALL_ZONE_LABELS[targetZone]})
            </Button>
        );
    };

    const renderGameHeader = () => (
        <GameHeader
            game={game}
            currentPitcher={activePitcherDisplay}
            currentBatter={activeBatterDisplay}
            balls={balls}
            strikes={strikes}
            outs={currentOuts}
            runners={baseRunners}
            pitcherGamePitchCount={pitcherGamePitchCount}
            onPitcherPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode === 'opp_pitcher'
                        ? () => setShowOpposingPitcherModal(true)
                        : () => setPitcherModalVisible(true)
                    : undefined
            }
            onPitcherStatsPress={
                !isScoutingMode && gameMode === 'our_pitcher' && currentPitcher ? () => setShowPitcherStatsModal(true) : undefined
            }
            onBatterPress={
                game.status === 'in_progress'
                    ? isScoutingMode || gameMode !== 'opp_pitcher'
                        ? () => setBatterModalVisible(true)
                        : () => setMyBatterModalVisible(true)
                    : undefined
            }
            onRunnerPress={game.status === 'in_progress' ? handleRunnerPress : undefined}
            onSwapPress={handleToggleHomeAway}
        />
    );

    const renderAtBatControls = () => {
        if (game.status !== 'in_progress') return null;
        if (shouldSkipHalf) {
            const battingTeamName = scoutingFocus === 'home' ? game.scouting_home_team || 'Home' : game.opponent_name || 'Away';
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>{battingTeamName} batting — not charting this half.</Text>
                    <Button mode="contained" onPress={handleSkipHalf} style={{ marginTop: 8 }} icon="skip-next">
                        Skip to Next Half
                    </Button>
                </View>
            );
        }
        if (canStartAtBat) {
            return (
                <Button
                    mode="contained"
                    onPress={handleStartAtBat}
                    style={styles.startAtBatButton}
                    contentStyle={styles.logButtonContent}
                    icon="baseball-bat"
                >
                    Start At-Bat
                </Button>
            );
        }
        if (gameMode === 'opp_pitcher') {
            if (!currentOpposingPitcher || !currentMyBatter) {
                return (
                    <View style={styles.selectPrompt}>
                        <Text style={styles.selectPromptText}>
                            {!currentOpposingPitcher && !currentMyBatter
                                ? 'Select opposing pitcher and your batter to begin'
                                : !currentOpposingPitcher
                                  ? 'Select the opposing pitcher to begin'
                                  : 'Select your batter to begin'}
                        </Text>
                        {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                            <Button
                                mode="outlined"
                                onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                style={{ marginTop: 8 }}
                            >
                                Setup My Lineup
                            </Button>
                        )}
                        {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                            <Button
                                mode="outlined"
                                onPress={() => router.push(`/game/${id}/lineup` as any)}
                                style={{ marginTop: 8 }}
                            >
                                Setup Opponent Lineup
                            </Button>
                        )}
                    </View>
                );
            }
            return null;
        }
        if (!currentPitcher || !currentBatter) {
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>
                        {!currentPitcher && !currentBatter
                            ? 'Select a pitcher and batter to begin'
                            : !currentPitcher
                              ? 'Select a pitcher to begin'
                              : 'Select a batter to begin'}
                    </Text>
                    {opponentLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'opp_pitcher' && (
                        <Button mode="outlined" onPress={() => router.push(`/game/${id}/lineup` as any)} style={{ marginTop: 8 }}>
                            Setup Opponent Lineup
                        </Button>
                    )}
                    {myTeamLineup.length === 0 && !isScoutingMode && game?.charting_mode !== 'our_pitcher' && (
                        <Button
                            mode="outlined"
                            onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                            style={{ marginTop: 8 }}
                        >
                            Setup My Lineup
                        </Button>
                    )}
                </View>
            );
        }
        return null;
    };

    const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;

    const renderModals = () => (
        <Portal>
            <PitcherSelectorModal
                visible={pitcherModalVisible}
                onDismiss={() => setPitcherModalVisible(false)}
                gamePitchers={gamePitchers}
                currentPitcher={currentPitcher}
                teamPlayers={teamPlayers}
                onSelectExistingPitcher={(gp) => {
                    setCurrentPitcher(gp);
                    setPitcherModalVisible(false);
                }}
                onSelectNewPitcher={handleSelectPitcher}
                isTablet={isTablet}
            />
            <BatterSelectorModal
                visible={batterModalVisible}
                onDismiss={() => setBatterModalVisible(false)}
                activeBatters={activeBatters}
                currentBatter={currentBatter}
                onSelectBatter={handleSelectBatter}
                isTablet={isTablet}
                gameId={id!}
                lineupSize={lineupSize}
                onBatterAdded={() => dispatch(fetchOpponentLineup(id!))}
                currentInningNumber={currentInning?.inning_number}
            />
            <MyBatterSelectorModal
                visible={myBatterModalVisible}
                onDismiss={() => setMyBatterModalVisible(false)}
                lineup={myTeamLineup}
                currentBatter={currentMyBatter}
                onSelectBatter={(p) => {
                    dispatch(setCurrentMyBatter(p));
                    setMyBatterModalVisible(false);
                }}
                teamPlayers={teamPlayers}
                currentInningNumber={currentInning?.inning_number}
                onSubstituted={async () => {
                    if (!id) return;
                    const updated = await dispatch(fetchMyTeamLineup(id)).unwrap();
                    // If the current batter was the one replaced, point at the new sub in that slot.
                    if (currentMyBatter) {
                        const stillActive = updated.find((p) => p.id === currentMyBatter.id && !p.replaced_by_id);
                        if (!stillActive) {
                            const replacement = updated.find(
                                (p) => p.batting_order === currentMyBatter.batting_order && !p.replaced_by_id
                            );
                            if (replacement) dispatch(setCurrentMyBatter(replacement));
                        }
                    }
                }}
                isTablet={isTablet}
            />
            <InningChangeModal
                visible={showInningChange}
                inningChangeInfo={inningChangeInfo}
                teamRunsScored={teamRunsScored}
                onRunsChange={setTeamRunsScored}
                onConfirm={handleInningChangeConfirm}
                onDismiss={() => advanceInningWithRuns(0)}
                isTablet={isTablet}
                showRunsInput={game?.scouting_focus === 'home' || game?.scouting_focus === 'away'}
            />
            <TeamAtBatModal
                visible={showTeamAtBat}
                inning={game?.current_inning || 1}
                inningHalf={game?.inning_half || 'top'}
                teamRunsScored={teamAtBatRuns}
                onRunsChange={setTeamAtBatRuns}
                onConfirm={handleTeamAtBatConfirm}
                onDismiss={() => setShowTeamAtBat(false)}
                isTablet={isTablet}
            />
            <RunnerEventModal
                visible={showRunnerEventModal}
                onDismiss={() => setShowRunnerEventModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                defaultTab={runnerEventDefaultTab}
                onRecordAdvancement={handleRecordAdvancement}
                onRecordOut={handleRecordBaserunnerOut}
            />
            <DoublePlayModal
                visible={showDoublePlayModal}
                onDismiss={() => setShowDoublePlayModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                onConfirm={handleDoublePlayConfirm}
            />
            <RunnerAdvancementModal
                visible={showRunnerAdvancementModal}
                onDismiss={() => {
                    setShowRunnerAdvancementModal(false);
                    setPendingHitResult(null);
                }}
                currentRunners={baseRunners}
                hitResult={pendingHitResult || 'single'}
                onConfirm={handleRunnerAdvancementConfirm}
            />
            {currentPitcher && (
                <PitcherTendenciesModal
                    visible={showPitcherTendencies}
                    onDismiss={() => setShowPitcherTendencies(false)}
                    pitcherId={currentPitcher.player_id}
                    pitcherName={
                        currentPitcher.player ? `${currentPitcher.player.first_name} ${currentPitcher.player.last_name}` : 'Pitcher'
                    }
                    initialBatterHand={currentBatter?.bats === 'L' ? 'L' : 'R'}
                />
            )}
            {currentBatter && (
                <HitterTendenciesModal
                    visible={showHitterTendencies}
                    onDismiss={() => setShowHitterTendencies(false)}
                    batterId={currentBatter.id}
                    batterName={currentBatter.player_name}
                    batterType="opponent"
                    gameId={id}
                />
            )}
            {game && game.charting_mode !== 'our_pitcher' && id && (
                <OpposingPitcherModal
                    visible={showOpposingPitcherModal}
                    onDismiss={() => setShowOpposingPitcherModal(false)}
                    gameId={id}
                    opposingPitchers={opposingPitchers}
                    currentOpposingPitcher={currentOpposingPitcher}
                    onSelect={(p) => dispatch(setCurrentOpposingPitcher(p))}
                    onCreate={async (params) => {
                        await dispatch(createOpposingPitcher(params)).unwrap();
                    }}
                    onDelete={async (pid) => {
                        await dispatch(deleteOpposingPitcher(pid)).unwrap();
                    }}
                    opponentName={game.opponent_name}
                />
            )}
            {id && (
                <CountBreakdownModal
                    visible={showCountBreakdownModal}
                    onDismiss={() => setShowCountBreakdownModal(false)}
                    gameId={id}
                    pitcherId={gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined}
                    teamSide={gameMode === 'our_pitcher' ? 'our_team' : 'opponent'}
                    refreshTrigger={statsRefreshTrigger}
                />
            )}
            <PitcherStatsModal
                visible={showPitcherStatsModal}
                onDismiss={() => setShowPitcherStatsModal(false)}
                pitcher={currentPitcher?.player ?? null}
                pitcherId={currentPitcher?.player_id}
                gameId={id}
            />
        </Portal>
    );

    const previousAtBatsForCurrentBatter = currentBatter ? completedAtBatsByBatter[currentBatter.id] || [] : [];
    const hasPreviousAtBats = previousAtBatsForCurrentBatter.length > 0;

    const renderRunnerOutButton = () => {
        if (isScoutingMode || game.status !== 'in_progress' || !hasRunnersOnBase) return null;
        return (
            <View style={styles.runnerActionRow}>
                <Button
                    mode="outlined"
                    onPress={() => {
                        setRunnerEventDefaultTab('advance');
                        setShowRunnerEventModal(true);
                    }}
                    style={styles.runnerOutButton}
                    icon="run-fast"
                    compact
                >
                    Runner Adv
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => {
                        setRunnerEventDefaultTab('out');
                        setShowRunnerEventModal(true);
                    }}
                    style={styles.runnerOutButton}
                    icon="account-remove"
                    compact
                >
                    Runner Out
                </Button>
            </View>
        );
    };

    // Tablet landscape layout
    if (isTablet && isLandscape) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.header}>
                    <IconButton icon="arrow-left" onPress={() => router.back()} />
                    <View style={styles.headerCenter}>
                        <Text variant="titleLarge">Live Game</Text>
                        <SyncStatusBadge compact />
                    </View>
                    <View style={styles.headerRight}>
                        {game.home_team_id && (
                            <IconButton
                                icon="clipboard-text"
                                onPress={async () => {
                                    try {
                                        const existing = await scoutingReportsApi.getByGameId(id!);
                                        if (existing) {
                                            router.push(`/team/${game.home_team_id}/scouting/${existing.id}` as any);
                                        } else {
                                            router.push(`/team/${game.home_team_id}/scouting` as any);
                                        }
                                    } catch {
                                        router.push(`/team/${game.home_team_id}/scouting` as any);
                                    }
                                }}
                            />
                        )}
                        {id && (
                            <IconButton
                                icon="account-search"
                                onPress={() => setShowBreakdown(true)}
                                accessibilityLabel="Batter breakdown"
                            />
                        )}
                        {game.status === 'in_progress' ? (
                            <IconButton icon="flag-checkered" onPress={handleEndGame} />
                        ) : (
                            <View style={{ width: 48 }} />
                        )}
                    </View>
                </View>
                <View style={styles.tabletContent}>
                    <View style={styles.statsPanel}>
                        {renderGameHeader()}
                        {game.charting_mode !== 'our_pitcher' &&
                            !isScoutingMode &&
                            myTeamLineup.length === 0 &&
                            game.status === 'in_progress' && (
                                <View style={styles.lineupBanner}>
                                    <Text style={styles.lineupBannerText}>My team lineup not set</Text>
                                    <Button
                                        mode="contained"
                                        compact
                                        onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                        style={styles.lineupBannerBtn}
                                    >
                                        Set Lineup
                                    </Button>
                                </View>
                            )}
                        {renderRunnerOutButton()}
                        {renderAtBatControls()}
                        {game.status === 'in_progress' && (currentPitcher || currentBatter) && (
                            <View style={styles.tendenciesRow}>
                                {currentPitcher && (
                                    <Button
                                        mode="outlined"
                                        compact
                                        onPress={() => setShowPitcherTendencies(true)}
                                        style={styles.tendencyBtn}
                                        labelStyle={styles.tendencyBtnLabel}
                                        icon="chart-bar"
                                    >
                                        Pitcher
                                    </Button>
                                )}
                                {currentBatter && (
                                    <Button
                                        mode="outlined"
                                        compact
                                        onPress={() => setShowHitterTendencies(true)}
                                        style={[styles.tendencyBtn, styles.tendencyBtnHitter]}
                                        labelStyle={[styles.tendencyBtnLabel, styles.tendencyBtnLabelHitter]}
                                        icon="account-details"
                                    >
                                        Hitter
                                    </Button>
                                )}
                            </View>
                        )}
                        {game.status === 'in_progress' && game.charting_mode !== 'our_pitcher' && (
                            <View style={styles.tendenciesRow}>
                                <Button
                                    mode="outlined"
                                    compact
                                    onPress={() => setShowOpposingPitcherModal(true)}
                                    style={styles.tendencyBtn}
                                    labelStyle={styles.tendencyBtnLabel}
                                    icon="baseball"
                                >
                                    {currentOpposingPitcher ? currentOpposingPitcher.pitcher_name.split(' ').pop() : 'Opp. Pitcher'}
                                </Button>
                                <Button
                                    mode="outlined"
                                    compact
                                    onPress={() => setShowCountBreakdownModal(true)}
                                    style={styles.tendencyBtn}
                                    labelStyle={styles.tendencyBtnLabel}
                                    icon="counter"
                                >
                                    Counts
                                </Button>
                            </View>
                        )}
                        <View style={styles.statsPlaceholder}>
                            <Text variant="titleSmall" style={{ marginTop: 16 }}>
                                Pitcher Stats
                            </Text>
                            <Text variant="bodySmall" style={styles.placeholder}>
                                Total Pitches: {pitches.length}
                            </Text>
                        </View>
                    </View>
                    <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainPanelContent}>
                        {renderPitchTypeFilterBar()}
                        {!isReadOnly && renderZoneTapHint()}
                        <StrikeZone
                            onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                            onTargetZoneSelect={setTargetZone}
                            onTargetClear={() => {
                                setTargetZone(null);
                                setPitchLocation(null);
                            }}
                            targetZone={targetZone}
                            previousPitches={isReadOnly ? filteredGamePitches : pitches}
                            disabled={isReadOnly || isLogging}
                            colorBy={isReadOnly ? 'pitchType' : 'result'}
                            batterSide={
                                !isScoutingMode && gameMode === 'opp_pitcher'
                                    ? (currentMyBatter?.player?.bats as 'R' | 'L' | 'S' | undefined)
                                    : (currentBatter?.bats as 'R' | 'L' | 'S' | undefined)
                            }
                            pitcherThrows={
                                isScoutingMode || gameMode === 'opp_pitcher'
                                    ? (currentOpposingPitcher?.throws as 'R' | 'L' | undefined)
                                    : (currentPitcher?.player?.throws as 'R' | 'L' | undefined)
                            }
                        />
                        {!isReadOnly && renderActualEqualsTargetButton()}
                        {renderPitchBreakdown()}
                        {/* Send Call (optional, setting-gated) */}
                        {!isReadOnly &&
                            !isScoutingMode &&
                            pitchCallingEnabled &&
                            selectedPitchType &&
                            targetZone &&
                            !activeCall && (
                                <View style={[styles.callRow, { marginTop: 8 }]}>
                                    <Button
                                        mode="contained"
                                        onPress={handleSendCall}
                                        loading={sendingCall}
                                        disabled={sendingCall}
                                        style={styles.sendCallButton}
                                        labelStyle={{ color: colors.primary[900], fontWeight: '800', letterSpacing: 0.5 }}
                                    >
                                        {sendingCall
                                            ? 'SENDING...'
                                            : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                                    </Button>
                                    <Pressable
                                        style={[styles.talkHoldButton, walkieTalkieActive && styles.talkHoldButtonActive]}
                                        onPressIn={handleTalkPressIn}
                                        onPressOut={handleTalkPressOut}
                                    >
                                        <Text style={[styles.talkHoldIcon, walkieTalkieActive && styles.talkHoldIconActive]}>
                                            🎙
                                        </Text>
                                        <Text style={[styles.talkHoldLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                            {walkieTalkieActive ? 'TALKING...' : 'Hold to Talk'}
                                        </Text>
                                    </Pressable>
                                </View>
                            )}
                        {!isReadOnly && !isScoutingMode && pitchCallingEnabled && activeCall && (
                            <View style={styles.callBadge}>
                                <Text style={styles.callBadgeText}>
                                    Call Sent: {activeCall.pitch_type} → {PITCH_CALL_ZONE_LABELS[activeCall.zone]}
                                </Text>
                                <View style={styles.callActions}>
                                    <Button
                                        mode="contained"
                                        onPress={handleResendCall}
                                        compact
                                        style={{ backgroundColor: colors.amber[500] }}
                                        labelStyle={{ color: colors.primary[900], fontWeight: '700', fontSize: 12 }}
                                    >
                                        Re-send
                                    </Button>
                                    <Button mode="outlined" onPress={handleChangeCall} compact labelStyle={{ fontSize: 12 }}>
                                        Change
                                    </Button>
                                    <Pressable
                                        style={[styles.talkHoldSmall, walkieTalkieActive && styles.talkHoldButtonActive]}
                                        onPressIn={handleTalkPressIn}
                                        onPressOut={handleTalkPressOut}
                                    >
                                        <Text style={[styles.talkHoldSmallLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                            {walkieTalkieActive ? '🎙 TALKING...' : '🎙 Hold to Talk'}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                        {/* Velocity (optional, setting-gated) — before Result so it's entered before the pitch is logged */}
                        {!isReadOnly && velocityEnabled && (
                            <View style={styles.veloRow}>
                                <Text style={styles.veloLabel}>MPH</Text>
                                <TextInput
                                    style={styles.veloInput}
                                    value={velocity}
                                    onChangeText={setVelocity}
                                    keyboardType="numeric"
                                    placeholder="—"
                                    placeholderTextColor={colors.gray[400]}
                                    maxLength={3}
                                    selectTextOnFocus
                                />
                                {radarEnabled && <RadarStatusPill status={radar.status} lastVelocity={radar.lastVelocity} />}
                            </View>
                        )}
                        {!isReadOnly && (
                            <View style={styles.controlsRow}>
                                <View style={styles.controlsHalf}>
                                    <PitchTypeGrid
                                        selectedType={selectedPitchType}
                                        onSelect={setSelectedPitchType}
                                        availablePitchTypes={
                                            gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0
                                                ? pitcherPitchTypes
                                                : undefined
                                        }
                                        disabled={isLogging}
                                    />
                                </View>
                                <View style={styles.controlsHalf}>
                                    <ResultButtons
                                        selectedResult={selectedResult}
                                        onSelect={(r) => {
                                            setSelectedResult(r);
                                            handleLogPitch(r);
                                        }}
                                        disabled={isLogging}
                                    />
                                </View>
                            </View>
                        )}
                        {!isReadOnly && !isScoutingMode && pitchCallingEnabled && (
                            <View style={styles.shakeRow}>
                                <TouchableOpacity
                                    onPress={handleShake}
                                    style={[styles.shakeBtn, { backgroundColor: theme.colors.surface }]}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.shakeBtnText}>SHAKE</Text>
                                    {pendingShakeCount > 0 && (
                                        <View style={styles.shakeBadge}>
                                            <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        {!isReadOnly && pitches.length > 0 && !isLogging && (
                            <View style={styles.logRow}>
                                <Button
                                    mode="outlined"
                                    onPress={handleUndoLastPitch}
                                    style={styles.undoButton}
                                    contentStyle={styles.logButtonContent}
                                    textColor={colors.red[700]}
                                    icon="undo"
                                >
                                    Undo
                                </Button>
                            </View>
                        )}
                        {!isReadOnly && hasPreviousAtBats && (
                            <Button
                                mode="outlined"
                                onPress={() => setShowPreviousAtBats(true)}
                                style={styles.previousAtBatsButton}
                                icon="history"
                            >
                                Previous At-Bats ({previousAtBatsForCurrentBatter.length})
                            </Button>
                        )}
                    </ScrollView>
                </View>
                {renderModals()}
                <PreviousAtBatsModal
                    visible={showPreviousAtBats}
                    onClose={() => setShowPreviousAtBats(false)}
                    batterName={currentBatter?.player_name || ''}
                    completedAtBats={previousAtBatsForCurrentBatter}
                />
                <InPlayModal visible={showInPlayModal} onDismiss={() => setShowInPlayModal(false)} onResult={handleInPlayResult} />
                <EditResultModal
                    visible={editResultModalVisible}
                    currentResult={editResultPitch?.result}
                    onDismiss={() => setEditResultModalVisible(false)}
                    onSelect={handleEditLastPitchResult}
                />
                {id && (
                    <BatterBreakdownSheet
                        visible={showBreakdown}
                        gameId={id}
                        currentBatterId={currentBatter?.id}
                        currentBatterName={currentBatter?.player_name}
                        onClose={() => setShowBreakdown(false)}
                    />
                )}
            </SafeAreaView>
        );
    }

    // Phone/tablet portrait layout
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <View style={styles.headerCenter}>
                    <Text variant="titleLarge">Live Game</Text>
                    <SyncStatusBadge compact />
                </View>
                <View style={styles.headerRight}>
                    {game.home_team_id && (
                        <IconButton
                            icon="clipboard-text"
                            onPress={async () => {
                                try {
                                    const existing = await scoutingReportsApi.getByGameId(id!);
                                    if (existing) {
                                        router.push(`/team/${game.home_team_id}/scouting/${existing.id}` as any);
                                    } else {
                                        router.push(`/team/${game.home_team_id}/scouting` as any);
                                    }
                                } catch {
                                    router.push(`/team/${game.home_team_id}/scouting` as any);
                                }
                            }}
                        />
                    )}
                    {game.status === 'in_progress' ? (
                        <IconButton icon="flag-checkered" onPress={handleEndGame} />
                    ) : (
                        <View style={{ width: 48 }} />
                    )}
                </View>
            </View>
            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                {renderGameHeader()}
                {game.charting_mode !== 'our_pitcher' &&
                    !isScoutingMode &&
                    myTeamLineup.length === 0 &&
                    game.status === 'in_progress' && (
                        <View style={styles.lineupBanner}>
                            <Text style={styles.lineupBannerText}>My team lineup not set</Text>
                            <Button
                                mode="contained"
                                compact
                                onPress={() => router.push(`/game/${id}/my-lineup?from=live` as any)}
                                style={styles.lineupBannerBtn}
                            >
                                Set Lineup
                            </Button>
                        </View>
                    )}
                {renderRunnerOutButton()}
                {renderAtBatControls()}
                {/* 1. Pitch Type */}
                {!isReadOnly && (
                    <PitchTypeGrid
                        selectedType={selectedPitchType}
                        onSelect={setSelectedPitchType}
                        availablePitchTypes={
                            gameMode !== 'opp_pitcher' && pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined
                        }
                        disabled={isLogging}
                        compact
                    />
                )}
                {/* 2. Strike Zone (1st tap = target zone, 2nd tap = actual location) */}
                {renderPitchTypeFilterBar()}
                {!isReadOnly && renderZoneTapHint()}
                <StrikeZone
                    onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetZoneSelect={setTargetZone}
                    onTargetClear={() => {
                        setTargetZone(null);
                        setPitchLocation(null);
                    }}
                    targetZone={targetZone}
                    previousPitches={isReadOnly ? filteredGamePitches : pitches}
                    disabled={isReadOnly || isLogging}
                    compact
                    colorBy={isReadOnly ? 'pitchType' : 'result'}
                    batterSide={
                        !isScoutingMode && gameMode === 'opp_pitcher'
                            ? (currentMyBatter?.player?.bats as 'R' | 'L' | 'S' | undefined)
                            : (currentBatter?.bats as 'R' | 'L' | 'S' | undefined)
                    }
                    pitcherThrows={
                        isScoutingMode || gameMode === 'opp_pitcher'
                            ? (currentOpposingPitcher?.throws as 'R' | 'L' | undefined)
                            : (currentPitcher?.player?.throws as 'R' | 'L' | undefined)
                    }
                />
                {!isReadOnly && renderActualEqualsTargetButton()}
                {renderPitchBreakdown()}
                {/*
                    Phone tap-zone order (UX-LG-07 reorder):
                    StrikeZone (above) -> Send Call (contextual, only when pitch type+zone set) ->
                    Velocity (only if enabled) -> ResultButtons -> Shake (calling only, moved below) -> Undo.

                    SendCall + Velocity have to stay above ResultButtons because tapping a result
                    auto-logs the pitch. Shake is between pitches, not in the per-pitch tap path,
                    so it moves below Result to tighten the zone -> result distance.
                */}
                {/* Pitch Calling — SEND row (only when pitch type+zone set but no call sent yet) */}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                    <View style={styles.callRow}>
                        <Button
                            mode="contained"
                            onPress={handleSendCall}
                            loading={sendingCall}
                            disabled={sendingCall}
                            style={styles.sendCallButton}
                            labelStyle={{ color: colors.primary[900], fontWeight: '800', letterSpacing: 0.5 }}
                        >
                            {sendingCall
                                ? 'SENDING...'
                                : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                        </Button>
                        <Pressable
                            style={[styles.talkHoldButton, walkieTalkieActive && styles.talkHoldButtonActive]}
                            onPressIn={handleTalkPressIn}
                            onPressOut={handleTalkPressOut}
                        >
                            <Text style={[styles.talkHoldIcon, walkieTalkieActive && styles.talkHoldIconActive]}>🎙</Text>
                            <Text style={[styles.talkHoldLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                {walkieTalkieActive ? 'TALKING...' : 'Hold to Talk'}
                            </Text>
                        </Pressable>
                    </View>
                )}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && activeCall && (
                    <View style={styles.callBadge}>
                        <Text style={styles.callBadgeText}>
                            Call Sent: {activeCall.pitch_type} → {PITCH_CALL_ZONE_LABELS[activeCall.zone]}
                        </Text>
                        <View style={styles.callActions}>
                            <Button
                                mode="contained"
                                onPress={handleResendCall}
                                compact
                                style={{ backgroundColor: colors.amber[500] }}
                                labelStyle={{ color: colors.primary[900], fontWeight: '700', fontSize: 12 }}
                            >
                                Re-send
                            </Button>
                            <Button mode="outlined" onPress={handleChangeCall} compact labelStyle={{ fontSize: 12 }}>
                                Change
                            </Button>
                            <Pressable
                                style={[styles.talkHoldSmall, walkieTalkieActive && styles.talkHoldButtonActive]}
                                onPressIn={handleTalkPressIn}
                                onPressOut={handleTalkPressOut}
                            >
                                <Text style={[styles.talkHoldSmallLabel, walkieTalkieActive && styles.talkHoldLabelActive]}>
                                    {walkieTalkieActive ? '🎙 TALKING...' : '🎙 Hold to Talk'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}
                {/* Velocity (optional, setting-gated) — must stay above Result; result-tap logs the pitch */}
                {!isReadOnly && velocityEnabled && (
                    <View style={styles.veloRow}>
                        <Text style={styles.veloLabel}>MPH</Text>
                        <TextInput
                            style={styles.veloInput}
                            value={velocity}
                            onChangeText={setVelocity}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor={colors.gray[400]}
                            maxLength={3}
                            selectTextOnFocus
                        />
                        {radarEnabled && <RadarStatusPill status={radar.status} lastVelocity={radar.lastVelocity} />}
                    </View>
                )}
                {/* Result — tapping a result logs the pitch. Sits as close to the StrikeZone as possible. */}
                {!isReadOnly && (
                    <ResultButtons
                        selectedResult={selectedResult}
                        onSelect={(r) => {
                            setSelectedResult(r);
                            handleLogPitch(r);
                        }}
                        disabled={isLogging}
                        compact
                    />
                )}
                {/* Shake — used between pitches, not in per-pitch tap path. Below Result. */}
                {!isReadOnly && !isScoutingMode && pitchCallingEnabled && (
                    <View style={styles.shakeRow}>
                        <TouchableOpacity
                            onPress={handleShake}
                            style={[styles.shakeBtn, { backgroundColor: theme.colors.surface }]}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.shakeBtnText}>SHAKE</Text>
                            {pendingShakeCount > 0 && (
                                <View style={styles.shakeBadge}>
                                    <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {/* Undo */}
                {!isReadOnly && pitches.length > 0 && !isLogging && (
                    <View style={styles.logRow}>
                        <Button
                            mode="outlined"
                            onPress={handleUndoLastPitch}
                            style={styles.undoButton}
                            contentStyle={styles.logButtonContent}
                            textColor={colors.red[700]}
                            icon="undo"
                        >
                            Undo
                        </Button>
                    </View>
                )}
                {/* 7. Previous At-Bats (hidden on first at-bat) */}
                {!isReadOnly && hasPreviousAtBats && (
                    <Button
                        mode="outlined"
                        onPress={() => setShowPreviousAtBats(true)}
                        style={styles.previousAtBatsButton}
                        icon="history"
                    >
                        Previous At-Bats ({previousAtBatsForCurrentBatter.length})
                    </Button>
                )}
            </ScrollView>
            {renderModals()}
            <PreviousAtBatsModal
                visible={showPreviousAtBats}
                onClose={() => setShowPreviousAtBats(false)}
                batterName={currentBatter?.player_name || ''}
                completedAtBats={previousAtBatsForCurrentBatter}
            />
            <InPlayModal visible={showInPlayModal} onDismiss={() => setShowInPlayModal(false)} onResult={handleInPlayResult} />
            <EditResultModal
                visible={editResultModalVisible}
                currentResult={editResultPitch?.result}
                onDismiss={() => setEditResultModalVisible(false)}
                onSelect={handleEditLastPitchResult}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    tabletContent: { flex: 1, flexDirection: 'row' },
    statsPanel: { width: 320, borderRightWidth: 1, borderRightColor: 'rgba(128,128,128,0.25)', padding: 16 },
    statsPlaceholder: { marginTop: 16 },
    mainPanel: { flex: 1 },
    mainPanelContent: { padding: 16 },
    controlsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    controlsHalf: { flex: 1 },
    phoneContent: { flex: 1 },
    phoneContentInner: { padding: 10, gap: 8 },
    placeholder: { marginTop: 4, opacity: 0.7 },
    logButton: { marginTop: 4 },
    logRow: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
    undoButton: { borderColor: colors.red[700] },
    logButtonContent: { paddingVertical: 6 },
    previousAtBatsButton: { marginTop: 8 },
    zoneHint: { fontSize: 12, opacity: 0.75, marginBottom: 4, marginTop: 2 },
    zoneHintBold: { fontWeight: '700' },
    zoneHintReady: { color: colors.green[600] },
    actualEqualsTargetButton: { marginTop: 4 },
    startAtBatButton: { marginTop: 6 },
    selectPrompt: { marginTop: 6, padding: 12, backgroundColor: semantic.warningBg, borderRadius: 8, alignItems: 'center' },
    selectPromptText: { color: semantic.warningText, fontSize: 14, fontWeight: '500' },
    runnerActionRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6, flexWrap: 'wrap' as const },
    runnerOutButton: { alignSelf: 'flex-start' },
    tendenciesRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6 },
    tendencyBtn: { flex: 1 },
    tendencyBtnHitter: { borderColor: colors.green[600] },
    tendencyBtnLabel: { fontSize: 11 },
    tendencyBtnLabelHitter: { color: colors.green[600] },
    callRow: {
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'stretch' as const,
    },
    sendCallButton: {
        flex: 1,
        backgroundColor: colors.amber[500],
    },
    talkHoldButton: {
        borderWidth: 2,
        borderColor: colors.purple[600],
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 2,
    },
    talkHoldButtonActive: {
        borderColor: colors.red[500],
        backgroundColor: 'rgba(239, 68, 68, 0.13)',
    },
    talkHoldIcon: {
        fontSize: 16,
    },
    talkHoldIconActive: {},
    talkHoldLabel: {
        fontSize: 9,
        fontWeight: '700' as const,
        color: colors.purple[600],
    },
    talkHoldLabelActive: {
        color: colors.red[500],
    },
    talkHoldSmall: {
        borderWidth: 1,
        borderColor: colors.purple[600],
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    talkHoldSmallLabel: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: colors.purple[600],
    },
    callBadge: {
        backgroundColor: semantic.successBg,
        borderWidth: 1,
        borderColor: semantic.successBorder,
        borderRadius: 8,
        padding: 8,
        alignItems: 'center' as const,
    },
    callBadgeText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: semantic.successText,
    },
    callActions: {
        flexDirection: 'row' as const,
        gap: 8,
        marginTop: 6,
    },
    shakeRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 4,
        borderTopWidth: 1,
        borderTopColor: colors.gray[200],
        marginTop: 4,
    },
    shakeBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.amber[600],
    },
    shakeBtnText: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: colors.amber[600],
    },
    shakeBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.amber[600],
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    shakeBadgeText: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: '700' as const,
    },
    veloRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    veloLabel: {
        fontSize: 13,
        fontWeight: '600' as const,
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    veloInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.4)',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600' as const,
        textAlign: 'center' as const,
    },
    pitchFilterBar: {
        flexDirection: 'row' as const,
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 6,
    },
    pitchFilterChip: {},
    pitchFilterChipText: {
        fontSize: 12,
    },
    pitchFilterChipTextActive: {
        fontSize: 12,
        color: '#ffffff',
    },
    breakdownTable: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.25)',
        overflow: 'hidden' as const,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700' as const,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.25)',
    },
    breakdownRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    breakdownHeaderText: {
        fontSize: 11,
        fontWeight: '700' as const,
        opacity: 0.7,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    breakdownTypeCell: {
        flex: 2,
        fontSize: 13,
    },
    breakdownNumCell: {
        flex: 1,
        fontSize: 13,
        textAlign: 'center' as const,
    },
    breakdownText: {
        fontSize: 13,
    },
    typeColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    breakdownTotalRow: {
        borderBottomWidth: 0,
    },
    breakdownTotalText: {
        fontSize: 13,
        fontWeight: '700' as const,
    },
    roleSelectContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    roleSelectTitle: {
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    roleSelectSubtitle: {
        marginBottom: 32,
        textAlign: 'center',
    },
    roleSelectButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    roleButton: {
        minWidth: 120,
    },
    lineupBanner: {
        flexDirection: 'row' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: semantic.warningBg,
        borderWidth: 1,
        borderColor: semantic.warningBorder,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
    },
    lineupBannerText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: semantic.warningText,
        flex: 1,
    },
    lineupBannerBtn: {
        backgroundColor: colors.amber[600],
    },
});
