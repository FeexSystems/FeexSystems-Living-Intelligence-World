import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server for testing
export const server = setupServer(...handlers);

// Helper to reset handlers during tests
export const resetHandlers = () => {
  server.resetHandlers(...handlers);
};

// Helper to use error handlers
export const useErrorHandlers = () => {
  const { errorHandlers } = require('./handlers');
  server.use(...errorHandlers);
};