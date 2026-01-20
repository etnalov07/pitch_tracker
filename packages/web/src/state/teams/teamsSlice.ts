import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Team, Player } from '../../types';
import { teamsApi } from './api/teamsApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

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
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch teams'));
    }
});

export const fetchTeamById = createAsyncThunk('teams/fetchById', async (team_id: string, { rejectWithValue }) => {
    try {
        return await teamsApi.getTeamById(team_id);
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

export const deleteTeam = createAsyncThunk('teams/delete', async (team_id: string, { rejectWithValue }) => {
    try {
        await teamsApi.deleteTeam(team_id);
        return team_id;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to delete team'));
    }
});

export const fetchTeamRoster = createAsyncThunk('teams/fetchRoster', async (team_id: string, { rejectWithValue }) => {
    try {
        const response = await teamsApi.getTeamRoster(team_id);
        return response;
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch roster'));
    }
});

export const addPlayerToTeam = createAsyncThunk(
    'teams/addPlayer',
    async ({ team_id, playerData }: { team_id: string; playerData: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.addPlayer(team_id, playerData);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add player'));
        }
    }
);

export const updatePlayer = createAsyncThunk(
    'teams/updatePlayer',
    async ({ player_id, playerData }: { player_id: string; playerData: Partial<Player> }, { rejectWithValue }) => {
        try {
            return await teamsApi.updatePlayer(player_id, playerData);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to update player'));
        }
    }
);

export const deletePlayer = createAsyncThunk('teams/deletePlayer', async (player_id: string, { rejectWithValue }) => {
    try {
        await teamsApi.deletePlayer(player_id);
        return player_id;
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
                state.roster = action.payload.players;
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
