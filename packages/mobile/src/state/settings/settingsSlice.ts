import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    pitchCallingEnabled: boolean;
    velocityEnabled: boolean;
    initialized: boolean;
}

const initialState: SettingsState = {
    pitchCallingEnabled: false,
    velocityEnabled: false,
    initialized: false,
};

export const initializeSettings = createAsyncThunk('settings/initialize', async () => {
    const [pitchCalling, velocity] = await Promise.all([
        AsyncStorage.getItem('setting:pitchCallingEnabled'),
        AsyncStorage.getItem('setting:velocityEnabled'),
    ]);
    return {
        pitchCallingEnabled: pitchCalling === 'true',
        velocityEnabled: velocity === 'true',
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

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(initializeSettings.fulfilled, (state, action) => {
                state.pitchCallingEnabled = action.payload.pitchCallingEnabled;
                state.velocityEnabled = action.payload.velocityEnabled;
                state.initialized = true;
            })
            .addCase(setPitchCallingEnabled.fulfilled, (state, action) => {
                state.pitchCallingEnabled = action.payload;
            })
            .addCase(setVelocityEnabled.fulfilled, (state, action) => {
                state.velocityEnabled = action.payload;
            });
    },
});

export default settingsSlice.reducer;
