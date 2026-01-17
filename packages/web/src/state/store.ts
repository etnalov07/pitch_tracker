import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import teamsReducer from './teams/teamsSlice';
import gamesReducer from './games/gamesSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        games: gamesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
