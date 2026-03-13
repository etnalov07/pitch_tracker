import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('shows dashboard after login', async ({ page }) => {
        await expect(page).toHaveURL('/');
        await expect(page.getByText('PitchChart')).toBeVisible();
        await expect(page.getByText('Welcome back')).toBeVisible();
    });

    test('displays games tab and teams tab', async ({ page }) => {
        await expect(page.getByRole('button', { name: /Games/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Teams/i })).toBeVisible();
    });

    test('quick action buttons are visible', async ({ page }) => {
        await expect(page.getByText('New Game')).toBeVisible();
        await expect(page.getByText('New Team')).toBeVisible();
        await expect(page.getByText('Find Team')).toBeVisible();
    });

    test('can switch between Games and Teams tabs', async ({ page }) => {
        // Click Teams tab
        await page.getByRole('button', { name: /Teams/i }).click();

        // The teams section should now be visible (either team cards or empty state)
        const teamsContent = page.getByText(/No Teams Yet|Roster|Manage Roster/i);
        await expect(teamsContent.first()).toBeVisible({ timeout: 10_000 });

        // Click Games tab
        await page.getByRole('button', { name: /Games/i }).click();

        // Games content should be visible (either game list or empty state)
        const gamesContent = page.getByText(/No Games Yet|Upcoming|Recent|Scheduled|Live/i);
        await expect(gamesContent.first()).toBeVisible({ timeout: 10_000 });
    });
});
