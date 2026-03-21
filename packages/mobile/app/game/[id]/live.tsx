import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import { Text, Button, useTheme, IconButton, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from '../../../src/utils/haptics';
import {
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
} from '@pitch-tracker/shared';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { pitchCallingApi } from '../../../src/state/pitchCalling/api/pitchCallingApi';
import { speakPitchCall, activateHFPAudio, deactivateHFPAudio } from '../../../src/utils/pitchCallAudio';
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
    setCurrentAtBat,
    clearPitches,
    setBaseRunners,
    updateBaseRunners,
    recordBaserunnerEvent,
    fetchBaseRunners,
} from '../../../src/state';
import {
    StrikeZone,
    PitchTypeGrid,
    ResultButtons,
    GameHeader,
    InPlayModal,
    PitcherSelectorModal,
    BatterSelectorModal,
    InningChangeModal,
    TeamAtBatModal,
    BaserunnerOutModal,
    RunnerAdvancementModal,
} from '../../../src/components/live';
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
        pitches,
        baseRunners,
        gameStateLoading,
        loading,
        error,
    } = useAppSelector((state) => state.games);
    const teamPlayers = useAppSelector((state) => state.teams.players) || [];

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
    const [showRunnerAdvancementModal, setShowRunnerAdvancementModal] = useState(false);
    const [pendingHitResult, setPendingHitResult] = useState<string | null>(null);

    // Team at bat modal state (visitor games)
    const [showTeamAtBat, setShowTeamAtBat] = useState(false);
    const [teamAtBatRuns, setTeamAtBatRuns] = useState('0');

    // Pitch call state (integrated from pitch-calling screen)
    const [activeCall, setActiveCall] = useState<PitchCall | null>(null);
    const [sendingCall, setSendingCall] = useState(false);
    const [changingCallId, setChangingCallId] = useState<string | null>(null);

    // Velocity state (optional)
    const [velocity, setVelocity] = useState<string>('');

    // Settings
    const { pitchCallingEnabled, velocityEnabled } = useAppSelector((state) => state.settings);

    const game = currentGameState?.game || selectedGame;

    // Activate HFP Bluetooth audio for pitch calls (only when enabled)
    useEffect(() => {
        if (!pitchCallingEnabled) return;
        activateHFPAudio();
        return () => {
            deactivateHFPAudio();
        };
    }, [pitchCallingEnabled]);

    const activeBatters = opponentLineup.filter((b) => !b.replaced_by_id).sort((a, b) => a.batting_order - b.batting_order);

    // Load game state on mount
    useEffect(() => {
        if (id) {
            dispatch(fetchCurrentGameState(id))
                .unwrap()
                .catch(() => {
                    dispatch(fetchGameById(id));
                });
            dispatch(fetchCurrentInning(id));
            dispatch(fetchGamePitchers(id));
            dispatch(fetchOpponentLineup(id));
            dispatch(fetchBaseRunners(id));
        }
    }, [id, dispatch]);

    useEffect(() => {
        if (game?.home_team_id) {
            dispatch(fetchTeamPlayers(game.home_team_id));
            dispatch(fetchTeamPitcherRoster(game.home_team_id));
        }
    }, [game?.home_team_id, dispatch]);

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

    // Auto-show TeamAtBat modal when user's team is batting (visitor games)
    const isUserBatting = game && game.status === 'in_progress' && !game.is_home_game && game.inning_half === 'top';
    useEffect(() => {
        if (isUserBatting && !showInningChange) {
            setShowTeamAtBat(true);
        }
    }, [isUserBatting, game?.current_inning, game?.inning_half, showInningChange]);

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

    const handleEndAtBat = useCallback(
        async (result: string) => {
            if (!currentAtBat) return;
            try {
                const outsFromPlay = getOutsForResult(result);
                const newOutCount = currentOuts + outsFromPlay;
                await dispatch(endAtBat({ id: currentAtBat.id, data: { result, outs_after: Math.min(newOutCount, 3) } })).unwrap();
                dispatch(setCurrentAtBat(null));
                dispatch(clearPitches());

                if (outsFromPlay > 0 && newOutCount >= 3) {
                    setCurrentOuts(0);
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                } else {
                    if (outsFromPlay > 0) setCurrentOuts(newOutCount);
                    const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
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
        [currentAtBat, currentOuts, currentBattingOrder, activeBatters, currentInning, game, dispatch, startAtBatForBatter]
    );

    const handleInningChangeConfirm = useCallback(async () => {
        if (!id || !game) return;
        try {
            const runsToAdd = parseInt(teamRunsScored, 10) || 0;
            // Runs scored while our team is pitching go to opponent (away_score)
            await gamesApi.updateScore(id, game.home_score || 0, (game.away_score || 0) + runsToAdd);

            if (game.is_home_game === false) {
                // Visitor game: advance 1 half (to user's batting half)
                await gamesApi.advanceInning(id);
            } else {
                // Home game: skip opponent's batting half (advance 2)
                await gamesApi.advanceInning(id);
                await gamesApi.advanceInning(id);
            }

            // Clear base runners on inning change (also done server-side)
            dispatch(setBaseRunners(clearBases()));
            dispatch(fetchGameById(id));
            const newInning = await gamesApi.getCurrentInning(id);
            setShowInningChange(false);

            if (game.is_home_game !== false) {
                // Home game: set up next batter immediately
                const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
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
                // For visitor games, TeamAtBat modal will auto-show via useEffect
                dispatch(fetchCurrentInning(id));
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to advance inning');
        }
    }, [id, game, teamRunsScored, currentBattingOrder, activeBatters, dispatch, startAtBatForBatter]);

    const handleTeamAtBatConfirm = useCallback(async () => {
        if (!id || !game) return;
        try {
            const runsToAdd = parseInt(teamAtBatRuns, 10) || 0;

            // User's runs go to home_score (user is always home_score)
            await gamesApi.updateScore(id, (game.home_score || 0) + runsToAdd, game.away_score || 0);

            // Advance 1 half-inning (from user's batting half to opponent's batting half)
            await gamesApi.advanceInning(id);

            // Clear base runners
            dispatch(setBaseRunners(clearBases()));
            dispatch(fetchGameById(id));
            const newInning = await gamesApi.getCurrentInning(id);

            setShowTeamAtBat(false);
            setTeamAtBatRuns('0');

            // Set up next opponent batter
            const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
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
    }, [id, game, teamAtBatRuns, currentBattingOrder, activeBatters, dispatch, startAtBatForBatter]);

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
        if (!currentPitcher || !currentBatter || !id || !currentInning) return;
        try {
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to create at-bat. You can still log pitches offline.');
        }
    }, [currentPitcher, currentBatter, id, currentInning, currentOuts, dispatch]);

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
            await speakPitchCall(abbrev, targetZone, false);
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
            await speakPitchCall(activeCall.pitch_type, activeCall.zone, false);
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

    const handleLogPitch = async () => {
        if (!selectedPitchType || !selectedResult || !pitchLocation) {
            Alert.alert('Missing Info', 'Please select pitch type, location, and result');
            return;
        }
        if (!currentPitcher) {
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
                pitcher_id: currentPitcher.player_id,
                pitch_type: selectedPitchType,
                pitch_result: selectedResult,
                location_x: pitchLocation.x,
                location_y: pitchLocation.y,
                target_location_x: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].x : undefined,
                target_location_y: targetZone ? PITCH_CALL_ZONE_COORDS[targetZone].y : undefined,
                velocity: veloNum && !isNaN(veloNum) ? veloNum : undefined,
                opponent_batter_id: currentBatter?.id,
                balls_before: balls,
                strikes_before: strikes,
            });
            if (!result.success) {
                Alert.alert('Error', 'Failed to log pitch');
                return;
            }
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
            setSelectedPitchType(null);
            setSelectedResult(null);
            setPitchLocation(null);
            setTargetZone(null);
            setVelocity('');
            setChangingCallId(null);
            if (result.queued) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (newBalls >= 4) await handleEndAtBat('walk');
            else if (newStrikes >= 3) await handleEndAtBat('strikeout');
            else if (selectedResult === 'in_play') setShowInPlayModal(true);
        } catch {
            Alert.alert('Error', 'Failed to log pitch');
        } finally {
            setIsLogging(false);
        }
    };

    const handleInPlayResult = useCallback(
        async (result: string, hitLocation?: HitLocation) => {
            setShowInPlayModal(false);
            // For hits, show runner advancement modal
            const hitResults = ['single', 'double', 'triple', 'home_run', 'walk', 'hit_by_pitch'];
            const hasRunnersOnBase = baseRunners.first || baseRunners.second || baseRunners.third;
            if (hitResults.includes(result) && hasRunnersOnBase) {
                setPendingHitResult(result);
                setShowRunnerAdvancementModal(true);
            } else if (hitResults.includes(result)) {
                // No runners on base, just apply standard advancement
                const { suggestedRunners, suggestedRuns } = getSuggestedAdvancement(baseRunners, result);
                dispatch(setBaseRunners(suggestedRunners));
                if (id) dispatch(updateBaseRunners({ gameId: id, baseRunners: suggestedRunners }));
                await handleEndAtBat(result);
            } else {
                // Out result - just end at-bat
                await handleEndAtBat(result);
            }
        },
        [handleEndAtBat, baseRunners, id, dispatch]
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
            await handleEndAtBat(pendingHitResult);
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
                const newOuts = currentOuts + 1;
                setCurrentOuts(newOuts);
                if (newOuts >= 3) {
                    setTeamRunsScored('0');
                    setInningChangeInfo({ inning: game?.current_inning || 1, half: game?.inning_half || 'top' });
                    setShowInningChange(true);
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                Alert.alert('Error', 'Failed to record baserunner out');
            }
        },
        [id, currentInning, currentAtBat, currentOuts, game, dispatch]
    );

    const handleRunnerPress = useCallback(
        (base: RunnerBase) => {
            // Show baserunner out modal if there are runners on base
            if (baseRunners[base]) {
                setShowBaserunnerOutModal(true);
            }
        },
        [baseRunners]
    );

    const canLogPitch = selectedPitchType && selectedResult && pitchLocation && !isLogging;
    const canStartAtBat = currentPitcher && currentBatter && !currentAtBat;
    const activePitcherDisplay = currentPitcher?.player || null;
    const activeBatterDisplay = currentBatter
        ? { name: currentBatter.player_name, batting_order: currentBatter.batting_order }
        : null;

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

    const renderGameHeader = () => (
        <GameHeader
            game={game}
            currentPitcher={activePitcherDisplay}
            currentBatter={activeBatterDisplay}
            balls={balls}
            strikes={strikes}
            outs={currentOuts}
            runners={baseRunners}
            onPitcherPress={game.status === 'in_progress' ? () => setPitcherModalVisible(true) : undefined}
            onBatterPress={game.status === 'in_progress' ? () => setBatterModalVisible(true) : undefined}
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
                onBatterAdded={() => dispatch(fetchOpponentLineup(id!))}
            />
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
                onDismiss={() => setShowBaserunnerOutModal(false)}
                runners={baseRunners}
                currentOuts={currentOuts}
                onRecordOut={handleRecordBaserunnerOut}
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
        </Portal>
    );

    const renderRunnerOutButton = () => {
        if (game.status !== 'in_progress' || !hasRunnersOnBase) return null;
        return (
            <Button
                mode="outlined"
                onPress={() => setShowBaserunnerOutModal(true)}
                style={styles.runnerOutButton}
                icon="account-remove"
                compact
            >
                Runner Out
            </Button>
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
                        {game.status === 'in_progress' && (
                            <IconButton icon="bullhorn" onPress={() => router.push(`/game/${id}/pitch-calling` as any)} />
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
                        {renderRunnerOutButton()}
                        {renderAtBatControls()}
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
                        <StrikeZone
                            onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                            onTargetZoneSelect={setTargetZone}
                            onTargetClear={() => {
                                setTargetZone(null);
                                setPitchLocation(null);
                            }}
                            targetZone={targetZone}
                            previousPitches={pitches}
                            disabled={isLogging}
                            singleTapMode
                            batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                            pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                        />
                        {/* Send Call (optional, setting-gated) */}
                        {pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                            <Button
                                mode="contained"
                                onPress={handleSendCall}
                                loading={sendingCall}
                                disabled={sendingCall}
                                style={{ backgroundColor: '#F5A623', marginTop: 8 }}
                                labelStyle={{ color: '#0A1628', fontWeight: '800', letterSpacing: 0.5 }}
                            >
                                {sendingCall
                                    ? 'SENDING...'
                                    : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                            </Button>
                        )}
                        {pitchCallingEnabled && activeCall && (
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
                                </View>
                            </View>
                        )}
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
                                <ResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} />
                            </View>
                        </View>
                        {velocityEnabled && (
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
                    </ScrollView>
                </View>
                {renderModals()}
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
                    {/* Pitch calling integrated into this screen */}
                    {game.status === 'in_progress' ? (
                        <IconButton icon="flag-checkered" onPress={handleEndGame} />
                    ) : (
                        <View style={{ width: 48 }} />
                    )}
                </View>
            </View>
            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                {renderGameHeader()}
                {renderRunnerOutButton()}
                {renderAtBatControls()}
                {/* 1. Pitch Type */}
                <PitchTypeGrid
                    selectedType={selectedPitchType}
                    onSelect={setSelectedPitchType}
                    availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined}
                    disabled={isLogging}
                    compact
                />
                {/* 2. Strike Zone (single tap sets target + location) */}
                <StrikeZone
                    onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetZoneSelect={setTargetZone}
                    onTargetClear={() => {
                        setTargetZone(null);
                        setPitchLocation(null);
                    }}
                    targetZone={targetZone}
                    previousPitches={pitches}
                    disabled={isLogging}
                    compact
                    singleTapMode
                    batterSide={currentBatter?.bats as 'R' | 'L' | 'S' | undefined}
                    pitcherThrows={currentPitcher?.player?.throws as 'R' | 'L' | undefined}
                />
                {/* 3. Pitch Calling (optional, setting-gated) */}
                {pitchCallingEnabled && selectedPitchType && targetZone && !activeCall && (
                    <Button
                        mode="contained"
                        onPress={handleSendCall}
                        loading={sendingCall}
                        disabled={sendingCall}
                        style={{ backgroundColor: '#F5A623' }}
                        labelStyle={{ color: '#0A1628', fontWeight: '800', letterSpacing: 0.5 }}
                    >
                        {sendingCall
                            ? 'SENDING...'
                            : `SEND: ${selectedPitchType.toUpperCase()} → ${PITCH_CALL_ZONE_LABELS[targetZone]}`}
                    </Button>
                )}
                {pitchCallingEnabled && activeCall && (
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
                        </View>
                    </View>
                )}
                {/* 4. Result */}
                <ResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} compact />
                {/* 5. Velocity (optional, setting-gated) */}
                {velocityEnabled && (
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
            </ScrollView>
            {renderModals()}
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
    startAtBatButton: { marginTop: 6 },
    selectPrompt: { marginTop: 6, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center' },
    selectPromptText: { color: '#92400e', fontSize: 14, fontWeight: '500' },
    runnerOutButton: { marginTop: 6, alignSelf: 'flex-start' },
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
});
