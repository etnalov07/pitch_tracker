import * as Network from 'expo-network';
import { store } from '../state/store';
import {
    setOnlineStatus,
    setSyncing,
    setSyncError,
    setLastSyncTime,
    decrementPendingCount,
    loadPendingCount,
} from '../state/offline/offlineSlice';
import { getPendingActions, removeAction, updateActionRetry, OfflineAction } from '../db/offlineQueue';
import { gamesApi } from '../state/games/api/gamesApi';
import { AtBat, Pitch, Play } from '@pitch-tracker/shared';

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

let syncInterval: ReturnType<typeof setInterval> | null = null;
let networkSubscription: { remove: () => void } | null = null;

// Execute a single queued action
const executeAction = async (action: OfflineAction): Promise<void> => {
    const { action_type, payload } = action;

    switch (action_type) {
        case 'LOG_PITCH':
            await gamesApi.logPitch(payload as Partial<Pitch>);
            break;
        case 'CREATE_AT_BAT':
            await gamesApi.createAtBat(payload as Partial<AtBat>);
            break;
        case 'UPDATE_AT_BAT': {
            const { at_bat_id, ...updateData } = payload as { at_bat_id: string } & Partial<AtBat>;
            await gamesApi.updateAtBat(at_bat_id, updateData);
            break;
        }
        case 'RECORD_PLAY':
            await gamesApi.recordPlay(payload as Partial<Play>);
            break;
        case 'START_GAME':
            await gamesApi.startGame((payload as { game_id: string }).game_id);
            break;
        case 'END_GAME': {
            const endPayload = payload as { game_id: string; home_score: number; away_score: number };
            await gamesApi.endGame(endPayload.game_id, {
                home_score: endPayload.home_score,
                away_score: endPayload.away_score,
            });
            break;
        }
        case 'ADVANCE_INNING':
            await gamesApi.advanceInning((payload as { game_id: string }).game_id);
            break;
        default:
            throw new Error(`Unknown action type: ${action_type}`);
    }
};

// Sync all pending actions
export const syncPendingActions = async (): Promise<{
    synced: number;
    failed: number;
    remaining: number;
}> => {
    const state = store.getState();
    if (!state.offline.isOnline || state.offline.isSyncing) {
        return { synced: 0, failed: 0, remaining: state.offline.pendingCount };
    }

    store.dispatch(setSyncing(true));
    store.dispatch(setSyncError(null));

    let synced = 0;
    let failed = 0;

    try {
        const actions = await getPendingActions();

        for (const action of actions) {
            // Check if we're still online
            const networkState = await Network.getNetworkStateAsync();
            if (!networkState.isConnected || !networkState.isInternetReachable) {
                store.dispatch(setOnlineStatus(false));
                break;
            }

            try {
                await executeAction(action);
                await removeAction(action.id);
                store.dispatch(decrementPendingCount());
                synced++;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (action.retry_count >= MAX_RETRIES) {
                    // Max retries reached, remove the action
                    await removeAction(action.id);
                    store.dispatch(decrementPendingCount());
                    failed++;
                    console.warn(`Action ${action.id} failed after ${MAX_RETRIES} retries:`, errorMessage);
                } else {
                    // Update retry count
                    await updateActionRetry(action.id, errorMessage);
                    failed++;
                }
            }
        }

        store.dispatch(setLastSyncTime(Date.now()));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sync failed';
        store.dispatch(setSyncError(errorMessage));
    } finally {
        store.dispatch(setSyncing(false));
    }

    const remaining = (await getPendingActions()).length;
    return { synced, failed, remaining };
};

// Handle network state changes
const handleNetworkChange = (state: Network.NetworkState): void => {
    const isOnline = (state.isConnected ?? false) && (state.isInternetReachable ?? false);
    store.dispatch(setOnlineStatus(isOnline));

    if (isOnline) {
        // Trigger sync when coming back online
        syncPendingActions();
    }
};

// Start the offline service
export const startOfflineService = async (): Promise<void> => {
    try {
        // Load initial pending count
        await store.dispatch(loadPendingCount());
    } catch (err) {
        console.warn('Failed to load pending count:', err);
    }

    try {
        // Check initial network state
        const networkState = await Network.getNetworkStateAsync();
        handleNetworkChange(networkState);
    } catch (err) {
        console.warn('Failed to get network state:', err);
        // Default to online if we can't check
        store.dispatch(setOnlineStatus(true));
    }

    try {
        // Subscribe to network changes
        networkSubscription = Network.addNetworkStateListener(handleNetworkChange);
    } catch (err) {
        console.warn('Failed to subscribe to network changes:', err);
    }

    // Start periodic sync
    syncInterval = setInterval(async () => {
        const state = store.getState();
        if (state.offline.isOnline && state.offline.pendingCount > 0) {
            await syncPendingActions();
        }
    }, SYNC_INTERVAL);
};

// Stop the offline service
export const stopOfflineService = (): void => {
    if (networkSubscription) {
        networkSubscription.remove();
        networkSubscription = null;
    }

    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};

// Manual sync trigger
export const triggerSync = async (): Promise<{
    synced: number;
    failed: number;
    remaining: number;
}> => {
    return syncPendingActions();
};
