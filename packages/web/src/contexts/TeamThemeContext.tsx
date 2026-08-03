import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { BRAND_VAR_KEYS, deriveBrandTokens } from '../styles/colorMath';
import { Organization, Team } from '../types';
import { useThemeMode } from './ThemeModeContext';

// Brand theming — a two-layer model:
//   • Org baseline  — the user's organization colors, applied app-wide.
//   • Team override — a team's colors, applied only while a team route is
//                     mounted; on exit it reverts to the org baseline (never to
//                     the default palette), so navigating in/out of a team is a
//                     single monotonic recolor with no flash-to-default.
// The resolved brand is derived into a full CSS-var map (primary ramp, tinted
// surfaces, header gradient) and set inline on <html>, layering over the base
// tokens in index.css. We persist the derived var-map so the no-FOUC bootstrap
// in public/index.html can replay it verbatim on first paint.

interface BrandColors {
    primary: string;
    secondary: string;
    accent?: string;
    kind: 'team' | 'org';
}

interface TeamThemeContextValue {
    // Back-compat surface — existing team pages drive the team override through
    // these. `activeTeam` is retained for callers that read it.
    activeTeam: Team | null;
    setActiveTeam: (team: Team | null) => void;
    clearTheme: () => void;
    // Brand surface — used by the app-wide sync bridge.
    setOrgBrand: (org: Organization | null) => void;
    setTeamBrand: (team: Team | null) => void;
    clearTeamBrand: () => void;
}

const TeamThemeContext = createContext<TeamThemeContextValue | undefined>(undefined);

// localStorage keys. `brand:vars` feeds the first-paint bootstrap; `brand:active`
// records the source colors (handy for debugging / future use).
const BRAND_VARS_KEY = 'brand:vars';
const BRAND_SOURCE_KEY = 'brand:active';

const hasColors = (c?: { primary_color?: string; secondary_color?: string }): boolean =>
    Boolean(c && (c.primary_color || c.secondary_color));

const teamToBrand = (team: Team | null): BrandColors | null => {
    if (!team || !hasColors(team)) return null;
    return {
        primary: team.primary_color || '#486581',
        secondary: team.secondary_color || '#1f2937',
        accent: team.accent_color || '#22c55e',
        kind: 'team',
    };
};

const orgToBrand = (org: Organization | null): BrandColors | null => {
    if (!org || !hasColors(org)) return null;
    return {
        primary: org.primary_color || '#486581',
        secondary: org.secondary_color || '#1f2937',
        kind: 'org',
    };
};

const persist = (key: string, value: unknown) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // localStorage may be unavailable (private mode) — fail open.
    }
};

const clearPersisted = (key: string) => {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // no-op
    }
};

export const TeamThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { effectiveMode } = useThemeMode();
    const [orgBrand, setOrgBrandState] = useState<BrandColors | null>(null);
    const [teamBrand, setTeamBrandState] = useState<BrandColors | null>(null);
    const [activeTeam, setActiveTeamRef] = useState<Team | null>(null);

    // Team override wins over org baseline; null means "no brand → base palette".
    const resolved: BrandColors | null = useMemo(() => teamBrand ?? orgBrand, [teamBrand, orgBrand]);

    // Apply (or clear) the derived tokens whenever the resolved brand or the
    // effective light/dark mode changes.
    useEffect(() => {
        const root = document.documentElement;
        if (!resolved) {
            BRAND_VAR_KEYS.forEach((key) => root.style.removeProperty(key));
            clearPersisted(BRAND_VARS_KEY);
            clearPersisted(BRAND_SOURCE_KEY);
            return;
        }
        const tokens = deriveBrandTokens(resolved, effectiveMode);
        Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
        persist(BRAND_VARS_KEY, tokens);
        persist(BRAND_SOURCE_KEY, resolved);
    }, [resolved, effectiveMode]);

    const setOrgBrand = useCallback((org: Organization | null) => {
        setOrgBrandState(orgToBrand(org));
    }, []);

    const setTeamBrand = useCallback((team: Team | null) => {
        setActiveTeamRef(team);
        setTeamBrandState(teamToBrand(team));
    }, []);

    const clearTeamBrand = useCallback(() => {
        setActiveTeamRef(null);
        setTeamBrandState(null);
    }, []);

    // Back-compat aliases for existing team pages.
    const setActiveTeam = setTeamBrand;
    const clearTheme = clearTeamBrand;

    const value = useMemo(
        () => ({ activeTeam, setActiveTeam, clearTheme, setOrgBrand, setTeamBrand, clearTeamBrand }),
        [activeTeam, setActiveTeam, clearTheme, setOrgBrand, setTeamBrand, clearTeamBrand]
    );

    return <TeamThemeContext.Provider value={value}>{children}</TeamThemeContext.Provider>;
};

export const useTeamTheme = (): TeamThemeContextValue => {
    const context = useContext(TeamThemeContext);
    if (!context) {
        throw new Error('useTeamTheme must be used within a TeamThemeProvider');
    }
    return context;
};

export default TeamThemeContext;
