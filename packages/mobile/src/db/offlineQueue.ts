import { getDatabase } from './schema';

export type OfflineActionType =
    | 'LOG_PITCH'
    | 'CREATE_AT_BAT'
    | 'UPDATE_AT_BAT'
    | 'RECORD_PLAY'
    | 'START_GAME'
    | 'END_GAME'
    | 'ADVANCE_INNING';

export interface OfflineAction {
    id: string;
    action_type: OfflineActionType;
    payload: Record<string, unknown>;
    created_at: number;
    retry_count: number;
    last_error?: string;
    last_attempt_at?: number;
}

// Generate a simple UUID without external dependency
const generateId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export const queueAction = async (actionType: OfflineActionType, payload: object): Promise<string> => {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO pending_actions (id, action_type, payload, created_at, retry_count)
         VALUES (?, ?, ?, ?, 0)`,
        [id, actionType, JSON.stringify(payload), now]
    );

    return id;
};

export const getPendingActions = async (): Promise<OfflineAction[]> => {
    const db = await getDatabase();
    const results = await db.getAllAsync<{
        id: string;
        action_type: string;
        payload: string;
        created_at: number;
        retry_count: number;
        last_error: string | null;
        last_attempt_at: number | null;
    }>('SELECT * FROM pending_actions ORDER BY created_at ASC');

    return results.map((row) => ({
        id: row.id,
        action_type: row.action_type as OfflineActionType,
        payload: JSON.parse(row.payload),
        created_at: row.created_at,
        retry_count: row.retry_count,
        last_error: row.last_error ?? undefined,
        last_attempt_at: row.last_attempt_at ?? undefined,
    }));
};

export const getPendingActionCount = async (): Promise<number> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM pending_actions');
    return result?.count ?? 0;
};

export const removeAction = async (id: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM pending_actions WHERE id = ?', [id]);
};

export const updateActionRetry = async (id: string, error: string): Promise<void> => {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
        `UPDATE pending_actions
         SET retry_count = retry_count + 1,
             last_error = ?,
             last_attempt_at = ?
         WHERE id = ?`,
        [error, now, id]
    );
};

export const clearAllActions = async (): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM pending_actions');
};

// Cache operations for games
export const cacheGame = async (gameId: string, data: unknown): Promise<void> => {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
        `INSERT OR REPLACE INTO cached_games (id, data, updated_at)
         VALUES (?, ?, ?)`,
        [gameId, JSON.stringify(data), now]
    );
};

export const getCachedGame = async <T>(gameId: string): Promise<T | null> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ data: string }>('SELECT data FROM cached_games WHERE id = ?', [gameId]);
    return result ? JSON.parse(result.data) : null;
};

export const cacheGameState = async (gameId: string, data: unknown): Promise<void> => {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync(
        `INSERT OR REPLACE INTO cached_game_states (game_id, data, updated_at)
         VALUES (?, ?, ?)`,
        [gameId, JSON.stringify(data), now]
    );
};

export const getCachedGameState = async <T>(gameId: string): Promise<T | null> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ data: string }>('SELECT data FROM cached_game_states WHERE game_id = ?', [gameId]);
    return result ? JSON.parse(result.data) : null;
};

// Sync metadata
export const setSyncMetadata = async (key: string, value: string): Promise<void> => {
    const db = await getDatabase();
    await db.runAsync(`INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`, [key, value]);
};

export const getSyncMetadata = async (key: string): Promise<string | null> => {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM sync_metadata WHERE key = ?', [key]);
    return result?.value ?? null;
};
