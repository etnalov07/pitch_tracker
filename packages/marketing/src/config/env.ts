// Typed access to import.meta.env. Single source of truth for build-time config.
const env = import.meta.env;

export const APP_STORE_URL: string = (env.VITE_APP_STORE_URL as string | undefined)?.trim() ?? '';
export const PLAY_STORE_URL: string = (env.VITE_PLAY_STORE_URL as string | undefined)?.trim() ?? '';
export const WEB_APP_URL: string = (env.VITE_WEB_APP_URL as string | undefined)?.trim() || 'https://bvolante.com';
export const CONTACT_EMAIL: string = (env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'brian.volante@bvolante.com';

export const hasAppStoreUrl = APP_STORE_URL.length > 0;
export const hasPlayStoreUrl = PLAY_STORE_URL.length > 0;

export const signInUrl = `${WEB_APP_URL.replace(/\/$/, '')}/login`;
export const signUpUrl = `${WEB_APP_URL.replace(/\/$/, '')}/login`;
export const mailtoUrl = `mailto:${CONTACT_EMAIL}`;
