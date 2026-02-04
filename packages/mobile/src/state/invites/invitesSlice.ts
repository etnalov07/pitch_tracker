import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Invite, JoinRequest, Team } from '@pitch-tracker/shared';
import { invitesApi } from './api/invitesApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

interface InvitesState {
    teamInvites: Invite[];
    myJoinRequests: JoinRequest[];
    teamJoinRequests: JoinRequest[];
    searchResults: Team[];
    currentInvite: Invite | null;
    loading: boolean;
    error: string | null;
}

const initialState: InvitesState = {
    teamInvites: [],
    myJoinRequests: [],
    teamJoinRequests: [],
    searchResults: [],
    currentInvite: null,
    loading: false,
    error: null,
};

export const createInvite = createAsyncThunk(
    'invites/create',
    async (data: { team_id: string; player_id?: string; role?: string }, { rejectWithValue }) => {
        try {
            return await invitesApi.createInvite(data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create invite'));
        }
    }
);

export const fetchTeamInvites = createAsyncThunk(
    'invites/fetchByTeam',
    async (teamId: string, { rejectWithValue }) => {
        try {
            return await invitesApi.getInvitesByTeam(teamId);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch invites'));
        }
    }
);

export const fetchInviteByToken = createAsyncThunk(
    'invites/fetchByToken',
    async (token: string, { rejectWithValue }) => {
        try {
            return await invitesApi.getInviteByToken(token);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch invite'));
        }
    }
);

export const acceptInvite = createAsyncThunk(
    'invites/accept',
    async (token: string, { rejectWithValue }) => {
        try {
            return await invitesApi.acceptInvite(token);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to accept invite'));
        }
    }
);

export const searchTeams = createAsyncThunk(
    'invites/searchTeams',
    async (query: string, { rejectWithValue }) => {
        try {
            return await invitesApi.searchTeams(query);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to search teams'));
        }
    }
);

export const createJoinRequest = createAsyncThunk(
    'invites/createJoinRequest',
    async (data: { team_id: string; message?: string }, { rejectWithValue }) => {
        try {
            return await invitesApi.createJoinRequest(data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to send join request'));
        }
    }
);

export const fetchMyJoinRequests = createAsyncThunk(
    'invites/fetchMyJoinRequests',
    async (_, { rejectWithValue }) => {
        try {
            return await invitesApi.getMyJoinRequests();
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch join requests'));
        }
    }
);

export const fetchTeamJoinRequests = createAsyncThunk(
    'invites/fetchTeamJoinRequests',
    async (teamId: string, { rejectWithValue }) => {
        try {
            return await invitesApi.getTeamJoinRequests(teamId);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to fetch join requests'));
        }
    }
);

export const approveJoinRequest = createAsyncThunk(
    'invites/approveJoinRequest',
    async ({ requestId, linkedPlayerId }: { requestId: string; linkedPlayerId?: string }, { rejectWithValue }) => {
        try {
            await invitesApi.approveJoinRequest(requestId, linkedPlayerId);
            return requestId;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to approve request'));
        }
    }
);

export const denyJoinRequest = createAsyncThunk(
    'invites/denyJoinRequest',
    async (requestId: string, { rejectWithValue }) => {
        try {
            await invitesApi.denyJoinRequest(requestId);
            return requestId;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to deny request'));
        }
    }
);

const invitesSlice = createSlice({
    name: 'invites',
    initialState,
    reducers: {
        clearInvitesError: (state) => { state.error = null; },
        clearSearchResults: (state) => { state.searchResults = []; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(createInvite.fulfilled, (state, action) => { state.teamInvites.unshift(action.payload); })
            .addCase(createInvite.rejected, (state, action) => { state.error = action.payload as string; });

        builder
            .addCase(fetchTeamInvites.pending, (state) => { state.loading = true; })
            .addCase(fetchTeamInvites.fulfilled, (state, action) => { state.loading = false; state.teamInvites = action.payload; })
            .addCase(fetchTeamInvites.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

        builder
            .addCase(fetchInviteByToken.pending, (state) => { state.loading = true; })
            .addCase(fetchInviteByToken.fulfilled, (state, action) => { state.loading = false; state.currentInvite = action.payload; })
            .addCase(fetchInviteByToken.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

        builder
            .addCase(acceptInvite.fulfilled, (state) => { state.currentInvite = null; });

        builder
            .addCase(searchTeams.fulfilled, (state, action) => { state.searchResults = action.payload; });

        builder
            .addCase(createJoinRequest.fulfilled, (state, action) => { state.myJoinRequests.unshift(action.payload); });

        builder
            .addCase(fetchMyJoinRequests.fulfilled, (state, action) => { state.myJoinRequests = action.payload; });

        builder
            .addCase(fetchTeamJoinRequests.fulfilled, (state, action) => { state.teamJoinRequests = action.payload; });

        builder
            .addCase(approveJoinRequest.fulfilled, (state, action) => {
                state.teamJoinRequests = state.teamJoinRequests.filter((r) => r.id !== action.payload);
            });

        builder
            .addCase(denyJoinRequest.fulfilled, (state, action) => {
                state.teamJoinRequests = state.teamJoinRequests.filter((r) => r.id !== action.payload);
            });
    },
});

export const { clearInvitesError, clearSearchResults } = invitesSlice.actions;
export default invitesSlice.reducer;
