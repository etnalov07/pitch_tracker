import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import packageJson from '../package.json';
import BullpenLive from './pages/BullpenLive';
import BullpenNew from './pages/BullpenNew';
import BullpenPlanEditor from './pages/BullpenPlanEditor';
import BullpenPlans from './pages/BullpenPlans';
import BullpenSessions from './pages/BullpenSessions';
import Dashboard from './pages/Dashboard/Dashboard';
import GameHistory from './pages/GameHistory/GameHistory';
import GameSetup from './pages/GameSetup/GameSetup';
import InviteAccept from './pages/InviteAccept/InviteAccept';
import JoinTeam from './pages/JoinTeam/JoinTeam';
import LiveGame from './pages/LiveGame/LiveGame';
import Login from './pages/Login/Login';
import MyTeamLineup from './pages/MyTeamLineup/MyTeamLineup';
import OpponentDetail from './pages/OpponentDetail';
import OpponentLineup from './pages/OpponentLineup/OpponentLineup';
import Opponents from './pages/Opponents';
import PitcherProfile from './pages/PitcherProfile';
import ScoutingReport from './pages/ScoutingReport';
import ScoutingReports from './pages/ScoutingReports';
import TeamDetail from './pages/TeamDetail/TeamDetail';
import Teams from './pages/Teams/Teams';
import TeamSettings from './pages/TeamSettings';
import { useAppSelector } from './state';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/invite/:token" element={<InviteAccept />} />
                <Route
                    path="/join-team"
                    element={
                        <ProtectedRoute>
                            <JoinTeam />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/game/:gameId"
                    element={
                        <ProtectedRoute>
                            <LiveGame />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/game/:gameId/lineup"
                    element={
                        <ProtectedRoute>
                            <OpponentLineup />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/game/:gameId/my-lineup"
                    element={
                        <ProtectedRoute>
                            <MyTeamLineup />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams"
                    element={
                        <ProtectedRoute>
                            <Teams />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/new"
                    element={
                        <ProtectedRoute>
                            <Teams />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id"
                    element={
                        <ProtectedRoute>
                            <TeamDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen"
                    element={
                        <ProtectedRoute>
                            <BullpenSessions />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen/new"
                    element={
                        <ProtectedRoute>
                            <BullpenNew />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen/:session_id/live"
                    element={
                        <ProtectedRoute>
                            <BullpenLive />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen/plans"
                    element={
                        <ProtectedRoute>
                            <BullpenPlans />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen/plans/new"
                    element={
                        <ProtectedRoute>
                            <BullpenPlanEditor />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/bullpen/plans/:plan_id/edit"
                    element={
                        <ProtectedRoute>
                            <BullpenPlanEditor />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/opponents"
                    element={
                        <ProtectedRoute>
                            <Opponents />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/opponents/:id"
                    element={
                        <ProtectedRoute>
                            <OpponentDetail />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/scouting"
                    element={
                        <ProtectedRoute>
                            <ScoutingReports />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/scouting/:report_id"
                    element={
                        <ProtectedRoute>
                            <ScoutingReport />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/settings"
                    element={
                        <ProtectedRoute>
                            <TeamSettings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/teams/:team_id/pitcher/:pitcher_id"
                    element={
                        <ProtectedRoute>
                            <PitcherProfile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/games/new"
                    element={
                        <ProtectedRoute>
                            <GameSetup />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/games/history"
                    element={
                        <ProtectedRoute>
                            <GameHistory />
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <div
                style={{
                    position: 'fixed',
                    bottom: 4,
                    right: 8,
                    fontSize: '11px',
                    color: '#aaa',
                    pointerEvents: 'none',
                    zIndex: 9999,
                }}
            >
                v{packageJson.version}
            </div>
        </Router>
    );
}

export default App;
