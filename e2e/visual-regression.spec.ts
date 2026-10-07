import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Visual regression baselines (Sprint 1, Task 3 of FRONTEND_MODERNIZATION_PLAN.md).
 *
 * Run with: npm run test:visual   (Playwright --grep @visual)
 * Update baselines with: npm run test:visual -- --update-snapshots
 *
 * Guards:
 *  - Chromium only (baselines are tracked for one engine to keep the suite fast).
 *  - Skipped in CI until baselines have been committed (Playwright refuses to
 *    auto-create baselines when CI=1, which would fail the e2e job).
 *
 * Tests deliberately avoid authenticated (dashboard/admin) routes so they can
 * run without credentials.
 */

const SNAPSHOT_DIR = 'e2e/visual-regression.spec.ts-snapshots';
const BASELINES = ['landing-hero-chromium.png', 'projects-chromium.png', 'navigator-chromium.png', 'not-found-chromium.png'];

// Resolved from cwd (Playwright runs from the config directory), avoiding
// __dirname/import.meta which vary between Playwright's CJS/ESM modes.
const hasBaselines = BASELINES.every((f) => existsSync(join(process.cwd(), SNAPSHOT_DIR, f)));
const runningInCi = !!process.env.CI;

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Visual baselines are tracked for Chromium only');
  test.skip(runningInCi && !hasBaselines, 'No visual baselines committed yet — generate locally with npm run test:visual');
});

test.describe('@visual public pages', () => {
  test('landing page baseline', async ({ page }) => {
    await page.goto('/');
    // Let the cinematic scene settle before capturing
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(1500);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('landing-hero.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('projects page baseline', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('projects.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('navigator page baseline', async ({ page }) => {
    await page.goto('/navigator');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('navigator.png', {
      maxDiffPixelRatio: 0.03,
    });
  });

  test('404 page baseline', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    expect(await page.screenshot({ fullPage: false })).toMatchSnapshot('not-found.png', {
      maxDiffPixelRatio: 0.03,
    });
  });
});
