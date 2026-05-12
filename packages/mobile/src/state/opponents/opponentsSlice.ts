import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
    BatterScoutingProfile,
    CreateBatterScoutingProfileParams,
    CreateOpponentPitcherProfileParams,
    CreateOpponentTeamParams,
    OpponentPitcherProfile,
    OpponentTeam,
    OpponentTeamWithRoster,
    UpdateBatterScoutingProfileParams,
    UpdateOpponentPitcherProfileParams,
} from '@pitch-tracker/shared';
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

export const addOpponentPitcher = createAsyncThunk(
    'opponents/addPitcher',
    async (
        { opponentTeamId, params }: { opponentTeamId: string; params: CreateOpponentPitcherProfileParams },
        { rejectWithValue }
    ) => {
        try {
            return await opponentsApi.createPitcher(opponentTeamId, params);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add pitcher'));
        }
    }
);

export const updateOpponentPitcher = createAsyncThunk(
    'opponents/updatePitcher',
    async ({ id, params }: { id: string; params: UpdateOpponentPitcherProfileParams }, { rejectWithValue }) => {
        try {
            return await opponentsApi.updatePitcher(id, params);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update pitcher'));
        }
    }
);

export const deleteOpponentPitcher = createAsyncThunk('opponents/deletePitcher', async (id: string, { rejectWithValue }) => {
    try {
        await opponentsApi.deletePitcher(id);
        return id;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete pitcher'));
    }
});

export const addOpponentBatter = createAsyncThunk(
    'opponents/addBatter',
    async (
        { opponentTeamId, params }: { opponentTeamId: string; params: CreateBatterScoutingProfileParams },
        { rejectWithValue }
    ) => {
        try {
            return await opponentsApi.createBatter(opponentTeamId, params);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add batter'));
        }
    }
);

export const updateOpponentBatter = createAsyncThunk(
    'opponents/updateBatter',
    async ({ id, params }: { id: string; params: UpdateBatterScoutingProfileParams }, { rejectWithValue }) => {
        try {
            return await opponentsApi.updateBatter(id, params);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update batter'));
        }
    }
);

export const deleteOpponentBatter = createAsyncThunk('opponents/deleteBatter', async (id: string, { rejectWithValue }) => {
    try {
        await opponentsApi.deleteBatter(id);
        return id;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete batter'));
    }
});

const sortPitchers = (arr: OpponentPitcherProfile[]) => [...arr].sort((a, b) => a.pitcher_name.localeCompare(b.pitcher_name));
const sortBatters = (arr: BatterScoutingProfile[]) => [...arr].sort((a, b) => a.player_name.localeCompare(b.player_name));

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
            })
            .addCase(addOpponentPitcher.fulfilled, (state, action) => {
                if (state.selectedOpponent && state.selectedOpponent.id === action.payload.opponent_team_id) {
                    state.selectedOpponent.pitchers = sortPitchers([...state.selectedOpponent.pitchers, action.payload]);
                }
            })
            .addCase(updateOpponentPitcher.fulfilled, (state, action) => {
                if (state.selectedOpponent) {
                    state.selectedOpponent.pitchers = sortPitchers(
                        state.selectedOpponent.pitchers.map((p) => (p.id === action.payload.id ? action.payload : p))
                    );
                }
            })
            .addCase(deleteOpponentPitcher.fulfilled, (state, action) => {
                if (state.selectedOpponent) {
                    state.selectedOpponent.pitchers = state.selectedOpponent.pitchers.filter((p) => p.id !== action.payload);
                }
            })
            .addCase(addOpponentBatter.fulfilled, (state, action) => {
                if (state.selectedOpponent && state.selectedOpponent.id === action.payload.opponent_team_id) {
                    state.selectedOpponent.batters = sortBatters([...state.selectedOpponent.batters, action.payload]);
                }
            })
            .addCase(updateOpponentBatter.fulfilled, (state, action) => {
                if (state.selectedOpponent) {
                    state.selectedOpponent.batters = sortBatters(
                        state.selectedOpponent.batters.map((b) => (b.id === action.payload.id ? action.payload : b))
                    );
                }
            })
            .addCase(deleteOpponentBatter.fulfilled, (state, action) => {
                if (state.selectedOpponent) {
                    state.selectedOpponent.batters = state.selectedOpponent.batters.filter((b) => b.id !== action.payload);
                }
            });
    },
});

export const { clearOpponentsError, clearSelectedOpponent } = opponentsSlice.actions;
export default opponentsSlice.reducer;
