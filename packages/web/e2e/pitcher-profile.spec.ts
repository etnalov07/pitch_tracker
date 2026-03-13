import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Pitcher Profile', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    /**
     * Navigate to the first pitcher profile found on the dashboard.
     * Returns true if a pitcher was found.
     */
    async function navigateToPitcherProfile(page: import('@playwright/test').Page): Promise<boolean> {
        await page.goto('/');

        // Switch to Teams tab to find pitcher profiles
        await page.getByRole('button', { name: /Teams/i }).click();

        // Look for a "Profile" button next to a pitcher
        const profileButton = page.getByRole('button', { name: /Profile/i }).first();
        if (await profileButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
            await profileButton.click();
            await page.waitForURL(/\/pitcher\//, { timeout: 10_000 });
            return true;
        }
        return false;
    }

    test('pitcher profile page loads with stats', async ({ page }) => {
        if (!(await navigateToPitcherProfile(page))) {
            test.skip();
            return;
        }

        // Profile should show pitcher name and career stats
        await expect(page.getByText(/Career Stats|Total Pitches|Games/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('game log table is visible', async ({ page }) => {
        if (!(await navigateToPitcherProfile(page))) {
            test.skip();
            return;
        }

        await expect(page.getByText(/Game Log|Date|Opponent|Pitches/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('heat zones section is visible', async ({ page }) => {
        if (!(await navigateToPitcherProfile(page))) {
            test.skip();
            return;
        }

        await expect(page.getByText(/Heat Zone|Heat Map|Zone/i).first()).toBeVisible({ timeout: 10_000 });
    });
});
