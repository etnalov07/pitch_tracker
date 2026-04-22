import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput, Pressable, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, IconButton, Portal, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import {
    Pitch,
    PitchType,
    PitchResult,
    PitchCall,
    PitchCallAbbrev,
    PitchCallZone,
    PITCH_CALL_ZONE_LABELS,
    PITCH_CALL_ZONE_COORDS,
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
} from '@pitch-tracker/shared';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { pitchCallingApi } from '../../../src/state/pitchCalling/api/pitchCallingApi';
import scoutingReportsApi from '../../../src/state/scouting/api/scoutingReportsApi';
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
    InningChangeModal,
    TeamAtBatModal,
    BaserunnerOutModal,
    PickoffModal,
    RunnerAdvancementModal,
    PreviousAtBatsModal,
    PitcherTendenciesModal,
    HitterTendenciesModal,
} from '../../../src/components/live';
import OpposingPitcherModal from '../../../src/components/live/OpposingPitcherModal';
import CountBreakdownModal from '../../../src/components/live/CountBreakdownModal';
import type { CompletedAtBatEntry } from '../../../src/components/live';
import { SyncStatusBadge, LoadingScreen, ErrorScreen } from '../../../src/components/common';
import { HitLocation } from '../../../src/components/live/InPlayModal';

export default function LiveGameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
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

    // Local state for pitch entry
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [selectedResult, setSelectedResult] = useState<PitchResult | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetZone, setTargetZone] = useState<PitchCallZone | null>(null);
    const [isLogging, setIsLogging] = useState(false);

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

    // Base runner modals state
    const [showBaserunnerOutModal, setShowBaserunnerOutModal] = useState(false);
    const [preSelectedRunnerBase, setPreSelectedRunnerBase] = useState<RunnerBase | null>(null);
    const [showPickoffModal, setShowPickoffModal] = useState(false);
    const [showRunnerAdvancementModal, setShowRunnerAdvancementModal] = useState(false);
    const [pendingHitResult, setPendingHitResult] = useState<string | null>(null);

    // Team at bat modal state (visitor games)
    const [showTeamAtBat, setShowTeamAtBat] = useState(false);
    const [teamAtBatRuns, setTeamAtBatRuns] = useState('0');

    // Previous at-bats tracking (keyed by opponent_batter_id)
    const [completedAtBatsByBatter, setCompletedAtBatsByBatter] = useState<Record<string, CompletedAtBatEntry[]>>({});
    const [showPreviousAtBats, setShowPreviousAtBats] = useState(false);

    // Running game pitch count (seeded from game data, incremented on each logged pitch)
    const [totalPitchCount, setTotalPitchCount] = useState(0);

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
    const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

    // Settings
    const { pitchCallingEnabled, velocityEnabled } = useAppSelector((state) => state.settings);

    const game = currentGameState?.game || selectedGame;
    const gameMode: GameMode = game ? deriveGameMode(game.is_home_game ?? true, game.inning_half) : 'our_pitcher';

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

    const activeBatters = opponentLineup.filter((b) => !b.replaced_by_id).sort((a, b) => a.batting_order - b.batting_order);
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
            dispatch(fetchMyTeamLineup(id));
            dispatch(fetchBaseRunners(id));
            dispatch(fetchOpposingPitchers(id));
            gamesApi
                .getGamePitches(id)
                .then(setAllGamePitches)
                .catch(() => setAllGamePitches([]));
        }
    }, [id, dispatch]);

    useEffect(() => {
        if (game?.home_team_id) {
            dispatch(fetchTeamPlayers(game.home_team_id));
            dispatch(fetchTeamPitcherRoster(game.home_team_id));
        }
    }, [game?.home_team_id, dispatch]);

    // Seed pitch count from game data on load (only once when game first loads)
    useEffect(() => {
        if (game?.total_pitches != null) {
            setTotalPitchCount(game.total_pitches);
        }
    }, [game?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // except when charting_mode is 'both' — in that mode we chart at-bats directly.
    const isUserBatting = game && game.status === 'in_progress' && !game.is_home_game && game.inning_half === 'top';
    useEffect(() => {
        if (isUserBatting && !showInningChange && game?.charting_mode !== 'both') {
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

    // Start at-bat for a specific batter
    const startAtBatForBatter = useCallback(
        async (batter: OpponentLineupPlayer, outs: number, inning: Inning | null): Promise<boolean> => {
            if (!id || !currentPitcher || !inning) return false;
            try {
                await dispatch(
                    createAtBat({
                        game_id: id,
                        inning_id: inning.id,
                        opponent_batter_id: batter.id,
                        pitcher_id: currentPitcher.player_id,
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
        [id, currentPitcher, dispatch]
    );

    const advanceInningWithRuns = useCallback(
        async (runs: number) => {
            if (!id || !game) return;
            try {
                const newAwayScore = (game.away_score || 0) + runs;
                const homeScore = game.home_score || 0;
                const isHomeGame = game.is_home_game !== false;
                const totalInnings = game.total_innings ?? 7;
                const isLastInningOrLater = game.current_inning >= totalInnings;

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

                if (game.is_home_game === false || game.charting_mode === 'both') {
                    // Visitor game or both-team mode: advance 1 half to user's batting half
                    await gamesApi.advanceInning(id);
                } else {
                    // Home game (single-team): skip user's batting half entirely (advance 2)
                    await gamesApi.advanceInning(id);
                    await gamesApi.advanceInning(id);
                }

                dispatch(setBaseRunners(clearBases()));
                dispatch(fetchGameById(id));
                const newInning = await gamesApi.getCurrentInning(id);
                setShowInningChange(false);

                if (game.is_home_game !== false && game.charting_mode !== 'both') {
                    // Home game single-team mode: set up next opponent batter immediately
                    const nextOrder = currentBattingOrder >= lineupSize ? 1 : currentBattingOrder + 1;
                    setCurrentBattingOrder(nextOrder);
                    const firstBatter = activeBatters.find((p) => p.batting_order === nextOrder);
                    if (firstBatter && newInning) {
                        setCurrentBatter(firstBatter);
                        await startAtBatForBatter(firstBatter, 0, newInning);
                        dispatch(fetchCurrentInning(id));
                    } else {
                        setCurrentBatter(null);
                        dispatch(fetchCurrentInning(id));
                    }
                } else {
                    // In 'both' mode or visitor games, game mode switches automatically on re-render.
                    // Re-fetch opposing pitcher + my lineup so they auto-populate on the batting half.
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                Alert.alert('Error', 'Failed to advance inning');
            }
        },
        [id, game, currentBattingOrder, activeBatters, lineupSize, dispatch, startAtBatForBatter, router]
    );

    const handleEndAtBat = useCallback(
        async (result: string, finalPitch?: Partial<Pitch>, extra?: { rbi?: number; runs_scored?: number }) => {
            if (!currentAtBat) return;
            try {
                // Capture before clearing; append finalPitch if provided (covers stale-closure case
                // where the last pitch was just dispatched but Redux state hasn't re-rendered yet)
                const endedAtBat = currentAtBat;
                const endedPitches = finalPitch ? [...pitches, finalPitch as Pitch] : [...pitches];
                const endedBatterId = currentBatter?.id;

                const outsFromPlay = getOutsForResult(result);
                const newOutCount = currentOuts + outsFromPlay;
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
                    if (game?.charting_mode === 'both') {
                        await advanceInningWithRuns(0);
                    } else {
                        setTeamRunsScored('0');
                        setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                        setShowInningChange(true);
                    }
                } else {
                    if (outsFromPlay > 0) setCurrentOuts(newOutCount);
                    const nextOrder = currentBattingOrder >= lineupSize ? 1 : currentBattingOrder + 1;
                    setCurrentBattingOrder(nextOrder);
                    const nextBatter = activeBatters.find((p) => p.batting_order === nextOrder);
                    if (nextBatter) {
                        setCurrentBatter(nextBatter);
                        await startAtBatForBatter(nextBatter, outsFromPlay > 0 ? newOutCount : currentOuts, currentInning);
                    } else {
                        setCurrentBatter(null);
                    }
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                Alert.alert('Error', 'Failed to end at-bat');
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
            dispatch,
            startAtBatForBatter,
            advanceInningWithRuns,
        ]
    );

    const handleInningChangeConfirm = useCallback(async () => {
        await advanceInningWithRuns(parseInt(teamRunsScored, 10) || 0);
    }, [advanceInningWithRuns, teamRunsScored]);

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
            dispatch(fetchGameById(id));
            const newInning = await gamesApi.getCurrentInning(id);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            // Set up next opponent batter
            const nextOrder = currentBattingOrder >= lineupSize ? 1 : currentBattingOrder + 1;
            setCurrentBattingOrder(nextOrder);
            const firstBatter = activeBatters.find((p) => p.batting_order === nextOrder);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
                dispatch(fetchCurrentInning(id));
            } else {
                setCurrentBatter(null);
                dispatch(fetchCurrentInning(id));
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to advance inning');
        }
    }, [id, game, teamAtBatRuns, currentBattingOrder, activeBatters, lineupSize, dispatch, startAtBatForBatter, router]);

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
            Alert.alert('Error', 'Failed to change pitcher');
        }
    };

    const handleSelectBatter = (batter: OpponentLineupPlayer) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentBatter(batter);
        setCurrentBattingOrder(batter.batting_order);
        setBatterModalVisible(false);
    };

    const handleEndGame = useCallback(() => {
        if (!id || !game) return;
        Alert.alert('End Game', 'Are you sure you want to end this game? This will mark it as completed.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'End Game',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await gamesApi.endGame(id, { home_score: game.home_score || 0, away_score: game.away_score || 0 });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        router.back();
                    } catch {
                        Alert.alert('Error', 'Failed to end game');
                    }
                },
            },
        ]);
    }, [id, game, router]);

    const handleToggleHomeAway = useCallback(async () => {
        if (!id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await dispatch(toggleHomeAway(id));
    }, [id, dispatch]);

    const handleStartAtBat = useCallback(async () => {
        if (!id || !currentInning) return;
        try {
            if (gameMode === 'opp_pitcher') {
                if (!currentOpposingPitcher || !currentMyBatter) return;
                const batterId = currentMyBatter.player_id ?? currentMyBatter.player?.id;
                if (!batterId) {
                    Alert.alert('Error', 'Batter player record not found. Please re-select the batter.');
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
            Alert.alert('Error', 'Failed to create at-bat. You can still log pitches offline.');
        }
    }, [
        gameMode,
        currentPitcher,
        currentBatter,
        currentOpposingPitcher,
        currentMyBatter,
        id,
        currentInning,
        currentOuts,
        dispatch,
    ]);

    // Map PitchType to PitchCallAbbrev
    const toPitchCallAbbrev = (pt: string): PitchCallAbbrev => {
        const map: Record<string, PitchCallAbbrev> = {
            fastball: 'FB',
            '4-seam': 'FB',
            '2-seam': '2S',
            cutter: 'CT',
            sinker: '2S',
            slider: 'SL',
            curveball: 'CB',
            changeup: 'CH',
            splitter: 'CH',
            knuckleball: 'CB',
            other: 'FB',
        };
        return map[pt] || 'FB';
    };

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
            Alert.alert('Error', 'Failed to send pitch call');
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
            Alert.alert('Error', 'Failed to re-send call');
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
            Alert.alert('Mic Error', err?.message || 'Failed to start walkie-talkie');
        }
    };

    const handleTalkPressOut = async () => {
        if (isPassthroughActive()) {
            await stopPassthrough();
            setWalkieTalkieActive(false);
        }
    };

    const handleLogPitch = async () => {
        if (!selectedPitchType || !selectedResult || !pitchLocation) {
            Alert.alert('Missing Info', 'Please select pitch type, location, and result');
            return;
        }
        if (gameMode === 'our_pitcher' && !currentPitcher) {
            Alert.alert('No Pitcher', 'Please select a pitcher first');
            return;
        }
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const veloNum = velocity ? parseFloat(velocity) : undefined;
            const result = await logPitchOffline({
                at_bat_id: currentAtBat?.id || '',
                game_id: id!,
                pitcher_id: gameMode === 'our_pitcher' ? currentPitcher?.player_id : undefined,
                pitch_type: selectedPitchType,
                pitch_result: selectedResult,
                location_x: pitchLocation.x,
                location_y: pitchLocation.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                target_zone: targetZone ?? undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                batter_id: gameMode === 'opp_pitcher' ? (currentMyBatter?.player_id ?? currentMyBatter?.player?.id) : undefined,
                opponent_batter_id: gameMode === 'our_pitcher' ? currentBatter?.id : undefined,
                balls_before: balls,
                strikes_before: strikes,
                team_side: gameMode === 'our_pitcher' ? 'our_team' : 'opponent',
            });
            if (!result.success) {
                Alert.alert('Error', 'Failed to log pitch');
                return;
            }
            setTotalPitchCount((prev) => prev + 1);
            setStatsRefreshTrigger((prev) => prev + 1);
            const newBalls = balls + (selectedResult === 'ball' ? 1 : 0);
            const newStrikes =
                effectiveStrikes +
                (selectedResult === 'called_strike' || selectedResult === 'swinging_strike'
                    ? 1
                    : selectedResult === 'foul' && effectiveStrikes < 2
                      ? 1
                      : 0);
            // Log result on active pitch call
            if (activeCall) {
                const callResult =
                    selectedResult === 'called_strike' || selectedResult === 'swinging_strike'
                        ? 'strike'
                        : selectedResult === 'hit_by_pitch'
                          ? 'ball'
                          : (selectedResult as 'ball' | 'foul' | 'in_play');
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
                pitch_type: selectedPitchType!,
                pitch_result: selectedResult!,
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
            if (result.queued) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (newBalls >= 4) await handleEndAtBat('walk', finalPitch);
            else if (newStrikes >= 3) {
                // MLB rule: batter can reach on an uncaught third strike only when 1st base
                // is unoccupied, OR when there are 2 outs. Prompt the user to distinguish.
                const canDropThird = !baseRunners.first || currentOuts >= 2;
                if (canDropThird) {
                    Alert.alert('Third strike', 'Was the third strike dropped?', [
                        { text: 'No', style: 'cancel', onPress: () => handleEndAtBat('strikeout', finalPitch) },
                        {
                            text: 'Yes',
                            onPress: () => {
                                // Show runner advancement for the dropped K3. The suggested
                                // advancement places the batter on 1st and force-advances runners.
                                setPendingHitResult('strikeout_dropped');
                                setShowRunnerAdvancementModal(true);
                            },
                        },
                    ]);
                } else {
                    await handleEndAtBat('strikeout', finalPitch);
                }
            } else if (selectedResult === 'in_play') setShowInPlayModal(true);
        } catch {
            Alert.alert('Error', 'Failed to log pitch');
        } finally {
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
            const hitResults = ['single', 'double', 'triple', 'home_run', 'walk', 'hit_by_pitch', 'sacrifice_fly'];
            const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
            if (hitResults.includes(result) && hasRunnersOnBase) {
                setPendingHitResult(result);
                setShowRunnerAdvancementModal(true);
            } else if (hitResults.includes(result)) {
                // No runners on base, just apply standard advancement
                const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, result);
                dispatch(setBaseRunners(suggestedRunners));
                if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                await handleEndAtBat(result, undefined, { rbi: suggestedRuns, runs_scored: suggestedRuns });
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
        [handleEndAtBat, baseRunners, id, dispatch, currentAtBat, pitches]
    );

    const handleRunnerAdvancementConfirm = useCallback(
        async (newRunners: BaseRunners, runsScored: number) => {
            if (!pendingHitResult) return;
            dispatch(setBaseRunners(newRunners));
            if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: newRunners }));
            // Runs scored while our team is pitching go to opponent (away_score)
            if (runsScored > 0 && game) {
                await gamesApi.updateScore(id, game.home_score || 0, (game.away_score || 0) + runsScored);
                dispatch(fetchGameById(id));
            }
            setShowRunnerAdvancementModal(false);
            // Credit the batter with an RBI for each run scored on the play (sac fly, hit, etc.).
            // Walks/HBPs also legitimately credit forced runs.
            await handleEndAtBat(pendingHitResult, undefined, { rbi: runsScored, runs_scored: runsScored });
            setPendingHitResult(null);
        },
        [pendingHitResult, id, game, dispatch, handleEndAtBat]
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
                    if (game?.charting_mode === 'both') {
                        await advanceInningWithRuns(0);
                    } else {
                        setTeamRunsScored('0');
                        setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                        setShowInningChange(true);
                    }
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                Alert.alert('Error', 'Failed to record baserunner out');
            }
        },
        [id, currentInning, currentAtBat, currentOuts, game, dispatch, baseRunners, advanceInningWithRuns]
    );

    const handleRunnerPress = useCallback(
        (base: RunnerBase) => {
            if (baseRunners[base]) {
                setPreSelectedRunnerBase(base);
                setShowBaserunnerOutModal(true);
            }
        },
        [baseRunners]
    );

    const canLogPitch = selectedPitchType && selectedResult && pitchLocation && !isLogging;
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
                    <Text variant="bodyMedium" style={styles.roleSelectSubtitle}>
                        Select your role for this session
                    </Text>
                    <View style={styles.roleSelectButtons}>
                        <Button mode="contained" onPress={() => dispatch(setCurrentGameRole('charter'))} style={styles.roleButton}>
                            Charter
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={() => {
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
                    style={[styles.pitchFilterChip, pitchTypeFilter === 'all' && styles.pitchFilterChipActive]}
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
                            pitchTypeFilter === type && { backgroundColor: PITCH_TYPE_COLORS[type] ?? '#6b7280' },
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
            <View style={styles.breakdownTable}>
                <Text style={styles.breakdownTitle}>Pitch Breakdown</Text>
                <View style={[styles.breakdownRow, styles.breakdownHeader]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownHeaderText]}>Type</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>#</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>K</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>B</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownHeaderText]}>%</Text>
                </View>
                {entries.map(([type, stats]) => (
                    <View key={type} style={styles.breakdownRow}>
                        <View style={[styles.breakdownTypeCell, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                            <View style={[styles.typeColorDot, { backgroundColor: PITCH_TYPE_COLORS[type] ?? '#9ca3af' }]} />
                            <Text style={styles.breakdownText}>{PITCH_TYPE_LABELS[type] ?? type}</Text>
                        </View>
                        <Text style={styles.breakdownNumCell}>{stats.count}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.strikes}</Text>
                        <Text style={styles.breakdownNumCell}>{stats.balls}</Text>
                        <Text style={styles.breakdownNumCell}>{Math.round((stats.count / total) * 100)}%</Text>
                    </View>
                ))}
                <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                    <Text style={[styles.breakdownTypeCell, styles.breakdownTotalText]}>Total</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{total}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalStrikes}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>{totalBalls}</Text>
                    <Text style={[styles.breakdownNumCell, styles.breakdownTotalText]}>100%</Text>
                </View>
            </View>
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
            pitchCount={totalPitchCount}
            onPitcherPress={
                game.status === 'in_progress'
                    ? gameMode === 'opp_pitcher'
                        ? () => setShowOpposingPitcherModal(true)
                        : () => setPitcherModalVisible(true)
                    : undefined
            }
            onBatterPress={
                game.status === 'in_progress'
                    ? gameMode === 'opp_pitcher'
                        ? () => setMyBatterModalVisible(true)
                        : () => setBatterModalVisible(true)
                    : undefined
            }
            onRunnerPress={game.status === 'in_progress' ? handleRunnerPress : undefined}
            onSwapPress={!game.total_pitches ? handleToggleHomeAway : undefined}
        />
    );

    const renderAtBatControls = () => {
        if (game.status !== 'in_progress') return null;
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
                        {myTeamLineup.length === 0 && (
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
            />
            {myBatterModalVisible && (
                <View style={styles.myBatterOverlay}>
                    <View style={styles.myBatterModal}>
                        <Text variant="titleMedium" style={{ marginBottom: 12 }}>
                            Select Your Batter
                        </Text>
                        <ScrollView>
                            {myTeamLineup
                                .filter((p) => p.is_starter)
                                .sort((a, b) => a.batting_order - b.batting_order)
                                .map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => {
                                            dispatch(setCurrentMyBatter(p));
                                            setMyBatterModalVisible(false);
                                        }}
                                        style={[styles.myBatterItem, currentMyBatter?.id === p.id && styles.myBatterItemSelected]}
                                    >
                                        <Text style={styles.myBatterOrder}>#{p.batting_order}</Text>
                                        <Text style={styles.myBatterName}>
                                            {p.player
                                                ? `${p.player.first_name} ${p.player.last_name}`
                                                : `Batter ${p.batting_order}`}
                                        </Text>
                                        <Text style={styles.myBatterPos}>{p.position || p.player?.primary_position || ''}</Text>
                                    </TouchableOpacity>
                                ))}
                            {myTeamLineup.length === 0 && (
                                <Text style={{ color: '#6b7280', marginVertical: 16 }}>No lineup set up yet.</Text>
                            )}
                        </ScrollView>
                        <Button onPress={() => setMyBatterModalVisible(false)} style={{ marginTop: 8 }}>
                            Close
                        </Button>
                    </View>
                </View>
            )}
            <InningChangeModal
                visible={showInningChange}
                inningChangeInfo={inningChangeInfo}
                teamRunsScored={teamRunsScored}
                onRunsChange={setTeamRunsScored}
                onConfirm={handleInningChangeConfirm}
                isTablet={isTablet}
            />
            <TeamAtBatModal
                visible={showTeamAtBat}
                inning={game?.current_inning || 1}
                inningHalf={game?.inning_half || 'top'}
                teamRunsScored={teamAtBatRuns}
                onRunsChange={setTeamAtBatRuns}
                onConfirm={handleTeamAtBatConfirm}
                isTablet={isTablet}
            />
            <BaserunnerOutModal
                visible={showBaserunnerOutModal}
                onDismiss={() => {
                    setShowBaserunnerOutModal(false);
                    setPreSelectedRunnerBase(null);
                }}
                runners={baseRunners}
                currentOuts={currentOuts}
                onRecordOut={handleRecordBaserunnerOut}
                preSelectedBase={preSelectedRunnerBase}
            />
            <PickoffModal
                visible={showPickoffModal}
                onDismiss={() => setShowPickoffModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                onRecordPickoff={(runnerBase) => handleRecordBaserunnerOut('pickoff', runnerBase)}
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
        </Portal>
    );

    const previousAtBatsForCurrentBatter = currentBatter ? completedAtBatsByBatter[currentBatter.id] || [] : [];
    const hasPreviousAtBats = previousAtBatsForCurrentBatter.length > 0;

    const renderRunnerOutButton = () => {
        if (game.status !== 'in_progress' || !hasRunnersOnBase) return null;
        return (
            <View style={styles.runnerActionRow}>
                <Button
                    mode="outlined"
                    onPress={() => setShowBaserunnerOutModal(true)}
                    style={styles.runnerOutButton}
                    icon="account-remove"
                    compact
                >
                    Runner Out
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => setShowPickoffModal(true)}
                    style={styles.runnerOutButton}
                    icon="arrow-u-left-top"
                    compact
                >
                    Pickoff
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
                        {game.charting_mode !== 'our_pitcher' && myTeamLineup.length === 0 && game.status === 'in_progress' && (
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
                            batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                            pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                        />
                        {renderPitchBreakdown()}
                        {/* Send Call (optional, setting-gated) */}
                        {!isReadOnly && pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                            <View style={[styles.callRow, { marginTop: 8 }]}>
                                <Button
                                    mode="contained"
                                    onPress={handleSendCall}
                                    loading={sendingCall}
                                    disabled={sendingCall}
                                    style={styles.sendCallButton}
                                    labelStyle={{ color: '#0A1628', fontWeight: '800', letterSpacing: 0.5 }}
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
                        {!isReadOnly && pitchCallingEnabled && activeCall && (
                            <View style={styles.callBadge}>
                                <Text style={styles.callBadgeText}>
                                    Call Sent: {activeCall.pitch_type} → {PITCH_CALL_ZONE_LABELS[activeCall.zone]}
                                </Text>
                                <View style={styles.callActions}>
                                    <Button
                                        mode="contained"
                                        onPress={handleResendCall}
                                        compact
                                        style={{ backgroundColor: '#F5A623' }}
                                        labelStyle={{ color: '#0A1628', fontWeight: '700', fontSize: 12 }}
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
                        {!isReadOnly && (
                            <View style={styles.controlsRow}>
                                <View style={styles.controlsHalf}>
                                    <PitchTypeGrid
                                        selectedType={selectedPitchType}
                                        onSelect={setSelectedPitchType}
                                        availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined}
                                        disabled={isLogging}
                                    />
                                </View>
                                <View style={styles.controlsHalf}>
                                    <ResultButtons
                                        selectedResult={selectedResult}
                                        onSelect={setSelectedResult}
                                        disabled={isLogging}
                                    />
                                </View>
                            </View>
                        )}
                        {!isReadOnly && pitchCallingEnabled && (
                            <View style={styles.shakeRow}>
                                <TouchableOpacity onPress={handleShake} style={styles.shakeBtn} activeOpacity={0.7}>
                                    <Text style={styles.shakeBtnText}>SHAKE</Text>
                                    {pendingShakeCount > 0 && (
                                        <View style={styles.shakeBadge}>
                                            <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        {!isReadOnly && velocityEnabled && (
                            <View style={styles.veloRow}>
                                <Text style={styles.veloLabel}>MPH</Text>
                                <TextInput
                                    style={styles.veloInput}
                                    value={velocity}
                                    onChangeText={setVelocity}
                                    keyboardType="numeric"
                                    placeholder="—"
                                    placeholderTextColor="#9ca3af"
                                    maxLength={3}
                                    selectTextOnFocus
                                />
                            </View>
                        )}
                        {!isReadOnly && (
                            <Button
                                mode="contained"
                                onPress={handleLogPitch}
                                disabled={!canLogPitch}
                                loading={isLogging}
                                style={styles.logButton}
                                contentStyle={styles.logButtonContent}
                            >
                                Log Pitch
                            </Button>
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
                {game.charting_mode !== 'our_pitcher' && myTeamLineup.length === 0 && game.status === 'in_progress' && (
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
                {/* Tendencies buttons */}
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
                                Pitcher Tendencies
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
                                Hitter Tendencies
                            </Button>
                        )}
                    </View>
                )}
                {/* 1. Pitch Type */}
                {!isReadOnly && (
                    <PitchTypeGrid
                        selectedType={selectedPitchType}
                        onSelect={setSelectedPitchType}
                        availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined}
                        disabled={isLogging}
                        compact
                    />
                )}
                {/* 2. Strike Zone (1st tap = target zone, 2nd tap = actual location) */}
                {renderPitchTypeFilterBar()}
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
                    batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                    pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                />
                {renderPitchBreakdown()}
                {/* 3. Pitch Calling (optional, setting-gated) */}
                {!isReadOnly && pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                    <View style={styles.callRow}>
                        <Button
                            mode="contained"
                            onPress={handleSendCall}
                            loading={sendingCall}
                            disabled={sendingCall}
                            style={styles.sendCallButton}
                            labelStyle={{ color: '#0A1628', fontWeight: '800', letterSpacing: 0.5 }}
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
                {!isReadOnly && pitchCallingEnabled && activeCall && (
                    <View style={styles.callBadge}>
                        <Text style={styles.callBadgeText}>
                            Call Sent: {activeCall.pitch_type} → {PITCH_CALL_ZONE_LABELS[activeCall.zone]}
                        </Text>
                        <View style={styles.callActions}>
                            <Button
                                mode="contained"
                                onPress={handleResendCall}
                                compact
                                style={{ backgroundColor: '#F5A623' }}
                                labelStyle={{ color: '#0A1628', fontWeight: '700', fontSize: 12 }}
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
                {/* 3b. Shake button */}
                {!isReadOnly && pitchCallingEnabled && (
                    <View style={styles.shakeRow}>
                        <TouchableOpacity onPress={handleShake} style={styles.shakeBtn} activeOpacity={0.7}>
                            <Text style={styles.shakeBtnText}>SHAKE</Text>
                            {pendingShakeCount > 0 && (
                                <View style={styles.shakeBadge}>
                                    <Text style={styles.shakeBadgeText}>{pendingShakeCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
                {/* 4. Result */}
                {!isReadOnly && (
                    <ResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} compact />
                )}
                {/* 5. Velocity (optional, setting-gated) */}
                {!isReadOnly && velocityEnabled && (
                    <View style={styles.veloRow}>
                        <Text style={styles.veloLabel}>MPH</Text>
                        <TextInput
                            style={styles.veloInput}
                            value={velocity}
                            onChangeText={setVelocity}
                            keyboardType="numeric"
                            placeholder="—"
                            placeholderTextColor="#9ca3af"
                            maxLength={3}
                            selectTextOnFocus
                        />
                    </View>
                )}
                {/* 6. Log Pitch */}
                {!isReadOnly && (
                    <Button
                        mode="contained"
                        onPress={handleLogPitch}
                        disabled={!canLogPitch}
                        loading={isLogging}
                        style={styles.logButton}
                        contentStyle={styles.logButtonContent}
                    >
                        Log Pitch
                    </Button>
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
        borderBottomColor: '#e5e7eb',
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    tabletContent: { flex: 1, flexDirection: 'row' },
    statsPanel: { width: 320, borderRightWidth: 1, borderRightColor: '#e5e7eb', padding: 16 },
    statsPlaceholder: { marginTop: 16 },
    mainPanel: { flex: 1 },
    mainPanelContent: { padding: 16 },
    controlsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    controlsHalf: { flex: 1 },
    phoneContent: { flex: 1 },
    phoneContentInner: { padding: 10, gap: 8 },
    placeholder: { color: '#6b7280', marginTop: 4 },
    logButton: { marginTop: 4 },
    logButtonContent: { paddingVertical: 6 },
    previousAtBatsButton: { marginTop: 8 },
    startAtBatButton: { marginTop: 6 },
    selectPrompt: { marginTop: 6, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center' },
    selectPromptText: { color: '#92400e', fontSize: 14, fontWeight: '500' },
    runnerActionRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6, flexWrap: 'wrap' as const },
    runnerOutButton: { alignSelf: 'flex-start' },
    tendenciesRow: { flexDirection: 'row' as const, gap: 8, marginTop: 6 },
    tendencyBtn: { flex: 1 },
    tendencyBtnHitter: { borderColor: '#16a34a' },
    tendencyBtnLabel: { fontSize: 11 },
    tendencyBtnLabelHitter: { color: '#16a34a' },
    callRow: {
        flexDirection: 'row' as const,
        gap: 8,
        alignItems: 'stretch' as const,
    },
    sendCallButton: {
        flex: 1,
        backgroundColor: '#F5A623',
    },
    talkHoldButton: {
        borderWidth: 2,
        borderColor: '#6366f1',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 2,
    },
    talkHoldButtonActive: {
        borderColor: '#EF4444',
        backgroundColor: '#EF444420',
    },
    talkHoldIcon: {
        fontSize: 16,
    },
    talkHoldIconActive: {},
    talkHoldLabel: {
        fontSize: 9,
        fontWeight: '700' as const,
        color: '#6366f1',
    },
    talkHoldLabelActive: {
        color: '#EF4444',
    },
    talkHoldSmall: {
        borderWidth: 1,
        borderColor: '#6366f1',
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    talkHoldSmallLabel: {
        fontSize: 11,
        fontWeight: '600' as const,
        color: '#6366f1',
    },
    callBadge: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#86efac',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center' as const,
    },
    callBadgeText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: '#15803d',
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
        borderTopColor: '#e5e7eb',
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
        borderColor: '#d97706',
        backgroundColor: 'white',
    },
    shakeBtnText: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: '#d97706',
    },
    shakeBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#d97706',
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    shakeBadgeText: {
        color: 'white',
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
        color: '#6b7280',
        letterSpacing: 0.5,
    },
    veloInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600' as const,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        textAlign: 'center' as const,
    },
    pitchFilterBar: {
        flexDirection: 'row' as const,
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 6,
    },
    pitchFilterChip: {
        backgroundColor: '#f3f4f6',
    },
    pitchFilterChipActive: {
        backgroundColor: '#1f2937',
    },
    pitchFilterChipText: {
        fontSize: 12,
        color: '#374151',
    },
    pitchFilterChipTextActive: {
        fontSize: 12,
        color: '#ffffff',
    },
    breakdownTable: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden' as const,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '700' as const,
        color: '#1f2937',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    breakdownRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    breakdownHeader: {
        backgroundColor: '#f9fafb',
    },
    breakdownHeaderText: {
        fontSize: 11,
        fontWeight: '700' as const,
        color: '#6b7280',
        textTransform: 'uppercase' as const,
        letterSpacing: 0.5,
    },
    breakdownTypeCell: {
        flex: 2,
        fontSize: 13,
        color: '#374151',
    },
    breakdownNumCell: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        textAlign: 'center' as const,
    },
    breakdownText: {
        fontSize: 13,
        color: '#374151',
    },
    typeColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    breakdownTotalRow: {
        backgroundColor: '#f9fafb',
        borderBottomWidth: 0,
    },
    breakdownTotalText: {
        fontSize: 13,
        fontWeight: '700' as const,
        color: '#1f2937',
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
        color: '#6b7280',
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
        backgroundColor: '#fef3c7',
        borderWidth: 1,
        borderColor: '#fcd34d',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 6,
    },
    lineupBannerText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: '#92400e',
        flex: 1,
    },
    lineupBannerBtn: {
        backgroundColor: '#d97706',
    },
    myBatterOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    myBatterModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '85%',
        maxHeight: '70%',
    },
    myBatterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 4,
        backgroundColor: '#f9fafb',
    },
    myBatterItemSelected: {
        backgroundColor: '#dbeafe',
    },
    myBatterOrder: {
        width: 32,
        fontWeight: '700',
        color: '#374151',
    },
    myBatterName: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
    },
    myBatterPos: {
        fontSize: 12,
        color: '#6b7280',
        width: 36,
        textAlign: 'right',
    },
});
