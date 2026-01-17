import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginCredentials, RegisterData } from '../../types';
import { authApi } from './api/authApi';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
}

// Load initial state from localStorage
const loadInitialState = (): AuthState => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user: User | null = null;

    if (userStr) {
        try {
            user = JSON.parse(userStr);
        } catch (e) {
            user = null;
        }
    }

    return {
        user,
        token,
        isAuthenticated: !!token,
        loading: false,
        error: null,
    };
};

const initialState: AuthState = loadInitialState();

// Async Thunks
export const loginUser = createAsyncThunk('auth/login', async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
        const response = await authApi.login(credentials);
        // Store in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
});

export const registerUser = createAsyncThunk('auth/register', async (data: RegisterData, { rejectWithValue }) => {
    try {
        const response = await authApi.register(data);
        // Store in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
});

export const fetchUserProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
    try {
        const user = await authApi.getProfile();
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        clearAuthError: (state) => {
            state.error = null;
        },
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder
            .addCase(loginUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Register
        builder
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch Profile
        builder
            .addCase(fetchUserProfile.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { logout, clearAuthError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
