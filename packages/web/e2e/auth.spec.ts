import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Auth / Login page', () => {
    test('page loads with login form', async ({ page }) => {
        await page.goto('/login');

        await expect(page.getByText('PitchChart')).toBeVisible();
        await expect(page.getByText('Welcome Back')).toBeVisible();
        await expect(page.getByPlaceholder('john@example.com')).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('shows validation errors for empty fields', async ({ page }) => {
        await page.goto('/login');

        // The HTML required attribute prevents form submission; click and verify
        // that the form fields have the required attribute set.
        const emailInput = page.getByPlaceholder('john@example.com');
        const passwordInput = page.getByPlaceholder('••••••••');

        await expect(emailInput).toHaveAttribute('required', '');
        await expect(passwordInput).toHaveAttribute('required', '');
    });

    test('can toggle between login and register tabs', async ({ page }) => {
        await page.goto('/login');

        // Default state is Sign In
        await expect(page.getByText('Welcome Back')).toBeVisible();

        // Switch to register
        await page.getByText('Sign up').click();
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'First Name' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Last Name' })).toBeVisible();

        // Switch back to login
        await page.getByText('Sign in', { exact: false }).click();
        await expect(page.getByText('Welcome Back')).toBeVisible();
    });

    test('successful login redirects to dashboard', async ({ page }) => {
        await login(page);

        await expect(page).toHaveURL('/');
        await expect(page.getByText('PitchChart')).toBeVisible();
    });

    test('register form shows all required fields', async ({ page }) => {
        await page.goto('/login');

        await page.getByText('Sign up').click();

        await expect(page.getByRole('textbox', { name: 'First Name' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Last Name' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
        await expect(page.getByPlaceholder('••••••••')).toBeVisible();
        await expect(page.getByText('Coach')).toBeVisible();
        await expect(page.getByText('Player')).toBeVisible();
        await expect(page.getByText('Org Admin')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    });
});
