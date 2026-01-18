import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import gamesReducer from './games/gamesSlice';
import teamsReducer from './teams/teamsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        games: gamesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
