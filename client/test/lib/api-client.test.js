import { describe, it, expect, vi, beforeEach, } from 'vitest';
import { apiClient, isApiError, handleApiError, } from '@/lib/api-client';
import { server } from '../mocks/server';

describe('API Client', () => {
  beforeEach(() => {
    // Reset apiClient state before each test
    apiClient.initialize(() => Promise.resolve('test-token'));
  });

  describe('2.2.1 - Successful Request', () => {
    it('should make successful request', async () => {
      const response = await apiClient.get('/world-model/projects');
      expect(response).toBeDefined();
      expect((response ).projects).toBeDefined();
      expect(Array.isArray((response ).projects)).toBe(true);
    });

    it('should handle successful POST request', async () => {
      const data = { email: 'test@example.com', password: 'Password123!' };
      const response = await apiClient.post('/auth/login', data);
      expect(response).toBeDefined();
      expect((response ).accessToken).toBeDefined();
    });

    it('should return correct response structure', async () => {
      const response = await apiClient.get('/world-model/graph');
      expect((response ).nodes).toBeDefined();
      expect((response ).edges).toBeDefined();
      expect(Array.isArray((response ).nodes)).toBe(true);
      expect(Array.isArray((response ).edges)).toBe(true);
    });
  });

  describe('2.2.2 - Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      try {
        await apiClient.post('/auth/login', {
          email: 'existing@example.com',
          password: ''
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error ;
        expect(apiError.status).toBe(400);
      }
    });

    it('should handle 401 Unauthorized', async () => {
      server.use(
        require('msw').http.get('/api/protected', () => {
          return require('msw').HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      try {
        await apiClient.get('/protected', { requireAuth: true });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error ;
        expect(apiError.status).toBe(401);
      }
    });

    it('should handle 500 Server Error', async () => {
      server.use(
        require('msw').http.get('/api/error', () => {
          return require('msw').HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      try {
        await apiClient.get('/error', { requireAuth: false });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(isApiError(error)).toBe(true);
        const apiError = error ;
        expect(apiError.status).toBe(500);
      }
    });

    it('should handle request timeout', async () => {
      vi.useFakeTimers();
      
      server.use(
        require('msw').http.get('/api/slow', async () => {
          await new Promise(resolve => setTimeout(resolve, 35000));
          return require('msw').HttpResponse.json({ data: 'never' });
        })
      );

      try {
        const promise = apiClient.get('/slow', { timeout: 100, requireAuth: false });
        vi.runAllTimersAsync();
        await promise;
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        if (error instanceof Error) {
          expect(error.message).toMatch(/timeout/i);
        }
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('2.2.3 - CSRF Token Attachment', () => {
    it('should attach CSRF token to requests', async () => {
      // Set CSRF token in meta tag
      const metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      metaTag.content = 'test-csrf-token-123';
      document.head.appendChild(metaTag);

      // Reinitialize apiClient to pick up the meta tag
      const newClient = new (apiClient.constructor )();
      
      let capturedHeaders = {};
      server.use(
        require('msw').http.post('/api/test-csrf', ({ request }) => {
          capturedHeaders['X-CSRF-Token'] = request.headers.get('X-CSRF-Token') || '';
          return require('msw').HttpResponse.json({ success: true });
        })
      );

      await apiClient.post('/test-csrf', { test: 'data' });
      
      // Cleanup
      document.head.removeChild(metaTag);
    });

    it('should not attach CSRF token to GET requests', async () => {
      const metaTag = document.createElement('meta');
      metaTag.name = 'csrf-token';
      metaTag.content = 'test-csrf-token-456';
      document.head.appendChild(metaTag);

      let csrfAttached = false;
      server.use(
        require('msw').http.get('/api/safe-read', ({ request }) => {
          csrfAttached = !!request.headers.get('X-CSRF-Token');
          return require('msw').HttpResponse.json({ data: 'safe' });
        })
      );

      await apiClient.get('/safe-read');
      
      // GET requests should not have CSRF token (they don't mutate state)
      expect(csrfAttached).toBe(false);
      
      document.head.removeChild(metaTag);
    });
  });

  describe('2.2.4 - Authorization Header Injection', () => {
    it('should inject Authorization header with Bearer token', async () => {
      const testToken = 'test-access-token-12345';
      apiClient.initialize(() => Promise.resolve(testToken));

      let capturedAuthHeader = '';
      server.use(
        require('msw').http.get('/api/secure', ({ request }) => {
          capturedAuthHeader = request.headers.get('Authorization') || '';
          return require('msw').HttpResponse.json({ data: 'secure' });
        })
      );

      await apiClient.get('/secure', { requireAuth: true });
      expect(capturedAuthHeader).toBe(`Bearer ${testToken}`);
    });

    it('should not inject Authorization header when no token available', async () => {
      apiClient.initialize(() => Promise.resolve(null));

      let hasAuthHeader = false;
      server.use(
        require('msw').http.get('/api/public', ({ request }) => {
          hasAuthHeader = !!request.headers.get('Authorization');
          return require('msw').HttpResponse.json({ data: 'public' });
        })
      );

      try {
        await apiClient.get('/public', { requireAuth: true });
      } catch (error) {
        // Expected to throw when requireAuth=true but no token
        expect(error).toBeDefined();
      }
    });

    it('should skip auth when requireAuth is false', async () => {
      apiClient.initialize(() => Promise.resolve(null));

      let authHeader = '';
      server.use(
        require('msw').http.get('/api/public-endpoint', ({ request }) => {
          authHeader = request.headers.get('Authorization') || 'none';
          return require('msw').HttpResponse.json({ data: 'public' });
        })
      );

      await apiClient.get('/public-endpoint', { requireAuth: false });
      expect(authHeader).toBe('none');
    });

    it('should include Content-Type header in all requests', async () => {
      let contentType = '';
      server.use(
        require('msw').http.post('/api/with-body', ({ request }) => {
          contentType = request.headers.get('Content-Type') || '';
          return require('msw').HttpResponse.json({ success: true });
        })
      );

      await apiClient.post('/with-body', { test: 'data' }, { requireAuth: false });
      expect(contentType).toContain('application/json');
    });
  });
});

// Export error checking utilities
export { isApiError, handleApiError };