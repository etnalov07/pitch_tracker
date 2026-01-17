import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Teams from './pages/Teams/Teams';
import TeamDetail from './pages/TeamDetail/TeamDetail';
import GameSetup from './pages/GameSetup/GameSetup';
import GameHistory from './pages/GameHistory/GameHistory';
import LiveGame from './pages/LiveGame/LiveGame';
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
        </Router>
    );
}

export default App;
