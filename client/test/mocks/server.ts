import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create MSW server instance for intercepting HTTP requests during tests
export const server = setupServer(...handlers);

// Lifecycle hooks for test environment
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());