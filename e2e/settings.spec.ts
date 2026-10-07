import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';
import { SettingsHelpers } from './helpers/settings-helpers';

test.describe('User Settings', () => {
  let testHelpers: TestHelpers;
  let settingsHelpers: SettingsHelpers;
  let testEmail: string;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    settingsHelpers = new SettingsHelpers(page);

    // Create and login as test user
    testEmail = testHelpers.generateTestEmail();
    await testHelpers.register(
      testEmail,
      'TestPass123!',
      'John',
      'Doe'
    );
  });

  test('should update profile information', async ({ page }) => {
    // Update profile
    await settingsHelpers.updateProfile({
      firstName: 'Jane',
      lastName: 'Smith',
      company: 'Test Corp',
      phoneNumber: '123-456-7890'
    });

    // Verify updates
    await page.reload();
    await expect(page.locator('[data-testid="firstName-input"]'))
      .toHaveValue('Jane');
    await expect(page.locator('[data-testid="lastName-input"]'))
      .toHaveValue('Smith');
    await expect(page.locator('[data-testid="company-input"]'))
      .toHaveValue('Test Corp');
    await expect(page.locator('[data-testid="phone-input"]'))
      .toHaveValue('123-456-7890');
  });

  test('should change password successfully', async ({ page }) => {
    const newPassword = 'NewPass456!';
    
    // Change password
    await settingsHelpers.changePassword('TestPass123!', newPassword);
    
    // Logout
    await testHelpers.logout();
    
    // Try login with new password
    await testHelpers.login(testEmail, newPassword);
    
    // Verify login successful
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should update notification preferences', async ({ page }) => {
    // Update preferences
    await settingsHelpers.updateNotificationPreferences({
      email: true,
      push: false,
      marketing: false
    });

    // Verify updates persisted
    await page.reload();
    await page.click('[data-testid="notifications-tab"]');
    
    await expect(page.locator('[data-testid="email-notifications"]'))
      .toBeChecked();
    await expect(page.locator('[data-testid="push-notifications"]'))
      .not.toBeChecked();
    await expect(page.locator('[data-testid="marketing-notifications"]'))
      .not.toBeChecked();
  });

  test('should handle validation errors', async ({ page }) => {
    await settingsHelpers.navigateToSettings();
    
    // Try to save with invalid phone number
    await page.fill('[data-testid="phone-input"]', 'invalid-phone');
    await page.click('[data-testid="save-profile"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="phone-error"]'))
      .toBeVisible();
  });

  test('should handle password change validation', async ({ page }) => {
    await settingsHelpers.navigateToSettings();
    await page.click('[data-testid="security-tab"]');
    
    // Try to change with wrong current password
    await page.fill('[data-testid="current-password"]', 'WrongPass123!');
    await page.fill('[data-testid="new-password"]', 'NewPass456!');
    await page.fill('[data-testid="confirm-password"]', 'NewPass456!');
    await page.click('[data-testid="change-password"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="password-error"]'))
      .toBeVisible();
  });
});
