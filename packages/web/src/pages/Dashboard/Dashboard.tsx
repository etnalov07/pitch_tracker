import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, useAppDispatch, useAppSelector } from '../../state';
import { theme } from '../../styles/theme';
import PlayerDashboard from '../PlayerDashboard';
import CoachDashboard from './CoachDashboard';

// Thin shell that picks which dashboard to render based on the user's
// registration_type. NULL falls through to the coach dashboard so every
// pre-existing user lands exactly where they did before this slice.
const Dashboard: React.FC = () => {
    const user = useAppSelector((state) => state.auth.user);

    if (user?.registration_type === 'player') {
        return <PlayerDashboard />;
    }
    if (user?.registration_type === 'org_admin') {
        return <OrgAdminStub />;
    }
    return <CoachDashboard />;
};

const OrgAdminStub: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };
    return (
        <div style={{ minHeight: '100vh', backgroundColor: theme.surfaces.body, padding: theme.spacing.xl }}>
            <div
                style={{
                    maxWidth: 520,
                    margin: '4rem auto',
                    backgroundColor: theme.surfaces.card,
                    padding: theme.spacing.xl,
                    borderRadius: theme.borderRadius.lg,
                    boxShadow: theme.shadows.sm,
                }}
            >
                <h1 style={{ marginTop: 0, fontSize: theme.fontSize['2xl'], color: theme.colors.gray[900] }}>
                    Org Admin — coming soon
                </h1>
                <p style={{ color: theme.colors.gray[700], lineHeight: 1.5 }}>
                    Organization admin mode is wired up for sign-up but the dashboard ships in the next slice. For now you can sign
                    in as a coach on any individual team, or contact support.
                </p>
                <button
                    onClick={handleLogout}
                    style={{
                        marginTop: theme.spacing.lg,
                        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                        backgroundColor: theme.colors.gray[700],
                        color: 'white',
                        border: 'none',
                        borderRadius: theme.borderRadius.md,
                        cursor: 'pointer',
                    }}
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
