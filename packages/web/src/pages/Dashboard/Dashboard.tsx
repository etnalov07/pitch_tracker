import React from 'react';
import { useAppSelector } from '../../state';
import OrgDashboard from '../OrgDashboard';
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
        return <OrgDashboard />;
    }
    return <CoachDashboard />;
};

export default Dashboard;
