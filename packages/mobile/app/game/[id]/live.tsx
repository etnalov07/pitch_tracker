import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert, Pressable, TextInput } from 'react-native';
import { Text, Button, useTheme, IconButton, Portal, Modal, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PitchType, PitchResult, Pitch, Player, GamePitcherWithPlayer, OpponentLineupPlayer, Inning } from '@pitch-tracker/shared';
import { gamesApi } from '../../../src/state/games/api/gamesApi';
import { useDeviceType } from '../../../src/hooks/useDeviceType';
import { useOfflineActions } from '../../../src/hooks/useOfflineActions';
import {
    useAppDispatch,
    useAppSelector,
    fetchCurrentGameState,
    fetchGameById,
    fetchTeamPlayers,
    fetchCurrentInning,
    fetchGamePitchers,
    changePitcher,
    fetchOpponentLineup,
    fetchTeamPitcherRoster,
    createAtBat,
    updateAtBat,
    setCurrentAtBat,
    clearPitches,
} from '../../../src/state';
import { StrikeZone, PitchTypeGrid, ResultButtons, GameHeader, InPlayModal } from '../../../src/components/live';
import { SyncStatusBadge, LoadingScreen, ErrorScreen } from '../../../src/components/common';
import { HitLocation } from '../../../src/components/live/InPlayModal';

// Helpers matching web app logic
const isOutResult = (result: string): boolean => {
    const outResults = [
        'strikeout', 'groundout', 'flyout', 'lineout', 'popout',
        'double_play', 'triple_play', 'fielders_choice', 'force_out',
        'tag_out', 'caught_stealing', 'sacrifice_fly', 'sacrifice_bunt',
    ];
    return outResults.includes(result);
};

const getOutsForResult = (result: string): number => {
    if (result === 'double_play') return 2;
    if (result === 'triple_play') return 3;
    if (isOutResult(result)) return 1;
    return 0;
};

export default function LiveGameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { isTablet, isLandscape } = useDeviceType();
    const { isOnline, logPitchOffline } = useOfflineActions();

    const { currentGameState, selectedGame, currentAtBat, currentInning, gamePitchers, opponentLineup, pitches, gameStateLoading, loading, error } =
        useAppSelector((state) => state.games);
    const teamPlayers = useAppSelector((state) => state.teams.players) || [];

    // Local state for pitch entry
    const [selectedPitchType, setSelectedPitchType] = useState<PitchType | null>(null);
    const [selectedResult, setSelectedResult] = useState<PitchResult | null>(null);
    const [pitchLocation, setPitchLocation] = useState<{ x: number; y: number } | null>(null);
    const [targetLocation, setTargetLocation] = useState<{ x: number; y: number } | null>(null);
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

    const game = currentGameState?.game || selectedGame;

    // Filter opponent lineup: active batters (not replaced)
    const activeBatters = opponentLineup
        .filter((b) => !b.replaced_by_id)
        .sort((a, b) => a.batting_order - b.batting_order);

    // Load game state on mount
    useEffect(() => {
        if (id) {
            dispatch(fetchCurrentGameState(id))
                .unwrap()
                .catch(() => {
                    dispatch(fetchGameById(id));
                });

            // Fetch game-specific data in parallel
            dispatch(fetchCurrentInning(id));
            dispatch(fetchGamePitchers(id));
            dispatch(fetchOpponentLineup(id));
        }
    }, [id, dispatch]);

    // Fetch team players for pitcher roster
    useEffect(() => {
        if (game?.home_team_id) {
            dispatch(fetchTeamPlayers(game.home_team_id));
            dispatch(fetchTeamPitcherRoster(game.home_team_id));
        }
    }, [game?.home_team_id, dispatch]);

    // Set current pitcher from game pitchers (active one = no inning_exited)
    useEffect(() => {
        if (gamePitchers.length > 0 && !currentPitcher) {
            const active = gamePitchers.find((p) => !p.inning_exited);
            if (active) {
                setCurrentPitcher(active);
            }
        }
    }, [gamePitchers, currentPitcher]);

    // Fetch pitcher's pitch types when pitcher changes
    useEffect(() => {
        if (currentPitcher?.player_id) {
            gamesApi.getPitcherPitchTypes(currentPitcher.player_id)
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

    // Calculate count from pitches in current at-bat
    const balls = pitches.filter((p) => p.pitch_result === 'ball').length;
    // Proper strike count: fouls only count up to 2 strikes
    const effectiveStrikes = (() => {
        let s = 0;
        for (const p of pitches) {
            if (p.pitch_result === 'called_strike' || p.pitch_result === 'swinging_strike') {
                s++;
            } else if (p.pitch_result === 'foul' && s < 2) {
                s++;
            }
        }
        return s;
    })();
    const strikes = Math.min(effectiveStrikes, 2); // Display capped at 2

    // Start at-bat for a specific batter
    const startAtBatForBatter = useCallback(async (
        batter: OpponentLineupPlayer,
        outs: number,
        inning: Inning | null
    ): Promise<boolean> => {
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
    }, [id, currentPitcher, dispatch]);

    // End at-bat with result
    const handleEndAtBat = useCallback(async (result: string) => {
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

            if (outsFromPlay > 0 && newOutCount >= 3) {
                // 3 outs - show inning change modal
                setCurrentOuts(0);
                setTeamRunsScored('0');
                setInningChangeInfo({
                    inning: game?.current_inning || 1,
                    half: game?.inning_half || 'top',
                });
                setShowInningChange(true);
            } else {
                // Update outs
                if (outsFromPlay > 0) {
                    setCurrentOuts(newOutCount);
                }

                // Advance to next batter
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
        } catch (err) {
            Alert.alert('Error', 'Failed to end at-bat');
        }
    }, [currentAtBat, currentOuts, currentBattingOrder, activeBatters, currentInning, game, dispatch, startAtBatForBatter]);

    // Handle inning change confirmation
    const handleInningChangeConfirm = useCallback(async () => {
        if (!id || !game) return;

        try {
            const runsToAdd = parseInt(teamRunsScored, 10) || 0;

            // Update score with team's runs
            const currentHomeScore = game.home_score || 0;
            const currentAwayScore = game.away_score || 0;
            await gamesApi.updateScore(id, currentHomeScore + runsToAdd, currentAwayScore);

            // Advance inning twice (skip team's batting half)
            await gamesApi.advanceInning(id);
            await gamesApi.advanceInning(id);

            // Refresh game state
            dispatch(fetchGameById(id));

            // Fetch new inning
            const newInning = await gamesApi.getCurrentInning(id);

            setShowInningChange(false);

            // Continue lineup from where it left off (next batter after the last out)
            const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
            setCurrentBattingOrder(nextOrder);
            const firstBatter = activeBatters.find((p) => p.batting_order === nextOrder);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
                // Update current inning in redux
                dispatch(fetchCurrentInning(id));
            } else {
                setCurrentBatter(null);
                dispatch(fetchCurrentInning(id));
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            Alert.alert('Error', 'Failed to advance inning');
        }
    }, [id, game, teamRunsScored, activeBatters, dispatch, startAtBatForBatter]);

    // Pitcher selection
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
                changePitcher({
                    gameId: id,
                    playerId: player.id,
                    inningEntered: game?.current_inning || 1,
                })
            ).unwrap();
            setCurrentPitcher(result);
            setPitcherModalVisible(false);
        } catch {
            Alert.alert('Error', 'Failed to change pitcher');
        }
    };

    // Batter selection
    const handleSelectBatter = (batter: OpponentLineupPlayer) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentBatter(batter);
        setCurrentBattingOrder(batter.batting_order);
        setBatterModalVisible(false);
    };

    // End game
    const handleEndGame = useCallback(() => {
        if (!id || !game) return;

        Alert.alert(
            'End Game',
            'Are you sure you want to end this game? This will mark it as completed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Game',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await gamesApi.endGame(id, {
                                home_score: game.home_score || 0,
                                away_score: game.away_score || 0,
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.back();
                        } catch {
                            Alert.alert('Error', 'Failed to end game');
                        }
                    },
                },
            ]
        );
    }, [id, game, router]);

    // Create at-bat
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

    // Log pitch and check for auto-advance
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
            const result = await logPitchOffline({
                at_bat_id: currentAtBat?.id || '',
                game_id: id!,
                pitcher_id: currentPitcher.player_id,
                pitch_type: selectedPitchType,
                pitch_result: selectedResult,
                location_x: pitchLocation.x,
                location_y: pitchLocation.y,
                target_location_x: targetLocation?.x,
                target_location_y: targetLocation?.y,
            });

            // Calculate new count after this pitch
            const newBalls = balls + (selectedResult === 'ball' ? 1 : 0);
            const newStrikes = effectiveStrikes + (
                (selectedResult === 'called_strike' || selectedResult === 'swinging_strike') ? 1 :
                (selectedResult === 'foul' && effectiveStrikes < 2) ? 1 : 0
            );

            // Reset selections
            setSelectedPitchType(null);
            setSelectedResult(null);
            setPitchLocation(null);
            setTargetLocation(null);

            if (result.queued) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }

            // Check for auto-advance conditions
            if (newBalls >= 4) {
                // Walk
                await handleEndAtBat('walk');
            } else if (newStrikes >= 3) {
                // Strikeout
                await handleEndAtBat('strikeout');
            } else if (selectedResult === 'in_play') {
                // Show in-play modal
                setShowInPlayModal(true);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to log pitch');
        } finally {
            setIsLogging(false);
        }
    };

    // Handle in-play result selection
    const handleInPlayResult = useCallback(async (result: string, hitLocation?: HitLocation) => {
        setShowInPlayModal(false);
        await handleEndAtBat(result);
    }, [handleEndAtBat]);

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
            onPitcherPress={game.status === 'in_progress' ? () => setPitcherModalVisible(true) : undefined}
            onBatterPress={game.status === 'in_progress' ? () => setBatterModalVisible(true) : undefined}
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

    const renderModals = () => (
        <Portal>
            {/* Pitcher Selection Modal */}
            <Modal
                visible={pitcherModalVisible}
                onDismiss={() => setPitcherModalVisible(false)}
                contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
            >
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Select Pitcher
                </Text>

                {gamePitchers.length > 0 && (
                    <>
                        <Text variant="titleSmall" style={styles.sectionLabel}>
                            In-Game Pitchers
                        </Text>
                        {gamePitchers
                            .filter((gp) => !gp.inning_exited)
                            .map((gp) => (
                                <Pressable
                                    key={gp.id}
                                    style={[
                                        styles.playerOption,
                                        currentPitcher?.id === gp.id && styles.playerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        setCurrentPitcher(gp);
                                        setPitcherModalVisible(false);
                                    }}
                                >
                                    <View style={styles.playerOptionInfo}>
                                        <Text style={styles.playerOptionName}>
                                            {gp.player.first_name} {gp.player.last_name}
                                        </Text>
                                        <Text style={styles.playerOptionDetail}>
                                            #{gp.player.jersey_number} · Active
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        <Divider style={styles.sectionDivider} />
                    </>
                )}

                <Text variant="titleSmall" style={styles.sectionLabel}>
                    Available Pitchers
                </Text>
                <ScrollView style={styles.playerList}>
                    {teamPlayers.length === 0 ? (
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            No players found. Add players to your team first.
                        </Text>
                    ) : (
                        teamPlayers.map((player) => {
                            const alreadyInGame = gamePitchers.some(
                                (gp) => gp.player_id === player.id && !gp.inning_exited
                            );
                            return (
                                <Pressable
                                    key={player.id}
                                    style={[styles.playerOption, alreadyInGame && styles.playerOptionDisabled]}
                                    onPress={() => !alreadyInGame && handleSelectPitcher(player)}
                                    disabled={alreadyInGame}
                                >
                                    <View style={styles.playerOptionInfo}>
                                        <Text
                                            style={[
                                                styles.playerOptionName,
                                                alreadyInGame && styles.disabledText,
                                            ]}
                                        >
                                            {player.first_name} {player.last_name}
                                        </Text>
                                        <Text style={styles.playerOptionDetail}>
                                            #{player.jersey_number} · {player.primary_position}
                                            {player.throws ? ` · ${player.throws === 'R' ? 'RHP' : 'LHP'}` : ''}
                                            {alreadyInGame ? ' · Already Active' : ''}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </ScrollView>
                <Button onPress={() => setPitcherModalVisible(false)} style={styles.modalClose}>
                    Cancel
                </Button>
            </Modal>

            {/* Batter Selection Modal */}
            <Modal
                visible={batterModalVisible}
                onDismiss={() => setBatterModalVisible(false)}
                contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
            >
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Select Batter
                </Text>
                <ScrollView style={styles.playerList}>
                    {activeBatters.length === 0 ? (
                        <Text variant="bodyMedium" style={styles.emptyText}>
                            No opponent lineup found. Set up the opponent lineup before starting.
                        </Text>
                    ) : (
                        activeBatters.map((batter) => (
                            <Pressable
                                key={batter.id}
                                style={[
                                    styles.playerOption,
                                    currentBatter?.id === batter.id && styles.playerOptionSelected,
                                ]}
                                onPress={() => handleSelectBatter(batter)}
                            >
                                <View style={styles.batterOptionRow}>
                                    <View style={styles.batterOrder}>
                                        <Text style={styles.batterOrderText}>{batter.batting_order}</Text>
                                    </View>
                                    <View style={styles.playerOptionInfo}>
                                        <Text style={styles.playerOptionName}>{batter.player_name}</Text>
                                        <Text style={styles.playerOptionDetail}>
                                            {batter.position || 'Unknown'}
                                            {batter.bats ? ` · Bats ${batter.bats}` : ''}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        ))
                    )}
                </ScrollView>
                <Button onPress={() => setBatterModalVisible(false)} style={styles.modalClose}>
                    Cancel
                </Button>
            </Modal>

            {/* Inning Change Modal */}
            <Modal
                visible={showInningChange}
                onDismiss={() => {}}
                contentContainerStyle={[styles.modal, isTablet && styles.modalTablet]}
            >
                <Text variant="titleLarge" style={styles.modalTitle}>
                    Inning Over
                </Text>
                <Text style={styles.inningChangeText}>
                    3 outs recorded.{'\n'}
                    {inningChangeInfo && `End of ${inningChangeInfo.half === 'top' ? 'Top' : 'Bottom'} ${inningChangeInfo.inning}`}
                </Text>
                <Text style={styles.runsLabel}>Runs scored by your team this inning:</Text>
                <TextInput
                    style={styles.runsInput}
                    value={teamRunsScored}
                    onChangeText={setTeamRunsScored}
                    keyboardType="number-pad"
                    selectTextOnFocus
                />
                <Button
                    mode="contained"
                    onPress={handleInningChangeConfirm}
                    style={styles.inningChangeButton}
                >
                    Next Inning
                </Button>
            </Modal>
        </Portal>
    );

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
                    {game.status === 'in_progress' ? (
                        <IconButton icon="flag-checkered" onPress={handleEndGame} />
                    ) : (
                        <View style={{ width: 48 }} />
                    )}
                </View>

                <View style={styles.tabletContent}>
                    <View style={styles.statsPanel}>
                        {renderGameHeader()}
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
                            onTargetSelect={(x, y) => setTargetLocation({ x, y })}
                            onTargetClear={() => setTargetLocation(null)}
                            targetLocation={targetLocation}
                            previousPitches={pitches}
                            disabled={isLogging}
                        />
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
                <InPlayModal
                    visible={showInPlayModal}
                    onDismiss={() => setShowInPlayModal(false)}
                    onResult={handleInPlayResult}
                />
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
                {game.status === 'in_progress' ? (
                    <IconButton icon="flag-checkered" onPress={handleEndGame} />
                ) : (
                    <View style={{ width: 48 }} />
                )}
            </View>

            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                {renderGameHeader()}
                {renderAtBatControls()}

                <PitchTypeGrid
                    selectedType={selectedPitchType}
                    onSelect={setSelectedPitchType}
                    availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined}
                    disabled={isLogging}
                    compact
                />

                <StrikeZone
                    onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetSelect={(x, y) => setTargetLocation({ x, y })}
                    onTargetClear={() => setTargetLocation(null)}
                    targetLocation={targetLocation}
                    previousPitches={pitches}
                    disabled={isLogging}
                    compact
                />

                <ResultButtons
                    selectedResult={selectedResult}
                    onSelect={setSelectedResult}
                    disabled={isLogging}
                    compact
                />

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
            <InPlayModal
                visible={showInPlayModal}
                onDismiss={() => setShowInPlayModal(false)}
                onResult={handleInPlayResult}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tabletContent: {
        flex: 1,
        flexDirection: 'row',
    },
    statsPanel: {
        width: 320,
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        padding: 16,
    },
    statsPlaceholder: {
        marginTop: 16,
    },
    mainPanel: {
        flex: 1,
    },
    mainPanelContent: {
        padding: 16,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 16,
    },
    controlsHalf: {
        flex: 1,
    },
    phoneContent: {
        flex: 1,
    },
    phoneContentInner: {
        padding: 10,
        gap: 8,
    },
    placeholder: {
        color: '#6b7280',
        marginTop: 4,
    },
    logButton: {
        marginTop: 4,
    },
    logButtonContent: {
        paddingVertical: 6,
    },
    startAtBatButton: {
        marginTop: 6,
    },
    selectPrompt: {
        marginTop: 6,
        padding: 12,
        backgroundColor: '#fef3c7',
        borderRadius: 8,
        alignItems: 'center',
    },
    selectPromptText: {
        color: '#92400e',
        fontSize: 14,
        fontWeight: '500',
    },
    // Modal styles
    modal: {
        backgroundColor: '#ffffff',
        margin: 20,
        padding: 20,
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalTablet: {
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    modalTitle: {
        marginBottom: 16,
    },
    modalClose: {
        marginTop: 8,
    },
    sectionLabel: {
        color: '#6b7280',
        marginBottom: 8,
        marginTop: 4,
    },
    sectionDivider: {
        marginVertical: 12,
    },
    playerList: {
        maxHeight: 400,
    },
    playerOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    playerOptionSelected: {
        backgroundColor: '#eff6ff',
    },
    playerOptionDisabled: {
        opacity: 0.5,
    },
    playerOptionInfo: {
        gap: 2,
    },
    playerOptionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    playerOptionDetail: {
        fontSize: 13,
        color: '#6b7280',
    },
    disabledText: {
        color: '#9ca3af',
    },
    batterOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    batterOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e5e7eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    batterOrderText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        padding: 24,
    },
    // Inning change modal styles
    inningChangeText: {
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },
    runsLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    runsInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111827',
    },
    inningChangeButton: {
        marginTop: 4,
    },
});
