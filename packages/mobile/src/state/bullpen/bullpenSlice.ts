import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    BullpenSession,
    BullpenSessionWithDetails,
    BullpenPitch,
    BullpenSessionSummary,
} from '@pitch-tracker/shared';
import { bullpenApi } from './api/bullpenApi';

interface BullpenState {
    sessions: BullpenSessionWithDetails[];
    currentSession: BullpenSessionWithDetails | null;
    pitches: BullpenPitch[];
    summary: BullpenSessionSummary | null;
    loading: boolean;
    error: string | null;
}

const initialState: BullpenState = {
    sessions: [],
    currentSession: null,
    pitches: [],
    summary: null,
    loading: false,
    error: null,
};

// Async thunks
export const createBullpenSession = createAsyncThunk(
    'bullpen/createSession',
    async (data: { team_id: string; pitcher_id: string; intensity?: string; plan_id?: string }) => {
        return await bullpenApi.createSession(data);
    }
);

export const fetchBullpenSession = createAsyncThunk(
    'bullpen/fetchSession',
    async (sessionId: string) => {
        return await bullpenApi.getSession(sessionId);
    }
);

export const fetchBullpenSessions = createAsyncThunk(
    'bullpen/fetchSessions',
    async ({ teamId, pitcherId }: { teamId: string; pitcherId?: string }) => {
        return await bullpenApi.getTeamSessions(teamId, pitcherId);
    }
);

export const endBullpenSession = createAsyncThunk(
    'bullpen/endSession',
    async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
        return await bullpenApi.endSession(sessionId, notes);
    }
);

export const logBullpenPitch = createAsyncThunk(
    'bullpen/logPitch',
    async (data: {
        session_id: string;
        pitch_type: string;
        target_x?: number;
        target_y?: number;
        actual_x?: number;
        actual_y?: number;
        velocity?: number;
        result: string;
    }) => {
        return await bullpenApi.logPitch(data);
    }
);

export const fetchSessionPitches = createAsyncThunk(
    'bullpen/fetchPitches',
    async (sessionId: string) => {
        return await bullpenApi.getSessionPitches(sessionId);
    }
);

export const fetchSessionSummary = createAsyncThunk(
    'bullpen/fetchSummary',
    async (sessionId: string) => {
        return await bullpenApi.getSessionSummary(sessionId);
    }
);

const bullpenSlice = createSlice({
    name: 'bullpen',
    initialState,
    reducers: {
        clearCurrentSession: (state) => {
            state.currentSession = null;
            state.pitches = [];
            state.summary = null;
        },
        clearBullpenError: (state) => {
            state.error = null;
        },
        addBullpenPitch: (state, action: PayloadAction<BullpenPitch>) => {
            state.pitches.push(action.payload);
        },
    },
    extraReducers: (builder) => {
        // Create session
        builder
            .addCase(createBullpenSession.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createBullpenSession.fulfilled, (state, action) => {
                state.loading = false;
                // Session is returned as BullpenSession, but we set it as the currentSession
                // Full details will be fetched separately
                state.currentSession = null;
            })
            .addCase(createBullpenSession.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to create session';
            });

        // Fetch session
        builder
            .addCase(fetchBullpenSession.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBullpenSession.fulfilled, (state, action) => {
                state.loading = false;
                state.currentSession = action.payload;
            })
            .addCase(fetchBullpenSession.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch session';
            });

        // Fetch sessions list
        builder
            .addCase(fetchBullpenSessions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBullpenSessions.fulfilled, (state, action) => {
                state.loading = false;
                state.sessions = action.payload;
            })
            .addCase(fetchBullpenSessions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch sessions';
            });

        // End session
        builder
            .addCase(endBullpenSession.fulfilled, (state, action) => {
                if (state.currentSession) {
                    state.currentSession.status = 'completed';
                    if (action.meta.arg.notes) {
                        state.currentSession.notes = action.meta.arg.notes;
                    }
                }
            });

        // Log pitch
        builder
            .addCase(logBullpenPitch.fulfilled, (state, action) => {
                state.pitches.push(action.payload);
                // Update current session counts
                if (state.currentSession) {
                    state.currentSession.total_pitches = state.pitches.length;
                    const strikes = state.pitches.filter(p =>
                        ['called_strike', 'swinging_strike', 'foul'].includes(p.result)
                    ).length;
                    const balls = state.pitches.filter(p => p.result === 'ball').length;
                    state.currentSession.strikes = strikes;
                    state.currentSession.balls = balls;
                }
            });

        // Fetch pitches
        builder
            .addCase(fetchSessionPitches.fulfilled, (state, action) => {
                state.pitches = action.payload;
            });

        // Fetch summary
        builder
            .addCase(fetchSessionSummary.fulfilled, (state, action) => {
                state.summary = action.payload;
            });
    },
});

export const { clearCurrentSession, clearBullpenError, addBullpenPitch } = bullpenSlice.actions;
export default bullpenSlice.reducer;
