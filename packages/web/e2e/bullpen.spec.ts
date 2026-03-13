import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Bullpen', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    /**
     * Helper to get the first team ID by navigating to the dashboard
     * and looking at team cards.
     */
    async function getFirstTeamId(page: import('@playwright/test').Page): Promise<string | null> {
        await page.goto('/');

        // Switch to Teams tab
        await page.getByRole('button', { name: /Teams/i }).click();

        // Try to find a "Manage Roster" button that leads to /teams/:id
        const manageButton = page.getByRole('button', { name: /Manage Roster/i }).first();
        if (await manageButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await manageButton.click();
            await page.waitForURL(/\/teams\//, { timeout: 10_000 });
            const match = page.url().match(/\/teams\/([^/]+)/);
            return match ? match[1] : null;
        }
        return null;
    }

    test('bullpen sessions list loads', async ({ page }) => {
        const teamId = await getFirstTeamId(page);
        if (!teamId) {
            test.skip();
            return;
        }

        await page.goto(`/teams/${teamId}/bullpen`);

        await expect(page.getByText(/Bullpen|Sessions/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('new bullpen session form shows pitcher/intensity selectors', async ({ page }) => {
        const teamId = await getFirstTeamId(page);
        if (!teamId) {
            test.skip();
            return;
        }

        await page.goto(`/teams/${teamId}/bullpen/new`);

        // Should show pitcher selection and intensity options
        await expect(page.getByText(/Pitcher|Select a Pitcher/i).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Intensity|Light|Medium|Full/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('bullpen plans page loads', async ({ page }) => {
        const teamId = await getFirstTeamId(page);
        if (!teamId) {
            test.skip();
            return;
        }

        await page.goto(`/teams/${teamId}/bullpen/plans`);

        await expect(page.getByText(/Plans|Bullpen Plans/i).first()).toBeVisible({ timeout: 10_000 });
    });

    test('plan editor shows pitch sequence builder', async ({ page }) => {
        const teamId = await getFirstTeamId(page);
        if (!teamId) {
            test.skip();
            return;
        }

        await page.goto(`/teams/${teamId}/bullpen/plans/new`);

        // Should show form fields for plan name and pitch sequence
        await expect(page.getByText(/Plan Name|Name|New Plan/i).first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Pitch|Fastball|Add Pitch|Sequence/i).first()).toBeVisible({ timeout: 10_000 });
    });
});
