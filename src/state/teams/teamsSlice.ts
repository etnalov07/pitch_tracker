import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Team, Player } from '../../types';
import { teamsApi } from './api/teamsApi';

interface TeamsState {
    teamList: Team[];
    selectedTeam: Team | null;
    roster: Player[];
    loading: boolean;
    rosterLoading: boolean;
    error: string | null;
}

const initialState: TeamsState = {
    teamList: [],
    selectedTeam: null,
    roster: [],
    loading: false,
    rosterLoading: false,
    error: null,
};

// Async Thunks
export const fetchAllTeams = createAsyncThunk('teams/fetchAll', async (_, { rejectWithValue }) => {
    try {
        return await teamsApi.getAllTeams();
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch teams');
    }
});

export const fetchTeamById = createAsyncThunk('teams/fetchById', async (teamId: string, { rejectWithValue }) => {
    try {
        return await teamsApi.getTeamById(teamId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch team');
    }
});

export const createTeam = createAsyncThunk('teams/create', async (teamData: Partial<Team>, { rejectWithValue }) => {
    try {
        return await teamsApi.createTeam(teamData);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to create team');
    }
});

export const updateTeam = createAsyncThunk(
    'teams/update',
    async ({ id, data }: { id: string; data: Partial<Team> }, { rejectWithValue }) => {
        try {
            return await teamsApi.updateTeam(id, data);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update team');
        }
    }
);

export const deleteTeam = createAsyncThunk('teams/delete', async (teamId: string, { rejectWithValue }) => {
    try {
        await teamsApi.deleteTeam(teamId);
        return teamId;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to delete team');
    }
});

export const fetchTeamRoster = createAsyncThunk('teams/fetchRoster', async (teamId: string, { rejectWithValue }) => {
    try {
        return await teamsApi.getTeamRoster(teamId);
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch roster');
    }
});

export const addPlayerToTeam = createAsyncThunk(
    'teams/addPlayer',
    async ({ teamId, playerData }: { teamId: string; playerData: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.addPlayer(teamId, playerData);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to add player');
        }
    }
);

export const updatePlayer = createAsyncThunk(
    'teams/updatePlayer',
    async ({ playerId, playerData }: { playerId: string; playerData: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.updatePlayer(playerId, playerData);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.error || 'Failed to update player');
        }
    }
);

export const deletePlayer = createAsyncThunk('teams/deletePlayer', async (playerId: string, { rejectWithValue }) => {
    try {
        await teamsApi.deletePlayer(playerId);
        return playerId;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to delete player');
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
            state.roster = [];
        },
        setSelectedTeam: (state, action: PayloadAction<Team>) => {
            state.selectedTeam = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch All Teams
        builder
            .addCase(fetchAllTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllTeams.fulfilled, (state, action) => {
                state.loading = false;
                console.log('Fetched Teams:', action.payload);
                state.teamList = action.payload;
            })
            .addCase(fetchAllTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch Team By Id
        builder
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
            });

        // Create Team
        builder
            .addCase(createTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.teamList.push(action.payload);
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Update Team
        builder
            .addCase(updateTeam.fulfilled, (state, action) => {
                const index = state.teamList.findIndex((t) => t.id === action.payload.id);
                if (index !== -1) {
                    state.teamList[index] = action.payload;
                }
                if (state.selectedTeam?.id === action.payload.id) {
                    state.selectedTeam = action.payload;
                }
            })
            .addCase(updateTeam.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Delete Team
        builder
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.teamList = state.teamList.filter((t) => t.id !== action.payload);
                if (state.selectedTeam?.id === action.payload) {
                    state.selectedTeam = null;
                }
            })
            .addCase(deleteTeam.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Fetch Team Roster
        builder
            .addCase(fetchTeamRoster.pending, (state) => {
                state.rosterLoading = true;
                state.error = null;
            })
            .addCase(fetchTeamRoster.fulfilled, (state, action) => {
                state.rosterLoading = false;
                state.roster = action.payload;
            })
            .addCase(fetchTeamRoster.rejected, (state, action) => {
                state.rosterLoading = false;
                state.error = action.payload as string;
            });

        // Add Player
        builder
            .addCase(addPlayerToTeam.fulfilled, (state, action) => {
                state.roster.push(action.payload);
            })
            .addCase(addPlayerToTeam.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Update Player
        builder
            .addCase(updatePlayer.fulfilled, (state, action) => {
                const index = state.roster.findIndex((p) => p.id === action.payload.id);
                if (index !== -1) {
                    state.roster[index] = action.payload;
                }
            })
            .addCase(updatePlayer.rejected, (state, action) => {
                state.error = action.payload as string;
            });

        // Delete Player
        builder
            .addCase(deletePlayer.fulfilled, (state, action) => {
                state.roster = state.roster.filter((p) => p.id !== action.payload);
            })
            .addCase(deletePlayer.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { clearTeamsError, clearSelectedTeam, setSelectedTeam } = teamsSlice.actions;
export default teamsSlice.reducer;
