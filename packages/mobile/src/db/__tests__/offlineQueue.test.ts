// Verifies the AsyncStorage-backed offline queue that buffers pitches when a
// coach loses reception mid-game. (expo-sqlite was swapped for AsyncStorage for
// iOS 26.2; this pins the LOG_PITCH enqueue → read → remove contract.)

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: (k: string) => Promise.resolve(mockStore.has(k) ? mockStore.get(k)! : null),
        setItem: (k: string, v: string) => {
            mockStore.set(k, v);
            return Promise.resolve();
        },
        removeItem: (k: string) => {
            mockStore.delete(k);
            return Promise.resolve();
        },
    },
}));

import { queueAction, getPendingActions, getPendingActionCount, removeAction, clearAllActions } from '../offlineQueue';

describe('offlineQueue — LOG_PITCH buffering', () => {
    beforeEach(() => mockStore.clear());

    it('persists a queued pitch and reads it back with its payload', async () => {
        const id = await queueAction('LOG_PITCH', { at_bat_id: 'ab1', pitch_result: 'ball', balls_before: 0 });
        expect(id).toBeTruthy();

        const actions = await getPendingActions();
        expect(actions).toHaveLength(1);
        expect(actions[0].action_type).toBe('LOG_PITCH');
        expect(actions[0].payload).toEqual({ at_bat_id: 'ab1', pitch_result: 'ball', balls_before: 0 });
        expect(actions[0].retry_count).toBe(0);
        expect(await getPendingActionCount()).toBe(1);
    });

    it('preserves FIFO order so replay matches the pitch sequence', async () => {
        await queueAction('LOG_PITCH', { seq: 1 });
        await queueAction('LOG_PITCH', { seq: 2 });
        await queueAction('LOG_PITCH', { seq: 3 });

        const actions = await getPendingActions();
        expect(actions.map((a) => (a.payload as { seq: number }).seq)).toEqual([1, 2, 3]);
    });

    it('removes a synced action and can clear the whole buffer', async () => {
        const first = await queueAction('LOG_PITCH', { at_bat_id: 'ab1' });
        await queueAction('LOG_PITCH', { at_bat_id: 'ab2' });

        await removeAction(first);
        expect(await getPendingActionCount()).toBe(1);
        expect((await getPendingActions())[0].payload).toEqual({ at_bat_id: 'ab2' });

        await clearAllActions();
        expect(await getPendingActionCount()).toBe(0);
    });
});
