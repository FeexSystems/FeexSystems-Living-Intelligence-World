/**
 * Root Playwright config.
 *
 * Playwright resolves the relative `testDir` and default reporter output against
 * the config file's directory — not the process cwd, and not rootDir. The
 * authoritative config lives in `e2e/playwright.config.ts` (testDir: './e2e'
 * relative to the repo root, where specs actually are). Importing it from a
 * root-level file keeps discovery correct, while pointing `--config` straight at
 * `e2e/playwright.config.ts` silently resolves to `e2e/e2e` and finds 0 tests.
 */
import { defineConfig } from '@playwright/test';
import shared from './e2e/playwright.config.ts';

export default defineConfig(shared);
