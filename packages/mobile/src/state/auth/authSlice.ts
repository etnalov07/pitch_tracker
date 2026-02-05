import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { User, LoginCredentials, RegisterData } from '@pitch-tracker/shared';
import { authApi } from './api/authApi';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    initializing: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    initializing: true,
    error: null,
};

// Initialize auth state from SecureStore
export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
    try {
        // Small delay to allow TurboModules to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 100));

        const token = await SecureStore.getItemAsync('token');
        const userStr = await SecureStore.getItemAsync('user');

        let user: User | null = null;
        if (userStr) {
            try {
                user = JSON.parse(userStr);
            } catch {
                user = null;
            }
        }

        return { token, user };
    } catch (error) {
        console.warn('Failed to initialize auth from SecureStore:', error);
        return { token: null, user: null };
    }
});

// Login
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: LoginCredentials, { rejectWithValue }) => {
        try {
            const response = await authApi.login(credentials);
            await SecureStore.setItemAsync('token', response.token);
            await SecureStore.setItemAsync('user', JSON.stringify(response.user));
            return response;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            return rejectWithValue(message);
        }
    }
);

// Register
export const registerUser = createAsyncThunk(
    'auth/register',
    async (data: RegisterData, { rejectWithValue }) => {
        try {
            const response = await authApi.register(data);
            await SecureStore.setItemAsync('token', response.token);
            await SecureStore.setItemAsync('user', JSON.stringify(response.user));
            return response;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Registration failed';
            return rejectWithValue(message);
        }
    }
);

// Fetch Profile
export const fetchUserProfile = createAsyncThunk(
    'auth/fetchProfile',
    async (_, { rejectWithValue }) => {
        try {
            const user = await authApi.getProfile();
            await SecureStore.setItemAsync('user', JSON.stringify(user));
            return user;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to fetch profile';
            return rejectWithValue(message);
        }
    }
);

// Logout
export const logoutUser = createAsyncThunk('auth/logout', async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
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
        // Initialize
        builder
            .addCase(initializeAuth.pending, (state) => {
                state.initializing = true;
            })
            .addCase(initializeAuth.fulfilled, (state, action) => {
                state.initializing = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isAuthenticated = !!action.payload.token;
            })
            .addCase(initializeAuth.rejected, (state) => {
                state.initializing = false;
            });

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

        // Logout
        builder.addCase(logoutUser.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
        });
    },
});

export const { clearAuthError, setCredentials } = authSlice.actions;
export default authSlice.reducer;
