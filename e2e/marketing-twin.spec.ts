import { test, expect } from '@playwright/test';

test.describe('Marketing Digital Twin', () => {
    test('renders the 3D spatial world view', async ({ page }) => {
        // We will intercept the snapshot API to ensure consistent data for the twin view
        await page.route('/api/marketing/twin/snapshot', async route => {
            const json = {
                nodes: [
                    { id: '1', label: 'Campaign Alpha', type: 'campaign' },
                    { id: '2', label: 'Asset Beta', type: 'asset' }
                ],
                edges: [
                    { source: '1', target: '2', relationship: 'contains' }
                ]
            };
            await route.fulfill({ json });
        });

        await page.goto('/world');

        // Verify the WebGL canvas mounts and renders
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
    });
});
