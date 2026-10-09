import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

// Configure Temp Fallback on Windows to prevent EPERM issues
if (process.platform === 'win32') {
  const localTemp = path.resolve(__dirname, '.temp');
  if (!fs.existsSync(localTemp)) {
    fs.mkdirSync(localTemp, {
      recursive: true
    });
  }
  process.env.TEMP = localTemp;
  process.env.TMP = localTemp;
}
import { glslPlugin } from './vite.config';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon

export default defineConfig({
  plugins: [react(), glslPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
      "@test": path.resolve(__dirname, "./test"),
      "@react-three/cannon": path.resolve(__dirname, "./node_modules/@react-three/cannon/dist/index.js")
    }
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', 'coverage/**', '**/*.d.ts', 'test/**']
    },
    projects: [{
      extends: true,
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./client/test/setup.ts', './client/test/canvas-polyfill.ts', './server/test/prisma-mock.ts'],
        include: ['client/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.git', '.cache',
        // Guard against compiled test artifacts. A stale build previously emitted
        // `.test.js` copies alongside the `.test.ts` sources; Vitest collected
        // BOTH, so every suite ran (and failed) twice. Test sources are TypeScript
        // only — see the cleanup in the 2026-10-03 audit.
        '**/*.test.js', '**/*.spec.js']
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});