import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';

// Configure Temp Fallback on Windows to prevent EPERM issues
if (process.platform === 'win32') {
  const localTemp = path.resolve(__dirname, '.temp');
  if (!fs.existsSync(localTemp)) {
    fs.mkdirSync(localTemp, { recursive: true });
  }
  process.env.TEMP = localTemp;
  process.env.TMP = localTemp;
}

import { glslPlugin } from './vite.config';

export default defineConfig({
  plugins: [react(), glslPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      './client/test/setup.ts',
      './client/test/canvas-polyfill.ts',
      './server/test/prisma-mock.ts'
    ],
    include: [
      'client/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        'test/**'
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
      "@test": path.resolve(__dirname, "./test"),
      "@react-three/cannon": path.resolve(__dirname, "./node_modules/@react-three/cannon/dist/index.js"),
    }
  }
});