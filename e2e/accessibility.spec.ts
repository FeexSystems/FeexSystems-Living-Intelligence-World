import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility E2E — Task 17 / Task 28 / Task 32
 *
 * Real-browser axe scans plus verification of the live-region machinery that
 * `client/lib/announcements.ts` installs at startup.
 *
 * Scope note: this asserts what a *browser* can prove. It cannot verify that a
 * screen reader actually speaks an announcement — only that the correct ARIA
 * live region exists, is exposed to the accessibility tree, and receives the
 * text. See docs/ACCESSIBILITY_COMPLIANCE_REPORT.md §4.
 */

/** Public routes reachable without authentication. */
const PUBLIC_ROUTES = ['/', '/projects', '/navigator', '/evidence'];

/**
 * Serious/critical violations fail the build. `moderate`/`minor` are reported
 * but non-blocking, since the app ships a heavily stylised dark/glass theme
 * where axe flags lower-severity contrast opinions rather than real barriers.
 */
const BLOCKING_IMPACTS = ['serious', 'critical'];

for (const route of PUBLIC_ROUTES) {
  test(`axe scan: ${route} has no serious or critical violations`, async ({ page }) => {
    await page.goto(route);
    // Let the route's lazy chunks and any entrance animations settle.
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) =>
      BLOCKING_IMPACTS.includes(v.impact ?? '')
    );

    // Surface the offending selectors instead of a bare count on failure.
    const summary = blocking
      .map((v) => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map((n) => n.target).join(', ')}`)
      .join('\n');

    expect(blocking, `Blocking axe violations on ${route}:\n${summary}`).toEqual([]);
  });
}

test.describe('Live regions (Task 28)', () => {
  test('mounts the polite and assertive regions at startup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const polite = page.locator('#a11y-live-region-polite');
    const assertive = page.locator('#a11y-live-region-assertive');

    await expect(polite).toHaveCount(1);
    await expect(assertive).toHaveCount(1);

    // Correct role/priority pairing — assertive maps to role="alert".
    await expect(polite).toHaveAttribute('role', 'status');
    await expect(polite).toHaveAttribute('aria-live', 'polite');
    await expect(assertive).toHaveAttribute('role', 'alert');
    await expect(assertive).toHaveAttribute('aria-live', 'assertive');
  });

  test('regions are exposed to the accessibility tree, not hidden', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const polite = page.locator('#a11y-live-region-polite');
    await expect(polite).toHaveAttribute('aria-atomic', 'true');

    // `display: none` / `visibility: hidden` would silence the region. Assert
    // the computed style keeps it in the a11y tree (clipped, not hidden).
    const styles = await polite.evaluate((el) => {
      const cs = window.getComputedStyle(el as Element);
      return { display: cs.display, visibility: cs.visibility };
    });
    expect(styles.display).not.toBe('none');
    expect(styles.visibility).not.toBe('hidden');
  });

  test('the forgot-password flow announces its outcome (WCAG 4.1.3)', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // Start from a known-clean region so the assertion can only pass because of
    // this flow's announcement, not a leftover from an earlier one.
    await page.evaluate(() => {
      const el = document.getElementById('a11y-live-region-polite');
      if (el) el.textContent = '';
    });

    await page.fill('[data-testid="email-input"]', 'someone@example.com');
    await page.locator('form').evaluate((f) => (f as HTMLFormElement).requestSubmit());

    // The success panel replaces the form and the polite region receives text.
    await expect(page.locator('#a11y-live-region-polite')).not.toHaveText('', {
      timeout: 10000,
    });

    const announced = await page.locator('#a11y-live-region-polite').textContent();
    expect(announced?.toLowerCase()).toContain('reset');
  });

  test('announces a page-name change on client-side navigation (WCAG 2.4.2 / 4.1.3)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Not announced on first mount (the document title already conveys it).
    await page.evaluate(() => {
      const el = document.getElementById('a11y-live-region-polite');
      if (el) el.textContent = '';
    });

    // Client-side navigation: no document reload, so assistive tech needs the cue.
    await page.locator('a[href="/projects"]').first().click();
    await expect(page).toHaveURL(/\/projects/);

    await expect(page.locator('#a11y-live-region-polite')).not.toHaveText('', {
      timeout: 10000,
    });
  });
});

test.describe('Keyboard navigation (Task 21)', () => {
  test('skip link is reachable by keyboard and targets main content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main-content"]').first();
    await expect(skipLink).toBeFocused();

    // The target must exist, or the skip link is a dead end.
    await expect(page.locator('#main-content')).toHaveCount(1);
  });
});

test.describe('Landmarks (Task 26)', () => {
  /**
   * Guards the app-shell landmark contract.
   *
   * App.tsx wraps every route in <div id="main-content" role="main">, so pages
   * must NOT render their own <main>. A nested main is invalid (WCAG 1.3.1 /
   * ARIA: landmarks must not nest) and would make the skip link ambiguous.
   */
  test('exactly one main landmark is exposed, on the public landing route', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#main-content')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
  });

  test('navigation landmarks are present and uniquely labelled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navs = page.getByRole('navigation');
    const count = await navs.count();

    // At least one nav must exist on the landing surface.
    expect(count).toBeGreaterThan(0);

    // Every nav must carry a distinguishable accessible name, otherwise screen
    // readers announce several identical "navigation" entries.
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const label = await navs.nth(i).getAttribute('aria-label');
      expect(label, `navigation landmark #${i + 1} has no aria-label`).toBeTruthy();
      labels.push(label!);
    }
    expect(new Set(labels).size, `duplicate nav labels: ${labels.join(', ')}`).toBe(labels.length);
  });

  test('the auth surfaces expose a labelled navigation landmark', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('navigation', { name: 'Public surfaces' })).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
  });
});
