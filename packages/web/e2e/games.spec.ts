import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Games', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('create game form loads with required fields', async ({ page }) => {
        await page.goto('/games/new');

        // Should show game setup form elements
        await expect(page.getByText(/New Game|Game Setup|Create Game/i).first()).toBeVisible();

        // Expect team selection and date fields
        await expect(page.getByText(/Home|Away/i).first()).toBeVisible();
    });

    test('game history page loads with filter options', async ({ page }) => {
        await page.goto('/games/history');

        await expect(page.getByText(/Game History|All Games|Past Games/i).first()).toBeVisible();

        // Filter bar should be visible
        const filterButtons = page.getByRole('button', { name: /All|Completed|Scheduled|In Progress/i });
        await expect(filterButtons.first()).toBeVisible({ timeout: 10_000 });
    });

    test('game detail page shows score and status', async ({ page }) => {
        // Navigate to game history to find a game
        await page.goto('/games/history');

        // Try to click on a game row
        const gameRow = page.locator('tr').nth(1);
        const viewButton = page.getByRole('button', { name: /View/i }).first();

        if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await viewButton.click();
        } else if (await gameRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await gameRow.click();
        } else {
            test.skip();
            return;
        }

        // Game detail page should show score/status info
        await expect(page.getByText(/Score|Inning|Final|Live|Scheduled/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('opponent lineup page loads', async ({ page }) => {
        // Navigate to game history to find a game
        await page.goto('/games/history');

        const viewButton = page.getByRole('button', { name: /View/i }).first();
        const gameRow = page.locator('tr').nth(1);

        if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await viewButton.click();
        } else if (await gameRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await gameRow.click();
        } else {
            test.skip();
            return;
        }

        // Navigate to the lineup sub-page
        const url = page.url();
        await page.goto(`${url}/lineup`);

        await expect(page.getByText(/Lineup|Opponent|Batting Order/i).first()).toBeVisible({ timeout: 10_000 });
    });
});
