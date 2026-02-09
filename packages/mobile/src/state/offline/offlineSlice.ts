import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Offline support disabled for iOS 26.2 beta testing (TurboModule crash)
// This slice now maintains static "always online" state

interface OfflineState {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: number | null;
    syncError: string | null;
    networkType: string | null;
}

const initialState: OfflineState = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    syncError: null,
    networkType: 'wifi',
};

// No-op thunks - always return online state
export const checkNetworkStatus = createAsyncThunk('offline/checkNetworkStatus', async () => {
    return {
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
    };
});

export const loadPendingCount = createAsyncThunk('offline/loadPendingCount', async () => {
    return 0;
});

export const loadPendingActions = createAsyncThunk('offline/loadPendingActions', async () => {
    return [];
});

const offlineSlice = createSlice({
    name: 'offline',
    initialState,
    reducers: {
        setOnlineStatus: (state, action: PayloadAction<boolean>) => {
            state.isOnline = action.payload;
        },
        setSyncing: (state, action: PayloadAction<boolean>) => {
            state.isSyncing = action.payload;
        },
        setSyncError: (state, action: PayloadAction<string | null>) => {
            state.syncError = action.payload;
        },
        setLastSyncTime: (state, action: PayloadAction<number>) => {
            state.lastSyncTime = action.payload;
        },
        incrementPendingCount: (state) => {
            state.pendingCount += 1;
        },
        decrementPendingCount: (state) => {
            state.pendingCount = Math.max(0, state.pendingCount - 1);
        },
        setPendingCount: (state, action: PayloadAction<number>) => {
            state.pendingCount = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkNetworkStatus.fulfilled, (state, action) => {
                state.isOnline = action.payload.isConnected && action.payload.isInternetReachable;
                state.networkType = action.payload.type;
            })
            .addCase(loadPendingCount.fulfilled, (state, action) => {
                state.pendingCount = action.payload;
            });
    },
});

export const {
    setOnlineStatus,
    setSyncing,
    setSyncError,
    setLastSyncTime,
    incrementPendingCount,
    decrementPendingCount,
    setPendingCount,
} = offlineSlice.actions;

export default offlineSlice.reducer;
