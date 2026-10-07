import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Navigation and Layout', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should navigate through main sections', async ({ page }) => {
    await page.goto('/');

    // Check navigation to different sections
    for (const section of ['pricing', 'about', 'contact']) {
      await helpers.navigateTo(section);
      await expect(page).toHaveURL(new RegExp(`.*${section}`));
      
      // Verify section content is visible
      await expect(page.locator(`[data-testid="${section}-content"]`))
        .toBeVisible();
    }
  });

  test('should have responsive navigation menu', async ({ page }) => {
    await page.goto('/');

    // Test mobile menu
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu should be hidden initially
    await expect(page.locator('[data-testid="mobile-menu"]'))
      .toHaveAttribute('aria-hidden', 'true');

    // Click hamburger menu
    await page.click('[data-testid="menu-button"]');

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu"]'))
      .toHaveAttribute('aria-hidden', 'false');

    // Test desktop menu
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Desktop menu items should be visible
    await expect(page.locator('[data-testid="desktop-nav"]'))
      .toBeVisible();
  });

  test('should maintain user session across pages', async ({ page }) => {
    // Login first
    const testEmail = helpers.generateTestEmail();
    await helpers.register(
      testEmail,
      'TestPass123!',
      'John',
      'Doe'
    );

    // Navigate through different authenticated pages
    for (const section of ['dashboard', 'settings', 'billing']) {
      await helpers.navigateTo(section);
      
      // Verify user menu is still present
      await expect(page.locator('[data-testid="user-menu"]'))
        .toBeVisible();
    }
  });
});
