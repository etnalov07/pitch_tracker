import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { PerformanceSummary, SummarySourceType, BatterBreakdown } from '@pitch-tracker/shared';
import { performanceSummaryApi } from './api/performanceSummaryApi';

interface PerformanceSummaryState {
    currentSummary: PerformanceSummary | null;
    pitcherSummaries: PerformanceSummary[];
    totalCount: number;
    batterBreakdown: BatterBreakdown[];
    loading: boolean;
    error: string | null;
}

const initialState: PerformanceSummaryState = {
    currentSummary: null,
    pitcherSummaries: [],
    totalCount: 0,
    batterBreakdown: [],
    loading: false,
    error: null,
};

export const fetchPerformanceSummary = createAsyncThunk(
    'performanceSummary/fetch',
    async (data: { sourceType: SummarySourceType; sourceId: string }) => {
        return await performanceSummaryApi.getSummary(data.sourceType, data.sourceId);
    }
);

export const fetchPitcherSummaries = createAsyncThunk(
    'performanceSummary/fetchByPitcher',
    async (data: { pitcherId: string; limit?: number; offset?: number }) => {
        return await performanceSummaryApi.getPitcherSummaries(data.pitcherId, data.limit, data.offset);
    }
);

export const regenerateNarrative = createAsyncThunk('performanceSummary/regenerateNarrative', async (id: string) => {
    return await performanceSummaryApi.regenerateNarrative(id);
});

export const fetchBatterBreakdown = createAsyncThunk('performanceSummary/fetchBatterBreakdown', async (gameId: string) => {
    return await performanceSummaryApi.getBatterBreakdown(gameId);
});

const performanceSummarySlice = createSlice({
    name: 'performanceSummary',
    initialState,
    reducers: {
        clearPerformanceSummary: (state) => {
            state.currentSummary = null;
            state.batterBreakdown = [];
            state.error = null;
        },
        clearPerformanceSummaryError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchPerformanceSummary.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPerformanceSummary.fulfilled, (state, action) => {
                state.loading = false;
                state.currentSummary = action.payload;
            })
            .addCase(fetchPerformanceSummary.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch summary';
            })
            .addCase(fetchPitcherSummaries.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPitcherSummaries.fulfilled, (state, action) => {
                state.loading = false;
                state.pitcherSummaries = action.payload.summaries;
                state.totalCount = action.payload.total_count;
            })
            .addCase(fetchPitcherSummaries.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch summaries';
            })
            .addCase(regenerateNarrative.fulfilled, (state, action) => {
                state.currentSummary = action.payload;
            })
            .addCase(fetchBatterBreakdown.fulfilled, (state, action) => {
                state.batterBreakdown = action.payload;
            });
    },
});

export const { clearPerformanceSummary, clearPerformanceSummaryError } = performanceSummarySlice.actions;
export default performanceSummarySlice.reducer;
