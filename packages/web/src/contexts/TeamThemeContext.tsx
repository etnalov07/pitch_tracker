import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { Team } from '../types';

interface TeamThemeContextValue {
    activeTeam: Team | null;
    setActiveTeam: (team: Team | null) => void;
    clearTheme: () => void;
}

const TeamThemeContext = createContext<TeamThemeContextValue | undefined>(undefined);

const DEFAULT_COLORS = {
    primary: '#3b82f6',
    secondary: '#1f2937',
    accent: '#22c55e',
};

export const TeamThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeTeam, setActiveTeamState] = useState<Team | null>(null);

    const applyTheme = useCallback((team: Team | null) => {
        const root = document.documentElement;

        if (team) {
            root.style.setProperty('--team-primary', team.primary_color || DEFAULT_COLORS.primary);
            root.style.setProperty('--team-secondary', team.secondary_color || DEFAULT_COLORS.secondary);
            root.style.setProperty('--team-accent', team.accent_color || DEFAULT_COLORS.accent);
        } else {
            root.style.setProperty('--team-primary', DEFAULT_COLORS.primary);
            root.style.setProperty('--team-secondary', DEFAULT_COLORS.secondary);
            root.style.setProperty('--team-accent', DEFAULT_COLORS.accent);
        }
    }, []);

    const setActiveTeam = useCallback(
        (team: Team | null) => {
            setActiveTeamState(team);
            applyTheme(team);
        },
        [applyTheme]
    );

    const clearTheme = useCallback(() => {
        setActiveTeamState(null);
        applyTheme(null);
    }, [applyTheme]);

    // Apply default theme on mount
    useEffect(() => {
        applyTheme(null);
    }, [applyTheme]);

    return <TeamThemeContext.Provider value={{ activeTeam, setActiveTeam, clearTheme }}>{children}</TeamThemeContext.Provider>;
};

export const useTeamTheme = (): TeamThemeContextValue => {
    const context = useContext(TeamThemeContext);
    if (!context) {
        throw new Error('useTeamTheme must be used within a TeamThemeProvider');
    }
    return context;
};

export default TeamThemeContext;
