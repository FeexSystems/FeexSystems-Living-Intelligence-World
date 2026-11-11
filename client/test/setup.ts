/**
 * Test Setup File
 *
 * Global setup for Vitest including:
 * - @testing-library/jest-dom matchers
 * - Global mocks
 * - Environment configuration
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// This setup file is registered globally in vitest.config.ts, so it also runs
// for ``// @vitest-environment node`` suites (e.g. server route tests). Those
// suites have no DOM and referencing `window` at module scope aborted them with
// "ReferenceError: window is not defined" before a single test could collect.
// Guard every DOM-only polyfill behind an environment check.
const hasDom = typeof window !== 'undefined';

// Mock window.matchMedia
if (hasDom) Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── DOM-only polyfills ───────────────────────────────────────────────────────
// Everything below depends on a DOM. Wrapped in `if (hasDom)` so the file stays
// inert (and does not throw) under ``// @vitest-environment node`` suites.
if (hasDom) {
  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  // Mock ResizeObserver
  class MockResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });

  // Mock DOM methods not implemented in jsdom
  HTMLElement.prototype.hasPointerCapture = vi.fn();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();

  // Mock scrollTo
  window.scrollTo = vi.fn();

  // Mock localStorage with a real in-memory store. Bare vi.fn() stubs made
  // setItem/getItem inert, so persistence assertions (e.g. auth-storage tests)
  // could never read back what was written.
  const localStorageStore = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => (localStorageStore.has(key) ? localStorageStore.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      localStorageStore.delete(key);
    }),
    clear: vi.fn(() => {
      localStorageStore.clear();
    }),
    key: vi.fn((index: number) => Array.from(localStorageStore.keys())[index] ?? null),
    get length() {
      return localStorageStore.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
}

// Mock HTMLCanvasElement.getContext for axe-core (Task 17: Phase 2, Sprint 5)
if (hasDom) {
// The stub is CONTEXT-TYPE-AWARE: it only answers '2d' requests with the
// 2D drawing stub. Every other context id (webgl, webgl2, experimental-webgl,
// bitmaprenderer) returns null, mirroring a headless browser with no GPU.
//
// Returning the 2D stub for webgl requests (the old behaviour) made
// `probeWebGL()` in landing/effects/capabilities.ts report WebGL as
// available, so gated effects (dotted-trail, milky-way, …) mounted in jsdom
// and crashed on `gl.createShader`, failing whole page-level suites.
const twoDStub: Record<string, unknown> = {
  createLinearGradient: vi.fn(),
  createRadialGradient: vi.fn(),
  fillText: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  clip: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  drawImage: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  canvas: {
    width: 0,
    height: 0,
  },
};

  const mockGetContext = vi.fn(
    (contextId: string) => (contextId === '2d' ? twoDStub : null)
  );

  HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// Suppress console errors during tests (optional)
// Uncomment if you want cleaner test output
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
