import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth/authSlice';
import gamesReducer from './games/gamesSlice';
import { invitesReducer } from './invites';
import { organizationsReducer } from './organizations';
import teamsReducer from './teams/teamsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        teams: teamsReducer,
        games: gamesReducer,
        organizations: organizationsReducer,
        invites: invitesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
