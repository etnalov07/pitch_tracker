import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PitchCall, PitchCallWithDetails, PitchCallAbbrev, PitchCallZone, PitchCallGameSummary } from '@pitch-tracker/shared';
import { pitchCallingApi } from './api/pitchCallingApi';

interface PitchCallingState {
    calls: PitchCallWithDetails[];
    activeCall: PitchCallWithDetails | null;
    summary: PitchCallGameSummary | null;
    loading: boolean;
    sendingCall: boolean;
    error: string | null;
}

const initialState: PitchCallingState = {
    calls: [],
    activeCall: null,
    summary: null,
    loading: false,
    sendingCall: false,
    error: null,
};

// Async thunks
export const createPitchCall = createAsyncThunk(
    'pitchCalling/createCall',
    async (data: {
        game_id: string;
        team_id: string;
        pitch_type: PitchCallAbbrev;
        zone: PitchCallZone;
        at_bat_id?: string;
        pitcher_id?: string;
        batter_id?: string;
        opponent_batter_id?: string;
        inning?: number;
        balls_before?: number;
        strikes_before?: number;
    }) => {
        return await pitchCallingApi.createCall(data);
    }
);

export const changePitchCall = createAsyncThunk(
    'pitchCalling/changeCall',
    async (data: { callId: string; pitch_type: PitchCallAbbrev; zone: PitchCallZone }) => {
        return await pitchCallingApi.changeCall(data.callId, {
            pitch_type: data.pitch_type,
            zone: data.zone,
        });
    }
);

export const markCallTransmitted = createAsyncThunk('pitchCalling/markTransmitted', async (callId: string) => {
    return await pitchCallingApi.markTransmitted(callId);
});

export const logCallResult = createAsyncThunk(
    'pitchCalling/logResult',
    async (data: { callId: string; result: string; pitchId?: string }) => {
        return await pitchCallingApi.logResult(data.callId, data.result, data.pitchId);
    }
);

export const fetchGameCalls = createAsyncThunk('pitchCalling/fetchGameCalls', async (gameId: string) => {
    return await pitchCallingApi.getGameCalls(gameId);
});

export const fetchActiveCall = createAsyncThunk('pitchCalling/fetchActiveCall', async (gameId: string) => {
    return await pitchCallingApi.getActiveCall(gameId);
});

export const fetchCallGameSummary = createAsyncThunk('pitchCalling/fetchGameSummary', async (gameId: string) => {
    return await pitchCallingApi.getGameSummary(gameId);
});

const pitchCallingSlice = createSlice({
    name: 'pitchCalling',
    initialState,
    reducers: {
        clearPitchCalling: (state) => {
            state.calls = [];
            state.activeCall = null;
            state.summary = null;
            state.error = null;
        },
        clearPitchCallingError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Create call
        builder
            .addCase(createPitchCall.pending, (state) => {
                state.sendingCall = true;
                state.error = null;
            })
            .addCase(createPitchCall.fulfilled, (state, action) => {
                state.sendingCall = false;
                state.activeCall = action.payload as unknown as PitchCallWithDetails;
                state.calls.push(action.payload as unknown as PitchCallWithDetails);
            })
            .addCase(createPitchCall.rejected, (state, action) => {
                state.sendingCall = false;
                state.error = action.error.message || 'Failed to create pitch call';
            });

        // Change call
        builder
            .addCase(changePitchCall.pending, (state) => {
                state.sendingCall = true;
                state.error = null;
            })
            .addCase(changePitchCall.fulfilled, (state, action) => {
                state.sendingCall = false;
                state.activeCall = action.payload as unknown as PitchCallWithDetails;
                state.calls.push(action.payload as unknown as PitchCallWithDetails);
            })
            .addCase(changePitchCall.rejected, (state, action) => {
                state.sendingCall = false;
                state.error = action.error.message || 'Failed to change pitch call';
            });

        // Mark transmitted
        builder.addCase(markCallTransmitted.fulfilled, (state, action) => {
            const call = action.payload;
            if (state.activeCall?.id === call.id) {
                state.activeCall.bt_transmitted = true;
            }
            const idx = state.calls.findIndex((c) => c.id === call.id);
            if (idx >= 0) {
                state.calls[idx].bt_transmitted = true;
            }
        });

        // Log result
        builder.addCase(logCallResult.fulfilled, (state, action) => {
            const call = action.payload;
            // Update in calls list
            const idx = state.calls.findIndex((c) => c.id === call.id);
            if (idx >= 0) {
                state.calls[idx].result = call.result;
                state.calls[idx].result_logged_at = call.result_logged_at;
            }
            // Clear active call — ready for next pitch
            state.activeCall = null;
        });

        // Fetch game calls
        builder
            .addCase(fetchGameCalls.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchGameCalls.fulfilled, (state, action) => {
                state.loading = false;
                state.calls = action.payload;
            })
            .addCase(fetchGameCalls.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch calls';
            });

        // Fetch active call
        builder.addCase(fetchActiveCall.fulfilled, (state, action) => {
            state.activeCall = action.payload;
        });

        // Fetch game summary
        builder.addCase(fetchCallGameSummary.fulfilled, (state, action) => {
            state.summary = action.payload;
        });
    },
});

export const { clearPitchCalling, clearPitchCallingError } = pitchCallingSlice.actions;
export default pitchCallingSlice.reducer;
