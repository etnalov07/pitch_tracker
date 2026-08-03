// Color math for brand theming. Given a team/organization's primary + secondary
// hex, we derive a full set of CSS custom properties (a 50–900 primary ramp,
// tinted surfaces, and a header gradient) that layer on top of the base tokens
// in `index.css`. Everything is deterministic so the no-FOUC bootstrap in
// `public/index.html` can persist the derived var-map and re-apply it verbatim
// on first paint without duplicating this logic.
//
// Guardrails baked in here (see deriveBrandTokens):
//   - Text and gray tokens are never derived — they ride the neutral, WCAG-
//     checked ramp in index.css, so arbitrary brand hex can't break contrast.
//   - Surface tint is clamped (light ≤5%, dark ≤10%) so cards can't drift far
//     enough to hurt text legibility.
//   - Header gradient stops are contrast-nudged against white text.

import type { EffectiveThemeMode } from '../contexts/ThemeModeContext';

export const DEFAULT_BRAND = {
    primary: '#486581',
    secondary: '#1f2937',
    accent: '#22c55e',
};

// Neutral surface anchors per mode — mirrored from index.css so a small brand
// tint is mixed into the same base surfaces the rest of the app uses.
const SURFACE_ANCHORS = {
    light: {
        body: '#ffffff',
        card: '#ffffff',
        elevated: '#f9fafb',
        border: '#e5e7eb',
        borderStrong: '#d1d5db',
    },
    dark: {
        body: '#0f172a',
        card: '#1f2937',
        elevated: '#2d3748',
        border: '#374151',
        borderStrong: '#4b5563',
    },
} as const;

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

// Accept #RGB / #RRGGBB (with or without leading #). Returns null on garbage so
// callers can fall back to a default instead of rendering a broken color.
export const normalizeHex = (input: string | undefined | null): string | null => {
    if (!input) return null;
    let hex = input.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return `#${hex.toLowerCase()}`;
};

export const hexToRgb = (hex: string): Rgb => {
    const normalized = normalizeHex(hex) ?? DEFAULT_BRAND.primary;
    const int = parseInt(normalized.slice(1), 16);
    return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
};

export const rgbToHex = ({ r, g, b }: Rgb): string => {
    const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Linear (sRGB-space) blend of two colors. t=0 → a, t=1 → b. Simple channel mix,
// matching the app's existing lightweight color handling.
export const mix = (a: string, b: string, t: number): string => {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const amt = clamp(t, 0, 1);
    return rgbToHex({
        r: ca.r + (cb.r - ca.r) * amt,
        g: ca.g + (cb.g - ca.g) * amt,
        b: ca.b + (cb.b - ca.b) * amt,
    });
};

export const lighten = (hex: string, amt: number): string => mix(hex, '#ffffff', amt);
export const darken = (hex: string, amt: number): string => mix(hex, '#000000', amt);

// WCAG relative luminance. Hoisted out of ColorPicker so the picker's contrast
// warning and the brand derivation share one implementation.
export const getLuminance = (hex: string): number => {
    const { r, g, b } = hexToRgb(hex);
    const [rs, gs, bs] = [r, g, b].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (hex1: string, hex2: string): number => {
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

// Nudge a background color darker (up to a bound) until white text clears the
// target ratio. Used to keep the header gradient legible under white text no
// matter what brand hex the user picks.
export const ensureContrast = (bg: string, fg: string, min: number): string => {
    let candidate = bg;
    for (let i = 0; i < 12 && getContrastRatio(candidate, fg) < min; i += 1) {
        candidate = darken(candidate, 0.08);
    }
    return candidate;
};

// Fixed mix ratios anchoring the base hex at the 600 stop in light mode. Lighter
// stops blend toward white; darker stops blend toward black (kept as pure primary
// shades so the ramp stays monotonic regardless of the secondary color).
const LIGHT_LIGHTER: Record<string, number> = { '50': 0.92, '100': 0.84, '200': 0.68, '300': 0.5, '400': 0.32, '500': 0.16 };
const LIGHT_DARKER: Record<string, number> = { '700': 0.2, '800': 0.38, '900': 0.55 };

// Dark mode lifts the ramp ~2 stops: the base sits at 400, low stops sink into
// the dark surface (brand-tinted), high stops rise toward white — mirroring the
// dark-mode strategy in index.css so 500/600 read as bright accents on dark.
const DARK_TO_SURFACE: Record<string, number> = { '50': 0.85, '100': 0.72, '200': 0.55, '300': 0.3 };
const DARK_TO_WHITE: Record<string, number> = { '500': 0.18, '600': 0.34, '700': 0.52, '800': 0.7, '900': 0.86 };

export type Ramp = Record<string, string>;

// Generate a 50–900 ramp from a single base hex, mode-aware.
export const generateRamp = (baseHex: string, opts: { darkMode: boolean }): Ramp => {
    const base = normalizeHex(baseHex) ?? DEFAULT_BRAND.primary;
    const ramp: Ramp = {};

    if (opts.darkMode) {
        const surface = SURFACE_ANCHORS.dark.body;
        Object.entries(DARK_TO_SURFACE).forEach(([stop, t]) => {
            ramp[stop] = mix(base, surface, t);
        });
        ramp['400'] = base;
        Object.entries(DARK_TO_WHITE).forEach(([stop, t]) => {
            ramp[stop] = lighten(base, t);
        });
    } else {
        Object.entries(LIGHT_LIGHTER).forEach(([stop, t]) => {
            ramp[stop] = lighten(base, t);
        });
        ramp['600'] = base;
        Object.entries(LIGHT_DARKER).forEach(([stop, t]) => {
            ramp[stop] = darken(base, t);
        });
    }

    return ramp;
};

export interface BrandInput {
    primary?: string;
    secondary?: string;
    accent?: string;
}

// The exact list of CSS custom properties the brand layer owns. The provider
// removes precisely these on clear so the stylesheet's base values resurface.
export const BRAND_VAR_KEYS: string[] = [
    ...['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'].map((s) => `--color-primary-${s}`),
    '--team-primary',
    '--team-secondary',
    '--team-accent',
    '--header-bg-start',
    '--header-bg-end',
    '--surface-body',
    '--surface-card',
    '--surface-elevated',
    '--surface-border',
    '--surface-border-strong',
];

// Derive the full brand var-map. This is the single source of truth for what a
// team/org brand looks like; the bootstrap persists and replays its output.
export const deriveBrandTokens = (brand: BrandInput, effectiveMode: EffectiveThemeMode): Record<string, string> => {
    const dark = effectiveMode === 'dark';
    const primary = normalizeHex(brand.primary) ?? DEFAULT_BRAND.primary;
    const secondary = normalizeHex(brand.secondary) ?? DEFAULT_BRAND.secondary;
    const accent = normalizeHex(brand.accent) ?? DEFAULT_BRAND.accent;

    const ramp = generateRamp(primary, { darkMode: dark });
    const tokens: Record<string, string> = {};

    Object.entries(ramp).forEach(([stop, value]) => {
        tokens[`--color-primary-${stop}`] = value;
    });

    // Raw brand vars for the existing gradient-header consumers.
    tokens['--team-primary'] = primary;
    tokens['--team-secondary'] = secondary;
    tokens['--team-accent'] = accent;

    // Header gradient: dark brand ramp toward the secondary, nudged so white
    // header text always clears AA. Stays dark in both modes (matches index.css,
    // which keeps header chrome navy under hardcoded white text).
    const headerStart = ensureContrast(darken(primary, 0.35), '#ffffff', 4.5);
    const headerEnd = ensureContrast(mix(secondary, '#000000', 0.15), '#ffffff', 4.5);
    tokens['--header-bg-start'] = headerStart;
    tokens['--header-bg-end'] = headerEnd;

    // Surfaces: neutral anchors mixed with a clamped amount of primary so cards
    // pick up the brand without losing their light/dark base.
    const anchors = dark ? SURFACE_ANCHORS.dark : SURFACE_ANCHORS.light;
    const tint = dark ? 0.1 : 0.05;
    tokens['--surface-body'] = mix(anchors.body, primary, tint);
    tokens['--surface-card'] = mix(anchors.card, primary, tint);
    tokens['--surface-elevated'] = mix(anchors.elevated, primary, tint);
    tokens['--surface-border'] = mix(anchors.border, primary, tint);
    tokens['--surface-border-strong'] = mix(anchors.borderStrong, primary, tint);

    return tokens;
};
