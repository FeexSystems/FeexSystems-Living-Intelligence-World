import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server instance for intercepting HTTP requests during tests
export const server = setupServer(...handlers);

// Lifecycle hooks for test environment: allow local loopback requests (supertest) to bypass MSW
beforeAll(() =>
  server.listen({
    onUnhandledRequest(req, print) {
      try {
        const url = new URL(req.url);
        if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
          return;
        }
      } catch {
        // ignore url parsing issues
      }
      print.error();
    },
  })
);
afterEach(() => server.resetHandlers());
afterAll(() => server.close());