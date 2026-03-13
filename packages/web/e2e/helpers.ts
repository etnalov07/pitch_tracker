import { type Page } from '@playwright/test';

export const API_BASE_URL = 'https://bvolante.com/bt-api';

export const TEST_USER = {
    email: process.env.E2E_EMAIL ?? 'testuser@example.com',
    password: process.env.E2E_PASSWORD ?? 'testpassword123',
};

/**
 * Log in via the UI login form.
 * Navigates to /login, fills credentials, clicks Sign In,
 * and waits until the dashboard loads (URL becomes /).
 */
export async function login(page: Page): Promise<void> {
    await page.goto('/login');
    await page.getByPlaceholder('john@example.com').fill(TEST_USER.email);
    await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/', { timeout: 15_000 });
}

/** Common selectors re-used across test files. */
export const selectors = {
    logo: 'text=PitchChart',
    signOutButton: 'text=Sign Out',
    loadingText: 'text=Loading',
};
