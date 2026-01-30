import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Team, Player, PlayerWithPitchTypes } from '@pitch-tracker/shared';
import { teamsApi } from './api/teamsApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

interface TeamsSliceState {
    teams: Team[];
    selectedTeam: Team | null;
    players: PlayerWithPitchTypes[];
    loading: boolean;
    playersLoading: boolean;
    error: string | null;
}

const initialState: TeamsSliceState = {
    teams: [],
    selectedTeam: null,
    players: [],
    loading: false,
    playersLoading: false,
    error: null,
};

// Async Thunks
export const fetchAllTeams = createAsyncThunk('teams/fetchAll', async (_, { rejectWithValue }) => {
    try {
        return await teamsApi.getAllTeams();
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch teams'));
    }
});

export const fetchTeamById = createAsyncThunk('teams/fetchById', async (teamId: string, { rejectWithValue }) => {
    try {
        return await teamsApi.getTeamById(teamId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch team'));
    }
});

export const createTeam = createAsyncThunk('teams/create', async (teamData: Partial<Team>, { rejectWithValue }) => {
    try {
        return await teamsApi.createTeam(teamData);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to create team'));
    }
});

export const updateTeam = createAsyncThunk(
    'teams/update',
    async ({ id, data }: { id: string; data: Partial<Team> }, { rejectWithValue }) => {
        try {
            return await teamsApi.updateTeam(id, data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update team'));
        }
    }
);

export const deleteTeam = createAsyncThunk('teams/delete', async (teamId: string, { rejectWithValue }) => {
    try {
        await teamsApi.deleteTeam(teamId);
        return teamId;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete team'));
    }
});

export const fetchTeamPlayers = createAsyncThunk('teams/fetchPlayers', async (teamId: string, { rejectWithValue }) => {
    try {
        return await teamsApi.getTeamPlayers(teamId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch players'));
    }
});

export const addPlayer = createAsyncThunk(
    'teams/addPlayer',
    async ({ teamId, data }: { teamId: string; data: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.addPlayer(teamId, data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add player'));
        }
    }
);

export const updatePlayer = createAsyncThunk(
    'teams/updatePlayer',
    async ({ playerId, data }: { playerId: string; data: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.updatePlayer(playerId, data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update player'));
        }
    }
);

export const deletePlayer = createAsyncThunk('teams/deletePlayer', async (playerId: string, { rejectWithValue }) => {
    try {
        await teamsApi.deletePlayer(playerId);
        return playerId;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete player'));
    }
});

const teamsSlice = createSlice({
    name: 'teams',
    initialState,
    reducers: {
        clearTeamsError: (state) => {
            state.error = null;
        },
        clearSelectedTeam: (state) => {
            state.selectedTeam = null;
            state.players = [];
        },
        setSelectedTeam: (state, action: PayloadAction<Team>) => {
            state.selectedTeam = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all teams
            .addCase(fetchAllTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.teams = action.payload;
            })
            .addCase(fetchAllTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch team by ID
            .addCase(fetchTeamById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeamById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedTeam = action.payload;
            })
            .addCase(fetchTeamById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Create team
            .addCase(createTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.teams.push(action.payload);
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Update team
            .addCase(updateTeam.fulfilled, (state, action) => {
                const index = state.teams.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.teams[index] = action.payload;
                }
                if (state.selectedTeam?.id === action.payload.id) {
                    state.selectedTeam = action.payload;
                }
            })
            // Delete team
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.teams = state.teams.filter((t) => t.id !== action.payload);
                if (state.selectedTeam?.id === action.payload) {
                    state.selectedTeam = null;
                }
            })
            // Fetch players
            .addCase(fetchTeamPlayers.pending, (state) => {
                state.playersLoading = true;
            })
            .addCase(fetchTeamPlayers.fulfilled, (state, action) => {
                state.playersLoading = false;
                state.players = action.payload;
            })
            .addCase(fetchTeamPlayers.rejected, (state, action) => {
                state.playersLoading = false;
                state.error = action.payload as string;
            })
            // Add player
            .addCase(addPlayer.fulfilled, (state, action) => {
                state.players.push(action.payload as PlayerWithPitchTypes);
            })
            // Update player
            .addCase(updatePlayer.fulfilled, (state, action) => {
                const index = state.players.findIndex((p) => p.id === action.payload.id);
                if (index !== -1) {
                    state.players[index] = action.payload as PlayerWithPitchTypes;
                }
            })
            // Delete player
            .addCase(deletePlayer.fulfilled, (state, action) => {
                state.players = state.players.filter((p) => p.id !== action.payload);
            });
    },
});

export const { clearTeamsError, clearSelectedTeam, setSelectedTeam } = teamsSlice.actions;

export default teamsSlice.reducer;
