import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { CreateOpponentTeamParams, OpponentTeam, OpponentTeamWithRoster } from '@pitch-tracker/shared';
import opponentsApi from './api/opponentsApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

interface OpponentsSliceState {
    opponents: OpponentTeam[];
    selectedOpponent: OpponentTeamWithRoster | null;
    loading: boolean;
    detailLoading: boolean;
    error: string | null;
}

const initialState: OpponentsSliceState = {
    opponents: [],
    selectedOpponent: null,
    loading: false,
    detailLoading: false,
    error: null,
};

export const fetchOpponents = createAsyncThunk('opponents/fetchAll', async (teamId: string, { rejectWithValue }) => {
    try {
        return await opponentsApi.list(teamId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch opponents'));
    }
});

export const fetchOpponentById = createAsyncThunk(
    'opponents/fetchById',
    async ({ teamId, id }: { teamId: string; id: string }, { rejectWithValue }) => {
        try {
            return await opponentsApi.getById(teamId, id);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch opponent'));
        }
    }
);

export const createOpponent = createAsyncThunk(
    'opponents/create',
    async ({ teamId, params }: { teamId: string; params: CreateOpponentTeamParams }, { rejectWithValue }) => {
        try {
            return await opponentsApi.create(teamId, params);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create opponent'));
        }
    }
);

const opponentsSlice = createSlice({
    name: 'opponents',
    initialState,
    reducers: {
        clearOpponentsError(state) {
            state.error = null;
        },
        clearSelectedOpponent(state) {
            state.selectedOpponent = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchOpponents.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOpponents.fulfilled, (state, action) => {
                state.loading = false;
                state.opponents = action.payload;
            })
            .addCase(fetchOpponents.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchOpponentById.pending, (state) => {
                state.detailLoading = true;
                state.error = null;
            })
            .addCase(fetchOpponentById.fulfilled, (state, action) => {
                state.detailLoading = false;
                state.selectedOpponent = action.payload;
            })
            .addCase(fetchOpponentById.rejected, (state, action) => {
                state.detailLoading = false;
                state.error = action.payload as string;
            })
            .addCase(createOpponent.fulfilled, (state, action) => {
                state.opponents.push(action.payload);
            });
    },
});

export const { clearOpponentsError, clearSelectedOpponent } = opponentsSlice.actions;
export default opponentsSlice.reducer;
