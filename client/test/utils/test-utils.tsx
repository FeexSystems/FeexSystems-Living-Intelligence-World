/**
 * Test Utilities
 * 
 * Custom render function and testing utilities
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new query client for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

/**
 * Custom render function that includes providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { route?: string }
) {
  const { route = '/', ...renderOptions } = options;
  
  const queryClient = createTestQueryClient();
  
  window.history.pushState({}, '', route);
  
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    ),
    ...renderOptions,
  });
}

/**
 * Re-export everything from testing library
 */
export * from '@testing-library/react';
export { renderWithProviders as render };

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition not met within timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Mock a successful API response
 */
export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }, delay);
  });
}

/**
 * Mock an error API response
 */
export function mockApiError(message: string, status = 500, delay = 0) {
  return new Promise<Response>((resolve) => {
    setTimeout(() => {
      resolve(new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }));
    }, delay);
  });
}
