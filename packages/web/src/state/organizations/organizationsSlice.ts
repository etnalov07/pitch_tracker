import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Organization, OrganizationWithTeams, OrganizationMember } from '../../types';
import { organizationsApi } from './api/organizationsApi';

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error) return error.message;
    return fallback;
};

interface OrganizationsState {
    list: Organization[];
    selectedOrg: OrganizationWithTeams | null;
    members: OrganizationMember[];
    loading: boolean;
    error: string | null;
}

const initialState: OrganizationsState = {
    list: [],
    selectedOrg: null,
    members: [],
    loading: false,
    error: null,
};

export const fetchMyOrganizations = createAsyncThunk('organizations/fetchMy', async (_, { rejectWithValue }) => {
    try {
        return await organizationsApi.getMyOrganizations();
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch organizations'));
    }
});

export const fetchOrganizationById = createAsyncThunk('organizations/fetchById', async (orgId: string, { rejectWithValue }) => {
    try {
        return await organizationsApi.getOrganizationById(orgId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch organization'));
    }
});

export const createOrganization = createAsyncThunk(
    'organizations/create',
    async (data: { name: string; description?: string }, { rejectWithValue }) => {
        try {
            return await organizationsApi.createOrganization(data);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to create organization'));
        }
    }
);

export const fetchOrgMembers = createAsyncThunk('organizations/fetchMembers', async (orgId: string, { rejectWithValue }) => {
    try {
        return await organizationsApi.getMembers(orgId);
    } catch (error: unknown) {
        return rejectWithValue(getErrorMessage(error, 'Failed to fetch members'));
    }
});

export const addOrgMember = createAsyncThunk(
    'organizations/addMember',
    async ({ orgId, email, role }: { orgId: string; email: string; role: string }, { rejectWithValue }) => {
        try {
            return await organizationsApi.addMember(orgId, email, role);
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to add member'));
        }
    }
);

export const removeOrgMember = createAsyncThunk(
    'organizations/removeMember',
    async ({ orgId, memberId }: { orgId: string; memberId: string }, { rejectWithValue }) => {
        try {
            await organizationsApi.removeMember(orgId, memberId);
            return memberId;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error, 'Failed to remove member'));
        }
    }
);

const organizationsSlice = createSlice({
    name: 'organizations',
    initialState,
    reducers: {
        clearOrgsError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyOrganizations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyOrganizations.fulfilled, (state, action) => {
                state.loading = false;
                state.list = action.payload;
            })
            .addCase(fetchMyOrganizations.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        builder
            .addCase(fetchOrganizationById.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchOrganizationById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedOrg = action.payload;
            })
            .addCase(fetchOrganizationById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        builder.addCase(createOrganization.fulfilled, (state, action) => {
            state.list.push(action.payload);
        });

        builder.addCase(fetchOrgMembers.fulfilled, (state, action) => {
            state.members = action.payload;
        });

        builder.addCase(addOrgMember.fulfilled, (state, action) => {
            state.members.push(action.payload);
        });

        builder.addCase(removeOrgMember.fulfilled, (state, action) => {
            state.members = state.members.filter((m) => m.id !== action.payload);
        });
    },
});

export const { clearOrgsError } = organizationsSlice.actions;
export default organizationsSlice.reducer;
