import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';

import { LoadingScreen, ErrorScreen } from '../../../src/components/common';
import { fetchGameById, setCurrentGameRole } from '../../../src/state';
import { gamesApi } from '../../../src/state/games/api/gamesApi';

import LiveGamePhone from './LiveGamePhone';
import LiveGameTablet from './LiveGameTablet';
import { styles } from './liveGameStyles';
import { useLiveGameActions } from './useLiveGameActions';
import { useLiveGameController } from './useLiveGameController';

/**
 * Live-game screen orchestrator.
 *
 * State + effects live in `useLiveGameController`.
 * Action handlers live in `useLiveGameActions`.
 * UI lives in `LiveGameTablet` (landscape) and `LiveGamePhone` (everything else),
 * which compose shared small components from `LiveGameRenderHelpers`.
 *
 * This file is intentionally tiny — it only handles three things:
 *   1. Conditional returns for loading / error / role-select states.
 *   2. Picking which layout (tablet vs. phone) to render.
 *   3. Wiring the controller hook into both.
 */
export default function LiveGameScreen() {
    const ctl = useLiveGameController();
    const actions = useLiveGameActions(ctl);
    const { id, router, theme, dispatch, toast, isTablet, isLandscape, currentGameRole, gameStateLoading, loading, error, game } =
        ctl;

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

    return isTablet && isLandscape ? <LiveGameTablet ctl={ctl} actions={actions} /> : <LiveGamePhone ctl={ctl} actions={actions} />;
}
