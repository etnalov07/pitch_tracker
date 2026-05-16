import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
    pitchCallingEnabled: boolean;
    velocityEnabled: boolean;
    themeMode: ThemeMode;
    radarEnabled: boolean;
    radarDeviceId: string | null;
    radarDeviceName: string | null;
    initialized: boolean;
}

const initialState: SettingsState = {
    pitchCallingEnabled: false,
    velocityEnabled: false,
    themeMode: 'system',
    radarEnabled: false,
    radarDeviceId: null,
    radarDeviceName: null,
    initialized: false,
};

const parseThemeMode = (value: string | null): ThemeMode => {
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
};

export const initializeSettings = createAsyncThunk('settings/initialize', async () => {
    const [pitchCalling, velocity, themeMode, radarEnabled, radarDeviceId, radarDeviceName] = await Promise.all([
        AsyncStorage.getItem('setting:pitchCallingEnabled'),
        AsyncStorage.getItem('setting:velocityEnabled'),
        AsyncStorage.getItem('setting:themeMode'),
        AsyncStorage.getItem('setting:radarEnabled'),
        AsyncStorage.getItem('setting:radarDeviceId'),
        AsyncStorage.getItem('setting:radarDeviceName'),
    ]);
    return {
        pitchCallingEnabled: pitchCalling === 'true',
        velocityEnabled: velocity === 'true',
        themeMode: parseThemeMode(themeMode),
        radarEnabled: radarEnabled === 'true',
        radarDeviceId: radarDeviceId || null,
        radarDeviceName: radarDeviceName || null,
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

export const setRadarEnabled = createAsyncThunk('settings/setRadarEnabled', async (enabled: boolean) => {
    await AsyncStorage.setItem('setting:radarEnabled', String(enabled));
    return enabled;
});

export const setRadarDevice = createAsyncThunk(
    'settings/setRadarDevice',
    async (device: { id: string; name: string | null } | null) => {
        if (device) {
            await AsyncStorage.setItem('setting:radarDeviceId', device.id);
            await AsyncStorage.setItem('setting:radarDeviceName', device.name ?? '');
        } else {
            await AsyncStorage.removeItem('setting:radarDeviceId');
            await AsyncStorage.removeItem('setting:radarDeviceName');
        }
        return device;
    }
);

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
                state.radarEnabled = action.payload.radarEnabled;
                state.radarDeviceId = action.payload.radarDeviceId;
                state.radarDeviceName = action.payload.radarDeviceName;
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
            })
            .addCase(setRadarEnabled.fulfilled, (state, action) => {
                state.radarEnabled = action.payload;
            })
            .addCase(setRadarDevice.fulfilled, (state, action) => {
                state.radarDeviceId = action.payload?.id ?? null;
                state.radarDeviceName = action.payload?.name ?? null;
            });
    },
});

export default settingsSlice.reducer;
