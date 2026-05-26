// Color values are CSS variable references defined in `styles/global.css`.
// Mirrors packages/web/src/styles/theme.ts so marketing UI matches the app.
// Marketing is light-mode only (no [data-theme='dark'] block) — see plan.
export const theme = {
    colors: {
        primary: {
            50: 'var(--color-primary-50)',
            100: 'var(--color-primary-100)',
            200: 'var(--color-primary-200)',
            300: 'var(--color-primary-300)',
            400: 'var(--color-primary-400)',
            500: 'var(--color-primary-500)',
            600: 'var(--color-primary-600)',
            700: 'var(--color-primary-700)',
            800: 'var(--color-primary-800)',
            900: 'var(--color-primary-900)',
        },
        gray: {
            50: 'var(--color-gray-50)',
            100: 'var(--color-gray-100)',
            200: 'var(--color-gray-200)',
            300: 'var(--color-gray-300)',
            400: 'var(--color-gray-400)',
            500: 'var(--color-gray-500)',
            600: 'var(--color-gray-600)',
            700: 'var(--color-gray-700)',
            800: 'var(--color-gray-800)',
            900: 'var(--color-gray-900)',
        },
        green: {
            50: 'var(--color-green-50)',
            100: 'var(--color-green-100)',
            200: 'var(--color-green-200)',
            300: 'var(--color-green-300)',
            400: 'var(--color-green-400)',
            500: 'var(--color-green-500)',
            600: 'var(--color-green-600)',
            700: 'var(--color-green-700)',
            800: 'var(--color-green-800)',
        },
        red: {
            500: 'var(--color-red-500)',
            600: 'var(--color-red-600)',
            700: 'var(--color-red-700)',
        },
        yellow: {
            500: 'var(--color-yellow-500)',
            600: 'var(--color-yellow-600)',
        },
        orange: {
            500: 'var(--color-orange-500)',
            600: 'var(--color-orange-600)',
        },
    },
    surfaces: {
        body: 'var(--surface-body)',
        card: 'var(--surface-card)',
        elevated: 'var(--surface-elevated)',
        text: 'var(--surface-text)',
        textMuted: 'var(--surface-text-muted)',
        textSubtle: 'var(--surface-text-subtle)',
        border: 'var(--surface-border)',
        borderStrong: 'var(--surface-border-strong)',
    },
    accents: {
        blue: 'var(--accent-blue)',
        blueHover: 'var(--accent-blue-hover)',
        green: 'var(--accent-green)',
        greenHover: 'var(--accent-green-hover)',
    },
    brand: {
        headerStart: 'var(--header-bg-start)',
        headerEnd: 'var(--header-bg-end)',
    },
    spacing: {
        xs: '0.25rem', // 4px
        sm: '0.5rem', // 8px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.5rem', // 24px
        '2xl': '2rem', // 32px
        '3xl': '3rem', // 48px
        '4xl': '4rem', // 64px
        '5xl': '6rem', // 96px
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
    },
    fontSize: {
        xs: '0.75rem', // 12px
        sm: '0.875rem', // 14px
        base: '1rem', // 16px
        lg: '1.125rem', // 18px
        xl: '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem', // 48px
        '6xl': '3.75rem', // 60px
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
    },
};

export type Theme = typeof theme;

// Helper for media queries: `${mq.md} { ... }`
export const mq = {
    sm: `@media (min-width: ${theme.breakpoints.sm})`,
    md: `@media (min-width: ${theme.breakpoints.md})`,
    lg: `@media (min-width: ${theme.breakpoints.lg})`,
    xl: `@media (min-width: ${theme.breakpoints.xl})`,
};
