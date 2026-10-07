import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers/test-helpers';
import { BillingHelpers } from './helpers/billing-helpers';

test.describe('Billing and Subscription', () => {
  let testHelpers: TestHelpers;
  let billingHelpers: BillingHelpers;

  test.beforeEach(async ({ page }) => {
    testHelpers = new TestHelpers(page);
    billingHelpers = new BillingHelpers(page);

    // Create and login as test user
    const testEmail = testHelpers.generateTestEmail();
    await testHelpers.register(
      testEmail,
      'TestPass123!',
      'John',
      'Doe'
    );
  });

  test('should display current subscription details', async ({ page }) => {
    await billingHelpers.navigateToBilling();
    
    // Verify subscription components are visible
    await expect(page.locator('[data-testid="current-plan"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="billing-cycle"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="next-payment"]'))
      .toBeVisible();
  });

  test('should successfully change subscription plan', async ({ page }) => {
    // Change to premium plan
    await billingHelpers.changePlan('premium');
    
    // Verify plan change
    await expect(page.locator('[data-testid="current-plan"]'))
      .toContainText('Premium');
    
    // Verify confirmation email text is visible
    await expect(page.locator('[data-testid="confirmation-message"]'))
      .toContainText('confirmation email');
  });

  test('should add new payment method', async ({ page }) => {
    await billingHelpers.addPaymentMethod({
      cardNumber: '4242424242424242',
      expiry: '1230',
      cvc: '123',
      name: 'John Doe'
    });

    // Verify new card is listed
    await expect(page.locator('[data-testid="payment-methods"]'))
      .toContainText('•••• 4242');
  });

  test('should display billing history', async ({ page }) => {
    await billingHelpers.viewBillingHistory();
    
    // Verify billing history table
    const historyTable = page.locator('[data-testid="billing-history-table"]');
    await expect(historyTable).toBeVisible();
    
    // Verify table headers
    const headers = ['Date', 'Description', 'Amount', 'Status'];
    for (const header of headers) {
      await expect(historyTable.locator('th', { hasText: header }))
        .toBeVisible();
    }
  });

  test('should handle failed payment method addition', async ({ page }) => {
    await billingHelpers.navigateToBilling();
    await page.click('[data-testid="add-payment-method"]');
    
    // Fill invalid card details
    await page.fill('[data-testid="card-number"]', '4000000000000002');
    await page.fill('[data-testid="card-expiry"]', '1230');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-holder-name"]', 'John Doe');
    
    await page.click('[data-testid="save-card"]');
    
    // Verify error message
    await expect(page.locator('[data-testid="error-message"]'))
      .toBeVisible();
  });
});
