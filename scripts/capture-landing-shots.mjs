import { chromium } from '@playwright/test';
import path from 'node:path';

const outDir = path.resolve('docs/brand-assets/screenshots');
const base = 'http://localhost:8080';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Generous fixed settle: hero.webm is ~3MB and only starts decoding once the
// hero section intersects; readiness polling proved flaky across runs.
await page.waitForTimeout(16000);
await page.screenshot({ path: path.join(outDir, 'landing-hero-scene.webp'), type: 'webp', quality: 88 });

await page.locator('[data-testid="scene-controller-item-systems"]').click();
await page.waitForTimeout(11000);
await page.screenshot({ path: path.join(outDir, 'landing-core-systems-scene.webp'), type: 'webp', quality: 88 });

await browser.close();
console.log('done');
