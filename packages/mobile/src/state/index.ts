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
    resumeGame,
    endAtBat,
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
    toggleHomeAway,
    clearGamesError,
    clearSelectedGame,
    setSelectedGame,
    setCurrentAtBat,
    addPitch,
    clearPitches,
    setBaseRunners,
    clearBaseRunners,
    setCurrentOpposingPitcher,
    fetchOpposingPitchers,
    createOpposingPitcher,
    deleteOpposingPitcher,
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
    createPitchCall,
    changePitchCall,
    markCallTransmitted,
    logCallResult,
    fetchGameCalls,
    fetchActiveCall,
    fetchCallGameSummary,
    fetchGameAnalytics,
    clearPitchCalling,
    clearPitchCallingError,
} from './pitchCalling/pitchCallingSlice';

export {
    fetchPerformanceSummary,
    fetchPitcherSummaries,
    regenerateNarrative,
    clearPerformanceSummary,
    clearPerformanceSummaryError,
} from './performanceSummary/performanceSummarySlice';

export { initializeSettings, setPitchCallingEnabled, setVelocityEnabled } from './settings/settingsSlice';

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
