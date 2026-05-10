import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
    pitchCallingEnabled: boolean;
    velocityEnabled: boolean;
    themeMode: ThemeMode;
    initialized: boolean;
}

const initialState: SettingsState = {
    pitchCallingEnabled: false,
    velocityEnabled: false,
    themeMode: 'system',
    initialized: false,
};

const parseThemeMode = (value: string | null): ThemeMode => {
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
};

export const initializeSettings = createAsyncThunk('settings/initialize', async () => {
    const [pitchCalling, velocity, themeMode] = await Promise.all([
        AsyncStorage.getItem('setting:pitchCallingEnabled'),
        AsyncStorage.getItem('setting:velocityEnabled'),
        AsyncStorage.getItem('setting:themeMode'),
    ]);
    return {
        pitchCallingEnabled: pitchCalling === 'true',
        velocityEnabled: velocity === 'true',
        themeMode: parseThemeMode(themeMode),
    };
});

export const setPitchCallingEnabled = createAsyncThunk('settings/setPitchCalling', async (enabled: boolean) => {
    await AsyncStorage.setItem('setting:pitchCallingEnabled', String(enabled));
    return enabled;
});

export const setVelocityEnabled = createAsyncThunk('settings/setVelocity', async (enabled: boolean) => {
    await AsyncStorage.setItem('setting:velocityEnabled', String(enabled));
    return enabled;
});

export const setThemeMode = createAsyncThunk('settings/setThemeMode', async (mode: ThemeMode) => {
    await AsyncStorage.setItem('setting:themeMode', mode);
    return mode;
});

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(initializeSettings.fulfilled, (state, action) => {
                state.pitchCallingEnabled = action.payload.pitchCallingEnabled;
                state.velocityEnabled = action.payload.velocityEnabled;
                state.themeMode = action.payload.themeMode;
                state.initialized = true;
            })
            .addCase(setPitchCallingEnabled.fulfilled, (state, action) => {
                state.pitchCallingEnabled = action.payload;
            })
            .addCase(setVelocityEnabled.fulfilled, (state, action) => {
                state.velocityEnabled = action.payload;
            })
            .addCase(setThemeMode.fulfilled, (state, action) => {
                state.themeMode = action.payload;
            });
    },
});

export default settingsSlice.reducer;
