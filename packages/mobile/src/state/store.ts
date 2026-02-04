import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './auth/authSlice';
import gamesReducer from './games/gamesSlice';
import teamsReducer from './teams/teamsSlice';
import offlineReducer from './offline/offlineSlice';
import { invitesReducer } from './invites';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        games: gamesReducer,
        teams: teamsReducer,
        offline: offlineReducer,
        invites: invitesReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
