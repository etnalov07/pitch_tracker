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
    createOpponentLineup,
    fetchTeamPitcherRoster,
    createAtBat,
    updateAtBat,
    logPitch,
    recordPlay,
    updateBaseRunners,
    fetchBaseRunners,
    recordBaserunnerEvent,
    clearGamesError,
    clearSelectedGame,
    setSelectedGame,
    setCurrentAtBat,
    addPitch,
    clearPitches,
    setBaseRunners,
    clearBaseRunners,
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

export {
    createInvite,
    fetchTeamInvites,
    fetchInviteByToken,
    acceptInvite,
    searchTeams,
    createJoinRequest,
    fetchMyJoinRequests,
    fetchTeamJoinRequests,
    approveJoinRequest,
    denyJoinRequest,
    clearInvitesError,
    clearSearchResults,
} from './invites/invitesSlice';

export {
    createBullpenSession,
    fetchBullpenSession,
    fetchBullpenSessions,
    endBullpenSession,
    logBullpenPitch,
    fetchSessionPitches,
    fetchSessionSummary,
    fetchTeamPlans,
    fetchPlan,
    fetchPitcherAssignments,
    clearCurrentSession,
    clearBullpenError,
    addBullpenPitch,
    clearCurrentPlan,
} from './bullpen/bullpenSlice';
