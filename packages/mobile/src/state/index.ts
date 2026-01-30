export { store, useAppDispatch, useAppSelector } from './store';
export type { RootState, AppDispatch } from './store';

export {
    initializeAuth,
    loginUser,
    registerUser,
    fetchUserProfile,
    logoutUser,
    clearAuthError,
    setCredentials,
} from './auth/authSlice';

export {
    fetchAllGames,
    fetchGameById,
    createGame,
    startGame,
    endGame,
    advanceInning,
    fetchCurrentGameState,
    fetchCurrentInning,
    fetchGamePitchers,
    changePitcher,
    fetchOpponentLineup,
    fetchTeamPitcherRoster,
    createAtBat,
    updateAtBat,
    logPitch,
    recordPlay,
    clearGamesError,
    clearSelectedGame,
    setSelectedGame,
    setCurrentAtBat,
    addPitch,
    clearPitches,
} from './games/gamesSlice';

export {
    checkNetworkStatus,
    loadPendingCount,
    loadPendingActions,
    setOnlineStatus,
    setSyncing,
    setSyncError,
    setLastSyncTime,
    incrementPendingCount,
    decrementPendingCount,
    setPendingCount,
} from './offline/offlineSlice';

export {
    fetchAllTeams,
    fetchTeamById,
    createTeam,
    updateTeam,
    deleteTeam,
    fetchTeamPlayers,
    addPlayer,
    updatePlayer,
    deletePlayer,
    clearTeamsError,
    clearSelectedTeam,
    setSelectedTeam,
} from './teams/teamsSlice';
