import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Text, Button, useTheme, IconButton, Portal } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PitchType, PitchResult, Player, GamePitcherWithPlayer, OpponentLineupPlayer, Inning, isOutResult, getOutsForResult } from '@pitch-tracker/shared';
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
import {
    StrikeZone, PitchTypeGrid, ResultButtons, GameHeader, InPlayModal,
    PitcherSelectorModal, BatterSelectorModal, InningChangeModal,
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

    const activeBatters = opponentLineup
        .filter((b) => !b.replaced_by_id)
        .sort((a, b) => a.batting_order - b.batting_order);

    // Load game state on mount
    useEffect(() => {
        if (id) {
            dispatch(fetchCurrentGameState(id))
                .unwrap()
                .catch(() => { dispatch(fetchGameById(id)); });
            dispatch(fetchCurrentInning(id));
            dispatch(fetchGamePitchers(id));
            dispatch(fetchOpponentLineup(id));
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
    const startAtBatForBatter = useCallback(async (
        batter: OpponentLineupPlayer, outs: number, inning: Inning | null
    ): Promise<boolean> => {
        if (!id || !currentPitcher || !inning) return false;
        try {
            await dispatch(createAtBat({
                game_id: id, inning_id: inning.id, opponent_batter_id: batter.id,
                pitcher_id: currentPitcher.player_id, batting_order: batter.batting_order,
                balls: 0, strikes: 0, outs_before: outs,
            })).unwrap();
            return true;
        } catch { console.error('Failed to start at-bat'); return false; }
    }, [id, currentPitcher, dispatch]);

    const handleEndAtBat = useCallback(async (result: string) => {
        if (!currentAtBat) return;
        try {
            const outsFromPlay = getOutsForResult(result);
            const newOutCount = currentOuts + outsFromPlay;
            await dispatch(updateAtBat({ id: currentAtBat.id, data: { result, outs_after: Math.min(newOutCount, 3) } })).unwrap();
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
                } else { setCurrentBatter(null); }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { Alert.alert('Error', 'Failed to end at-bat'); }
    }, [currentAtBat, currentOuts, currentBattingOrder, activeBatters, currentInning, game, dispatch, startAtBatForBatter]);

    const handleInningChangeConfirm = useCallback(async () => {
        if (!id || !game) return;
        try {
            const runsToAdd = parseInt(teamRunsScored, 10) || 0;
            await gamesApi.updateScore(id, (game.home_score || 0) + runsToAdd, game.away_score || 0);
            await gamesApi.advanceInning(id);
            await gamesApi.advanceInning(id);
            dispatch(fetchGameById(id));
            const newInning = await gamesApi.getCurrentInning(id);
            setShowInningChange(false);
            const nextOrder = currentBattingOrder >= 9 ? 1 : currentBattingOrder + 1;
            setCurrentBattingOrder(nextOrder);
            const firstBatter = activeBatters.find((p) => p.batting_order === nextOrder);
            if (firstBatter && newInning) {
                setCurrentBatter(firstBatter);
                await startAtBatForBatter(firstBatter, 0, newInning);
                dispatch(fetchCurrentInning(id));
            } else { setCurrentBatter(null); dispatch(fetchCurrentInning(id)); }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { Alert.alert('Error', 'Failed to advance inning'); }
    }, [id, game, teamRunsScored, activeBatters, dispatch, startAtBatForBatter]);

    const handleSelectPitcher = async (player: Player) => {
        if (!id || !currentInning) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const activePitcher = gamePitchers.find((p) => !p.inning_exited);
        if (activePitcher && activePitcher.player_id === player.id) { setPitcherModalVisible(false); return; }
        try {
            const result = await dispatch(changePitcher({ gameId: id, playerId: player.id, inningEntered: game?.current_inning || 1 })).unwrap();
            setCurrentPitcher(result);
            setPitcherModalVisible(false);
        } catch { Alert.alert('Error', 'Failed to change pitcher'); }
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
            { text: 'End Game', style: 'destructive', onPress: async () => {
                try {
                    await gamesApi.endGame(id, { home_score: game.home_score || 0, away_score: game.away_score || 0 });
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.back();
                } catch { Alert.alert('Error', 'Failed to end game'); }
            }},
        ]);
    }, [id, game, router]);

    const handleStartAtBat = useCallback(async () => {
        if (!currentPitcher || !currentBatter || !id || !currentInning) return;
        try {
            await dispatch(createAtBat({
                game_id: id, inning_id: currentInning.id, opponent_batter_id: currentBatter.id,
                pitcher_id: currentPitcher.player_id, batting_order: currentBatter.batting_order,
                balls: 0, strikes: 0, outs_before: currentOuts,
            })).unwrap();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch { Alert.alert('Error', 'Failed to create at-bat. You can still log pitches offline.'); }
    }, [currentPitcher, currentBatter, id, currentInning, currentOuts, dispatch]);

    const handleLogPitch = async () => {
        if (!selectedPitchType || !selectedResult || !pitchLocation) {
            Alert.alert('Missing Info', 'Please select pitch type, location, and result'); return;
        }
        if (!currentPitcher) { Alert.alert('No Pitcher', 'Please select a pitcher first'); return; }
        setIsLogging(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const result = await logPitchOffline({
                at_bat_id: currentAtBat?.id || '', game_id: id!, pitcher_id: currentPitcher.player_id,
                pitch_type: selectedPitchType, pitch_result: selectedResult,
                location_x: pitchLocation.x, location_y: pitchLocation.y,
                target_location_x: targetLocation?.x, target_location_y: targetLocation?.y,
            });
            const newBalls = balls + (selectedResult === 'ball' ? 1 : 0);
            const newStrikes = effectiveStrikes + (
                (selectedResult === 'called_strike' || selectedResult === 'swinging_strike') ? 1 :
                (selectedResult === 'foul' && effectiveStrikes < 2) ? 1 : 0
            );
            setSelectedPitchType(null); setSelectedResult(null); setPitchLocation(null); setTargetLocation(null);
            if (result.queued) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (newBalls >= 4) await handleEndAtBat('walk');
            else if (newStrikes >= 3) await handleEndAtBat('strikeout');
            else if (selectedResult === 'in_play') setShowInPlayModal(true);
        } catch { Alert.alert('Error', 'Failed to log pitch'); }
        finally { setIsLogging(false); }
    };

    const handleInPlayResult = useCallback(async (result: string, hitLocation?: HitLocation) => {
        setShowInPlayModal(false);
        await handleEndAtBat(result);
    }, [handleEndAtBat]);

    const canLogPitch = selectedPitchType && selectedResult && pitchLocation && !isLogging;
    const canStartAtBat = currentPitcher && currentBatter && !currentAtBat;
    const activePitcherDisplay = currentPitcher?.player || null;
    const activeBatterDisplay = currentBatter ? { name: currentBatter.player_name, batting_order: currentBatter.batting_order } : null;

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
                <ErrorScreen title="Game not found" message={error || 'The game could not be loaded'}
                    onRetry={() => id && dispatch(fetchGameById(id))} onGoBack={() => router.back()} />
            </SafeAreaView>
        );
    }

    const renderGameHeader = () => (
        <GameHeader game={game} currentPitcher={activePitcherDisplay} currentBatter={activeBatterDisplay}
            balls={balls} strikes={strikes} outs={currentOuts}
            onPitcherPress={game.status === 'in_progress' ? () => setPitcherModalVisible(true) : undefined}
            onBatterPress={game.status === 'in_progress' ? () => setBatterModalVisible(true) : undefined} />
    );

    const renderAtBatControls = () => {
        if (game.status !== 'in_progress') return null;
        if (canStartAtBat) {
            return (
                <Button mode="contained" onPress={handleStartAtBat} style={styles.startAtBatButton}
                    contentStyle={styles.logButtonContent} icon="baseball-bat">Start At-Bat</Button>
            );
        }
        if (!currentPitcher || !currentBatter) {
            return (
                <View style={styles.selectPrompt}>
                    <Text style={styles.selectPromptText}>
                        {!currentPitcher && !currentBatter ? 'Select a pitcher and batter to begin'
                            : !currentPitcher ? 'Select a pitcher to begin' : 'Select a batter to begin'}
                    </Text>
                </View>
            );
        }
        return null;
    };

    const renderModals = () => (
        <Portal>
            <PitcherSelectorModal
                visible={pitcherModalVisible} onDismiss={() => setPitcherModalVisible(false)}
                gamePitchers={gamePitchers} currentPitcher={currentPitcher} teamPlayers={teamPlayers}
                onSelectExistingPitcher={(gp) => { setCurrentPitcher(gp); setPitcherModalVisible(false); }}
                onSelectNewPitcher={handleSelectPitcher} isTablet={isTablet} />
            <BatterSelectorModal
                visible={batterModalVisible} onDismiss={() => setBatterModalVisible(false)}
                activeBatters={activeBatters} currentBatter={currentBatter}
                onSelectBatter={handleSelectBatter} isTablet={isTablet} />
            <InningChangeModal
                visible={showInningChange} inningChangeInfo={inningChangeInfo}
                teamRunsScored={teamRunsScored} onRunsChange={setTeamRunsScored}
                onConfirm={handleInningChangeConfirm} isTablet={isTablet} />
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
                    ) : <View style={{ width: 48 }} />}
                </View>
                <View style={styles.tabletContent}>
                    <View style={styles.statsPanel}>
                        {renderGameHeader()}
                        {renderAtBatControls()}
                        <View style={styles.statsPlaceholder}>
                            <Text variant="titleSmall" style={{ marginTop: 16 }}>Pitcher Stats</Text>
                            <Text variant="bodySmall" style={styles.placeholder}>Total Pitches: {pitches.length}</Text>
                        </View>
                    </View>
                    <ScrollView style={styles.mainPanel} contentContainerStyle={styles.mainPanelContent}>
                        <StrikeZone onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                            onTargetSelect={(x, y) => setTargetLocation({ x, y })}
                            onTargetClear={() => setTargetLocation(null)}
                            targetLocation={targetLocation} previousPitches={pitches} disabled={isLogging} />
                        <View style={styles.controlsRow}>
                            <View style={styles.controlsHalf}>
                                <PitchTypeGrid selectedType={selectedPitchType} onSelect={setSelectedPitchType}
                                    availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined} disabled={isLogging} />
                            </View>
                            <View style={styles.controlsHalf}>
                                <ResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} />
                            </View>
                        </View>
                        <Button mode="contained" onPress={handleLogPitch} disabled={!canLogPitch}
                            loading={isLogging} style={styles.logButton} contentStyle={styles.logButtonContent}>Log Pitch</Button>
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
                {game.status === 'in_progress' ? (
                    <IconButton icon="flag-checkered" onPress={handleEndGame} />
                ) : <View style={{ width: 48 }} />}
            </View>
            <ScrollView style={styles.phoneContent} contentContainerStyle={styles.phoneContentInner}>
                {renderGameHeader()}
                {renderAtBatControls()}
                <PitchTypeGrid selectedType={selectedPitchType} onSelect={setSelectedPitchType}
                    availablePitchTypes={pitcherPitchTypes.length > 0 ? pitcherPitchTypes : undefined} disabled={isLogging} compact />
                <StrikeZone onLocationSelect={(x, y) => setPitchLocation({ x, y })}
                    onTargetSelect={(x, y) => setTargetLocation({ x, y })}
                    onTargetClear={() => setTargetLocation(null)}
                    targetLocation={targetLocation} previousPitches={pitches} disabled={isLogging} compact />
                <ResultButtons selectedResult={selectedResult} onSelect={setSelectedResult} disabled={isLogging} compact />
                <Button mode="contained" onPress={handleLogPitch} disabled={!canLogPitch}
                    loading={isLogging} style={styles.logButton} contentStyle={styles.logButtonContent}>Log Pitch</Button>
            </ScrollView>
            {renderModals()}
            <InPlayModal visible={showInPlayModal} onDismiss={() => setShowInPlayModal(false)} onResult={handleInPlayResult} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
});
