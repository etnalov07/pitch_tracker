import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage-based offline DB replacement
// (expo-sqlite crashes on iOS 26.2 beta)

interface SimpleDB {
    runAsync(sql: string, params?: unknown[]): Promise<void>;
    getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
    getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
    execAsync(sql: string): Promise<void>;
    closeAsync(): Promise<void>;
}

const STORAGE_PREFIX = 'offline_db:';

const createAsyncStorageDB = (): SimpleDB => {
    const getKey = (table: string) => `${STORAGE_PREFIX}${table}`;

    const getTable = async <T>(table: string): Promise<T[]> => {
        const raw = await AsyncStorage.getItem(getKey(table));
        return raw ? JSON.parse(raw) : [];
    };

    const setTable = async <T>(table: string, data: T[]): Promise<void> => {
        await AsyncStorage.setItem(getKey(table), JSON.stringify(data));
    };

    return {
        async runAsync(sql: string, params?: unknown[]): Promise<void> {
            // Parse simple SQL operations
            const insertMatch = sql.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+(\w+)/i);
            const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
            const updateMatch = sql.match(/UPDATE\s+(\w+)/i);

            if (insertMatch) {
                const table = insertMatch[1];
                const rows = await getTable<Record<string, unknown>>(table);
                const newRow: Record<string, unknown> = {};

                // For pending_actions
                if (table === 'pending_actions' && params) {
                    newRow.id = params[0];
                    newRow.action_type = params[1];
                    newRow.payload = params[2];
                    newRow.created_at = params[3];
                    newRow.retry_count = params[4] ?? 0;
                }
                // For cached_games
                if (table === 'cached_games' && params) {
                    const existing = rows.findIndex((r) => r.id === params[0]);
                    if (existing >= 0) rows.splice(existing, 1);
                    newRow.id = params[0];
                    newRow.data = params[1];
                    newRow.updated_at = params[2];
                }
                // For cached_game_states
                if (table === 'cached_game_states' && params) {
                    const existing = rows.findIndex((r) => r.game_id === params[0]);
                    if (existing >= 0) rows.splice(existing, 1);
                    newRow.game_id = params[0];
                    newRow.data = params[1];
                    newRow.updated_at = params[2];
                }
                // For sync_metadata
                if (table === 'sync_metadata' && params) {
                    const existing = rows.findIndex((r) => r.key === params[0]);
                    if (existing >= 0) rows.splice(existing, 1);
                    newRow.key = params[0];
                    newRow.value = params[1];
                }

                rows.push(newRow);
                await setTable(table, rows);
            } else if (deleteMatch) {
                const table = deleteMatch[1];
                if (params && params.length > 0) {
                    const rows = await getTable<Record<string, unknown>>(table);
                    const filtered = rows.filter((r) => r.id !== params[0]);
                    await setTable(table, filtered);
                } else {
                    await setTable(table, []);
                }
            } else if (updateMatch) {
                const table = updateMatch[1];
                if (table === 'pending_actions' && params) {
                    const rows = await getTable<Record<string, unknown>>(table);
                    const id = params[params.length - 1];
                    const updated = rows.map((r) => {
                        if (r.id === id) {
                            return {
                                ...r,
                                retry_count: ((r.retry_count as number) || 0) + 1,
                                last_error: params[0],
                                last_attempt_at: params[1],
                            };
                        }
                        return r;
                    });
                    await setTable(table, updated);
                }
            }
        },
        async getAllAsync<T>(sql: string, _params?: unknown[]): Promise<T[]> {
            const tableMatch = sql.match(/FROM\s+(\w+)/i);
            if (!tableMatch) return [];
            const rows = await getTable<T>(tableMatch[1]);
            return rows;
        },
        async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
            const tableMatch = sql.match(/FROM\s+(\w+)/i);
            if (!tableMatch) return null;
            const rows = await getTable<Record<string, unknown>>(tableMatch[1]);

            if (sql.includes('COUNT(*)')) {
                return { count: rows.length } as unknown as T;
            }

            if (params && params.length > 0) {
                const match = rows.find((r) => r.id === params[0] || r.key === params[0] || r.game_id === params[0]);
                return (match as unknown as T) ?? null;
            }

            return (rows[0] as unknown as T) ?? null;
        },
        async execAsync(_sql: string): Promise<void> {
            // Schema creation is a no-op with AsyncStorage
        },
        async closeAsync(): Promise<void> {
            // No-op
        },
    };
};

let db: SimpleDB | null = null;

export type SQLiteDatabase = SimpleDB;

export const getDatabase = async (): Promise<SimpleDB> => {
    if (!db) {
        db = createAsyncStorageDB();
    }
    return db;
};

export const closeDatabase = async (): Promise<void> => {
    db = null;
};
