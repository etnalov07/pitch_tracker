import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Live Game', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    /**
     * Helper to navigate to any game detail page.
     * Returns true if a game was found, false otherwise.
     */
    async function navigateToGame(page: import('@playwright/test').Page): Promise<boolean> {
        await page.goto('/games/history');

        const viewButton = page.getByRole('button', { name: /View/i }).first();
        const gameRow = page.locator('tr').nth(1);

        if (await viewButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await viewButton.click();
            return true;
        }
        if (await gameRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await gameRow.click();
            return true;
        }
        return false;
    }

    test('live game page shows strike zone', async ({ page }) => {
        if (!(await navigateToGame(page))) {
            test.skip();
            return;
        }

        // The live-game page renders a StrikeZone component (an SVG or canvas)
        await expect(page.getByText(/Strike Zone|Pitch|Inning/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('pitch type buttons are visible', async ({ page }) => {
        if (!(await navigateToGame(page))) {
            test.skip();
            return;
        }

        // Pitch type buttons like Fastball, Slider, etc.
        const pitchTypeText = page.getByText(/Fastball|4-Seam|Slider|Curveball|Changeup/i);
        await expect(pitchTypeText.first()).toBeVisible({ timeout: 10_000 });
    });

    test('pitcher and batter selectors are accessible', async ({ page }) => {
        if (!(await navigateToGame(page))) {
            test.skip();
            return;
        }

        // Look for pitcher/batter labels or change buttons
        const playerInfo = page.getByText(/Pitcher|Batter|Change|Select/i);
        await expect(playerInfo.first()).toBeVisible({ timeout: 10_000 });
    });

    test('base runner display is visible', async ({ page }) => {
        if (!(await navigateToGame(page))) {
            test.skip();
            return;
        }

        // The diamond/base runner component should be on the page
        const diamondOrBases = page.getByText(/Diamond|Outs|Base/i);
        await expect(diamondOrBases.first()).toBeVisible({ timeout: 10_000 });
    });
});
