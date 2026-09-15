import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

// Canvas polyfill must be loaded BEFORE any Three.js imports
// This enables WebGL context mocking for component tests
import { setupCanvasPolyfill } from './canvas-polyfill';
setupCanvasPolyfill();

// ---------------------------------------------------------------------------
// MSW (Mock Service Worker) Setup
//
// MSW intercepts all HTTP requests during tests, allowing us to mock API
// responses without hitting real endpoints. The server instance is initialized
// in mocks/server.ts with the following lifecycle:
//
//   - beforeAll: server.listen({ onUnhandledRequest: 'error' })
//     Starts MSW and throws on unhandled requests (helps catch missing mocks)
//
//   - afterEach: server.resetHandlers()
//     Resets all handlers to their default state between tests, ensuring
//     test isolation and preventing state leakage
//
//   - afterAll: server.close()
//     Cleans up MSW resources after all tests complete
//
// Handlers are defined in mocks/handlers.ts and cover:
//   - Auth endpoints (login, register, token refresh)
//   - World model endpoints (projects, graph)
//   - Error scenarios (401, 403, 500, timeouts)
//
// This import ensures MSW lifecycle hooks run before any tests execute.
// ---------------------------------------------------------------------------
import './mocks/server';

// ---------------------------------------------------------------------------
// Test-safe environment defaults.
//
// server/lib/auth.ts throws at import time when JWT_SECRET / JWT_REFRESH_SECRET
// are missing or shorter than 16 chars. Without these, every server route test
// that imports `createServer` (admin, teams, security, marketing, ...) fails to
// load its suite. Only set them when absent so a real .env still takes effect.
// ---------------------------------------------------------------------------
const TEST_ENV_DEFAULTS = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-16',
  ENCRYPTION_KEY: 'test-encryption-key-at-least-16-chars',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
};

for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// Mock DOM environment setup
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock IntersectionObserver
class MockIntersectionObserver {constructor() { MockIntersectionObserver.prototype.__init.call(this);MockIntersectionObserver.prototype.__init2.call(this);MockIntersectionObserver.prototype.__init3.call(this);MockIntersectionObserver.prototype.__init4.call(this);MockIntersectionObserver.prototype.__init5.call(this);MockIntersectionObserver.prototype.__init6.call(this);MockIntersectionObserver.prototype.__init7.call(this); }
   __init() {this.root = null}
   __init2() {this.rootMargin = ''}
   __init3() {this.thresholds = []}
  __init4() {this.observe = vi.fn()}
  __init5() {this.unobserve = vi.fn()}
  __init6() {this.disconnect = vi.fn()}
  __init7() {this.takeRecords = vi.fn(() => [])}
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {constructor() { MockResizeObserver.prototype.__init8.call(this);MockResizeObserver.prototype.__init9.call(this);MockResizeObserver.prototype.__init10.call(this); }
  __init8() {this.observe = vi.fn()}
  __init9() {this.unobserve = vi.fn()}
  __init10() {this.disconnect = vi.fn()}
}
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });
}
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

// Mock fetch globally
global.fetch = vi.fn();

// Mock React Router
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  };
});

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

// Global test setup
beforeAll(() => {
  // Setup any global test configuration
});

afterAll(() => {
  // Cleanup after all tests
});