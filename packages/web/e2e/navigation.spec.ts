import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Navigation', () => {
    test('unauthenticated users are redirected to login', async ({ page }) => {
        await page.goto('/');

        // Should redirect to /login
        await expect(page).toHaveURL('/login');
    });

    test('navbar has all expected links', async ({ page }) => {
        await login(page);

        // Dashboard shows action cards that serve as nav: New Game, New Team, Find Team
        await expect(page.getByText('New Game')).toBeVisible();
        await expect(page.getByText('New Team')).toBeVisible();
        await expect(page.getByText('Find Team')).toBeVisible();
        await expect(page.getByText('Sign Out')).toBeVisible();
    });

    test('logout redirects to login', async ({ page }) => {
        await login(page);

        await page.getByText('Sign Out').click();
        await expect(page).toHaveURL('/login');
        await expect(page.getByText('Welcome Back')).toBeVisible();
    });
});
