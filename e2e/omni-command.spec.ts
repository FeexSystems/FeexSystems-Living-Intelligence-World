import { test, expect } from '@playwright/test';

test.describe('Omni-Command Shell', () => {
    test('routes twin intent to spatial view', async ({ page }) => {
        await page.goto('/omni');

        // Locate the command input field (assume it has an id, placeholder, or role)
        const input = page.locator('input[placeholder*="Command"], input[type="text"]');
        await expect(input).toBeVisible();

        // Enter a command that triggers the DIGITAL_TWIN shell
        await input.fill('show me the marketing twin spatial view');
        await input.press('Enter');

        // The shell should route the intent and eventually show the DigitalTwin component
        // which contains a canvas element
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
    });
});
