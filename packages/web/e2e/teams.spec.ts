import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Teams', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('teams page loads', async ({ page }) => {
        await page.goto('/teams');

        await expect(page.getByText('Teams')).toBeVisible();
    });

    test('create team button opens form', async ({ page }) => {
        await page.goto('/teams');

        // Look for a "Create Team" or "+ New Team" button
        const createButton = page.getByRole('button', { name: /Create|New/i });
        await expect(createButton.first()).toBeVisible();

        await createButton.first().click();

        // Form should appear with name input
        await expect(page.getByText(/Team Name|Name/i).first()).toBeVisible();
    });

    test('team detail page shows roster', async ({ page }) => {
        // Navigate to teams page first to find a team
        await page.goto('/teams');

        // Try to click on a team card or "View" button if available
        const viewButton = page.getByRole('button', { name: /View/i }).first();
        const teamCard = page.locator('[class*="TeamCard"]').first();

        if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await viewButton.click();
        } else if (await teamCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await teamCard.click();
        } else {
            // No teams exist — skip the rest of the test
            test.skip();
            return;
        }

        // Should be on team detail page
        await expect(page.getByText(/Roster|Add Player/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('team settings page loads with logo/color options', async ({ page }) => {
        // Navigate to teams page first
        await page.goto('/teams');

        const viewButton = page.getByRole('button', { name: /View/i }).first();
        const teamCard = page.locator('[class*="TeamCard"]').first();

        if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await viewButton.click();
        } else if (await teamCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await teamCard.click();
        } else {
            test.skip();
            return;
        }

        // Wait for team detail to load, then navigate to settings
        await page.waitForTimeout(2_000);
        const settingsButton = page.getByRole('button', { name: /Settings/i }).first();
        if (await settingsButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await settingsButton.click();
        } else {
            // Try navigating directly via URL manipulation
            const url = page.url();
            await page.goto(`${url}/settings`);
        }

        // Settings page should show logo/color sections
        await expect(page.getByText(/Logo|Color|Team Settings/i).first()).toBeVisible({ timeout: 10_000 });
    });
});
