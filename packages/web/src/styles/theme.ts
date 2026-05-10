// Color values are CSS variable references defined in `src/index.css`. The
// `:root` block provides light-mode values; the `[data-theme='dark']` block
// overrides them. Because every styled-component reads these as `var(...)`
// strings, flipping the data-theme attribute on <html> updates the entire app
// without re-rendering — see `contexts/ThemeModeContext.tsx`.
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
            50: 'var(--color-red-50)',
            100: 'var(--color-red-100)',
            200: 'var(--color-red-200)',
            300: 'var(--color-red-300)',
            400: 'var(--color-red-400)',
            500: 'var(--color-red-500)',
            600: 'var(--color-red-600)',
            700: 'var(--color-red-700)',
            800: 'var(--color-red-800)',
        },
        yellow: {
            50: 'var(--color-yellow-50)',
            100: 'var(--color-yellow-100)',
            200: 'var(--color-yellow-200)',
            300: 'var(--color-yellow-300)',
            400: 'var(--color-yellow-400)',
            500: 'var(--color-yellow-500)',
            600: 'var(--color-yellow-600)',
            700: 'var(--color-yellow-700)',
            800: 'var(--color-yellow-800)',
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
    spacing: {
        xs: '0.1875rem', // 3px
        sm: '0.25rem', // 4px
        md: '0.5rem', // 8px
        lg: '0.75rem', // 12px
        xl: '1rem', // 16px
        '2xl': '1.5rem', // 24px
        '3xl': '1.75rem', // 28px
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
    },
    fontSize: {
        xs: '0.575rem', // 9px
        sm: '0.65rem', // 10px
        base: '0.72rem', // 11.5px
        lg: '0.8rem', // 13px
        xl: '0.92rem', // 15px
        '2xl': '1rem', // 16px
        '3xl': '1.15rem', // 18px
        '4xl': '1.44rem', // 23px
    },
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    shadows: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
    },
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
    },
};

export type Theme = typeof theme;
