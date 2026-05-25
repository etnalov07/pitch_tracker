import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Colors matching the web app theme
export const colors = {
    primary: {
        50: '#f0f4f8',
        100: '#d9e2ec',
        200: '#bcccdc',
        300: '#9fb3c8',
        400: '#829ab1',
        500: '#627d98',
        600: '#486581',
        700: '#334e68',
        800: '#243b53',
        900: '#0B1F3A',
    },
    gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },
    green: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
    },
    red: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#C62828',
        700: '#b91c1c',
        800: '#991b1b',
    },
    yellow: {
        50: '#fefce8',
        100: '#fef9c3',
        200: '#fef08a',
        300: '#fde047',
        400: '#facc15',
        500: '#eab308',
        600: '#ca8a04',
        700: '#a16207',
        800: '#854d0e',
    },
    blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
    },
    orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        200: '#fed7aa',
        300: '#fdba74',
        400: '#fb923c',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
        800: '#9a3412',
    },
    amber: {
        50: '#fffbeb',
        100: '#fef3c7',
        300: '#fcd34d',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
    },
    purple: {
        50: '#f5f3ff',
        100: '#ede9fe',
        500: '#8b5cf6',
        600: '#7c3aed',
        700: '#6d28d9',
    },
    // Scoreboard palette — navy + amber + chalk inherited from the deleted
    // /pitch-calling screen (UX-PC-02). Used by the active-call badge on /live
    // so the aesthetic survives the consolidation.
    scoreboard: {
        navy: '#0A1628',
        navyLight: '#132240',
        amber: '#F5A623',
        chalk: '#F0EDE6',
        chalkDim: '#C8C3BA',
        border: '#2A3A55',
    },
};

// Semantic aliases for common UI patterns — tints used together for the same
// notional state. Keeps callers from picking individual scale stops.
export const semantic = {
    warningBg: colors.amber[100], // #fef3c7
    warningText: colors.amber[800], // #92400e
    warningBorder: colors.amber[300], // #fcd34d
    successBg: colors.green[100], // #dcfce7
    successText: colors.green[700], // #15803d
    successBorder: colors.green[300], // #86efac
    errorBg: colors.red[100], // #fee2e2
    errorText: colors.red[700], // #b91c1c
    errorBorder: colors.red[300], // #fca5a5
    infoBg: colors.blue[50], // #eff6ff
    infoText: colors.blue[700], // #1d4ed8
    infoBorder: colors.blue[200], // #bfdbfe
};

// Accent palette — for CTA backgrounds. Stays vibrant in both light and dark
// modes (Paper's brand inversions leave 600-tier as too pale for button fills).
// Mobile StyleSheet is static, so a single mid-vibrant palette serves both modes.
export const accents = {
    blue: '#3b82f6',
    blueHover: '#2563eb',
    red: '#dc2626',
    redHover: '#b91c1c',
    green: '#16a34a',
    greenHover: '#15803d',
    violet: '#7c3aed',
    violetHover: '#6d28d9',
};

export const lightTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: colors.primary[700],
        primaryContainer: colors.primary[100],
        secondary: colors.gray[600],
        secondaryContainer: colors.gray[100],
        tertiary: colors.green[600],
        tertiaryContainer: colors.green[100],
        surface: '#ffffff',
        surfaceVariant: colors.gray[50],
        background: colors.gray[50],
        error: colors.red[600],
        errorContainer: colors.red[100],
        onPrimary: '#ffffff',
        onSecondary: '#ffffff',
        onSurface: colors.gray[900],
        onSurfaceVariant: colors.gray[600],
        onBackground: colors.gray[900],
        outline: colors.gray[300],
        outlineVariant: colors.gray[200],
    },
};

export const darkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: colors.primary[300],
        primaryContainer: colors.primary[800],
        secondary: colors.gray[400],
        secondaryContainer: colors.gray[700],
        tertiary: colors.green[400],
        tertiaryContainer: colors.green[800],
        surface: colors.gray[800],
        surfaceVariant: colors.gray[700],
        background: colors.gray[900],
        error: colors.red[400],
        errorContainer: colors.red[800],
        onPrimary: colors.gray[900],
        onSecondary: colors.gray[900],
        onSurface: colors.gray[50],
        onSurfaceVariant: colors.gray[300],
        onBackground: colors.gray[50],
        outline: colors.gray[600],
        outlineVariant: colors.gray[700],
    },
};
