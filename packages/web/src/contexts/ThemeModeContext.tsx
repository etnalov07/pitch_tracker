import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveThemeMode = 'light' | 'dark';

interface ThemeModeContextValue {
    mode: ThemeMode;
    effectiveMode: EffectiveThemeMode;
    setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'theme:mode';

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const readStoredMode = (): ThemeMode => {
    if (typeof window === 'undefined') return 'system';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
};

const getSystemMode = (): EffectiveThemeMode => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
    const [systemMode, setSystemMode] = useState<EffectiveThemeMode>(() => getSystemMode());

    // Track OS-level dark mode changes so 'system' stays in sync.
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e: MediaQueryListEvent) => setSystemMode(e.matches ? 'dark' : 'light');
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    const effectiveMode: EffectiveThemeMode = mode === 'system' ? systemMode : mode;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', effectiveMode);
    }, [effectiveMode]);

    const setMode = useCallback((next: ThemeMode) => {
        setModeState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // localStorage may be unavailable (private mode, etc.) — fail open.
        }
    }, []);

    const value = useMemo(() => ({ mode, effectiveMode, setMode }), [mode, effectiveMode, setMode]);

    return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = (): ThemeModeContextValue => {
    const context = useContext(ThemeModeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeModeProvider');
    }
    return context;
};

export default ThemeModeContext;
