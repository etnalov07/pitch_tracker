import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import packageJson from '../package.json';
import { ConfirmProvider } from './hooks/useConfirm';
import { ToastProvider } from './hooks/useToast';
import Admin from './pages/Admin';
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
import { OrgCreate, PlayerWaiting } from './pages/Onboarding';
import OpponentDetail from './pages/OpponentDetail';
import OpponentLineup from './pages/OpponentLineup/OpponentLineup';
import Opponents from './pages/Opponents';
import OrgDashboard from './pages/OrgDashboard';
import PitcherProfile from './pages/PitcherProfile';
import PitcherReport from './pages/PitcherReport/PitcherReport';
import PublicReport from './pages/PublicReport';
import Replay from './pages/Replay';
import ResetPassword from './pages/ResetPassword';
import ScoutingLineup from './pages/ScoutingLineup';
import ScoutingReport from './pages/ScoutingReport';
import ScoutingReports from './pages/ScoutingReports';
import Settings from './pages/Settings';
import TeamDetail from './pages/TeamDetail/TeamDetail';
import Teams from './pages/Teams/Teams';
import TeamSettings from './pages/TeamSettings';
import VelocityEntry from './pages/VelocityEntry';
import VerifyEmail from './pages/VerifyEmail';
import { useAppSelector } from './state';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <ConfirmProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/invite/:token" element={<InviteAccept />} />
                        <Route path="/report/:gameId" element={<PublicReport />} />
                        <Route path="/verify-email" element={<VerifyEmail />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
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
                            path="/game/:gameId/replay"
                            element={
                                <ProtectedRoute>
                                    <Replay />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/game/:gameId/velocities"
                            element={
                                <ProtectedRoute>
                                    <VelocityEntry />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/game/:gameId/scouting-lineup"
                            element={
                                <ProtectedRoute>
                                    <ScoutingLineup />
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
                        {/* Organization view — any org member can hit this to see all teams
                            in their org. Owners/admins get write affordances inside OrgDashboard
                            (gated by canManage); coaches get read-only navigation into team detail. */}
                        <Route
                            path="/organization"
                            element={
                                <ProtectedRoute>
                                    <OrgDashboard />
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
                            path="/teams/:team_id/pitcher/:pitcher_id/report"
                            element={
                                <ProtectedRoute>
                                    <PitcherReport />
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
                        <Route
                            path="/settings"
                            element={
                                <ProtectedRoute>
                                    <Settings />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute>
                                    <Admin />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/onboarding/player"
                            element={
                                <ProtectedRoute>
                                    <PlayerWaiting />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/onboarding/org"
                            element={
                                <ProtectedRoute>
                                    <OrgCreate />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </ToastProvider>
            </ConfirmProvider>
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
