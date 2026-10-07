import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';

test.describe('Authentication Flow', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should register a new user successfully', async ({ page }) => {
    const testEmail = helpers.generateTestEmail();
    
    await helpers.register(
      testEmail,
      'TestPass123!',
      'John',
      'Doe'
    );

    // Verify user is on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify welcome message
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome, John');
  });

  test('should login and logout successfully', async ({ page }) => {
    // First register a new user
    const testEmail = helpers.generateTestEmail();
    await helpers.register(
      testEmail,
      'TestPass123!',
      'John',
      'Doe'
    );

    // Logout
    await helpers.logout();

    // Login again
    await helpers.login(testEmail, 'TestPass123!');
    
    // Verify login successful
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user menu shows correct name
    await expect(page.locator('[data-testid="user-menu"]'))
      .toContainText('John');
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Try to login with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@email.com');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="login-error"]'))
      .toBeVisible();
  });
});
