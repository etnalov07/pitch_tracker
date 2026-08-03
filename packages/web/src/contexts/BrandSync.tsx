import { useEffect, useRef } from 'react';
import { useMatch } from 'react-router-dom';
import { organizationService } from '../services/organizationService';
import { fetchTeamById, useAppDispatch, useAppSelector } from '../state';
import { useTeamTheme } from './TeamThemeContext';

// Single, app-wide driver for brand theming. Renders nothing; it lives inside
// the Router so it can read the current route:
//   • Org baseline — fetched once per authenticated session and applied globally.
//   • Team override — follows any `/teams/:team_id/*` route; reverts to the org
//     baseline when the user leaves team routes (never to the default palette).
// This generalizes what TeamDetail/TeamSettings used to do locally.
const BrandSync: React.FC = () => {
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    const selectedTeam = useAppSelector((state) => state.teams.selectedTeam);
    const { setOrgBrand, setTeamBrand, clearTeamBrand } = useTeamTheme();

    const teamMatch = useMatch('/teams/:team_id/*');
    const routeTeamId = teamMatch?.params.team_id;
    // '/teams/new' shares the pattern but isn't a real team.
    const activeTeamId = routeTeamId && routeTeamId !== 'new' ? routeTeamId : undefined;

    // Org baseline — fetch once per auth session; clear on sign-out.
    const orgLoaded = useRef(false);
    useEffect(() => {
        if (!isAuthenticated) {
            orgLoaded.current = false;
            setOrgBrand(null);
            return;
        }
        if (orgLoaded.current) return;
        orgLoaded.current = true;
        organizationService
            .listMine()
            .then((orgs) => {
                const branded = orgs.find((o) => o.primary_color || o.secondary_color) ?? orgs[0] ?? null;
                setOrgBrand(branded);
            })
            .catch(() => setOrgBrand(null));
    }, [isAuthenticated, setOrgBrand]);

    // Make sure the routed team is loaded so we can brand from its colors, even
    // on team subroutes that don't fetch it themselves.
    useEffect(() => {
        if (activeTeamId && selectedTeam?.id !== activeTeamId) {
            dispatch(fetchTeamById(activeTeamId));
        }
    }, [activeTeamId, selectedTeam?.id, dispatch]);

    // Apply the team override on team routes; revert to the org baseline off them.
    useEffect(() => {
        if (activeTeamId) {
            if (selectedTeam?.id === activeTeamId) {
                setTeamBrand(selectedTeam);
            }
            // else: team still loading — keep the current brand until it arrives.
        } else {
            clearTeamBrand();
        }
    }, [activeTeamId, selectedTeam, setTeamBrand, clearTeamBrand]);

    return null;
};

export default BrandSync;
