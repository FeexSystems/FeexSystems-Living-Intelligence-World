import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from '@/lib/api-client';
import { mockFetchSuccess, mockFetchError, createMockTokens } from '../utils/test-utils';

describe('ApiClient', () => {
  let apiClient;
  let mockGetTokens;
  let mockRefreshToken;
  let mockLogout;

  beforeEach(() => {
    vi.clearAllMocks();
    
    apiClient = new ApiClient('/api');
    mockGetTokens = vi.fn();
    mockRefreshToken = vi.fn();
    mockLogout = vi.fn();
    
    apiClient.initialize(mockGetTokens, mockRefreshToken, mockLogout);
  });

  describe('Initialization', () => {
    it('should initialize with default base URL', () => {
      const client = new ApiClient();
      expect(client).toBeDefined();
    });

    it('should initialize with custom base URL', () => {
      const client = new ApiClient('/custom-api');
      expect(client).toBeDefined();
    });

    it('should initialize with auth functions', () => {
      const client = new ApiClient();
      const getTokens = vi.fn();
      const refreshToken = vi.fn();
      const logout = vi.fn();
      
      expect(() => {
        client.initialize(getTokens, refreshToken, logout);
      }).not.toThrow();
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      const mockData = { data: 'test' };
      mockFetchSuccess(mockData);

      const result = await apiClient.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });

    it('should make POST request with data', async () => {
      const mockData = { success: true };
      const postData = { name: 'test' };
      mockFetchSuccess(mockData);

      const result = await apiClient.post('/test', postData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      expect(result).toEqual(mockData);
    });

    it('should make PUT request with data', async () => {
      const mockData = { updated: true };
      const putData = { name: 'updated' };
      mockFetchSuccess(mockData);

      const result = await apiClient.put('/test', putData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(putData),
      });
      expect(result).toEqual(mockData);
    });

    it('should make PATCH request with data', async () => {
      const mockData = { patched: true };
      const patchData = { field: 'value' };
      mockFetchSuccess(mockData);

      const result = await apiClient.patch('/test', patchData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchData),
      });
      expect(result).toEqual(mockData);
    });

    it('should make DELETE request', async () => {
      const mockData = { deleted: true };
      mockFetchSuccess(mockData);

      const result = await apiClient.delete('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('Authentication Headers', () => {
    it('should include auth token in requests', async () => {
      const tokens = createMockTokens();
      mockGetTokens.mockReturnValue(tokens);
      mockFetchSuccess({ data: 'test' });

      await apiClient.get('/protected');

      expect(fetch).toHaveBeenCalledWith('/api/protected', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });
    });

    it('should make request without auth token when not available', async () => {
      mockGetTokens.mockReturnValue(null);
      mockFetchSuccess({ data: 'test' });

      await apiClient.get('/public');

      expect(fetch).toHaveBeenCalledWith('/api/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token and retry on 401 response', async () => {
      const tokens = createMockTokens();
      const newTokens = createMockTokens({ accessToken: 'new-access-token' });
      
      mockGetTokens
        .mockReturnValueOnce(tokens)
        .mockReturnValueOnce(newTokens);
      
      // First call returns 401, second call succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: { message: 'Unauthorized' } }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: 'success' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } );

      mockRefreshToken.mockResolvedValueOnce(undefined);

      const result = await apiClient.get('/protected');

      expect(mockRefreshToken).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'success' });
    });

    it('should logout on refresh token failure', async () => {
      const tokens = createMockTokens();
      mockGetTokens.mockReturnValue(tokens);
      
      // Mock 401 response
      mockFetchError({ error: { message: 'Unauthorized' } }, 401);
      
      // Mock refresh token failure
      mockRefreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(apiClient.get('/protected')).rejects.toThrow('Session expired. Please login again.');
      
      expect(mockRefreshToken).toHaveBeenCalledOnce();
      expect(mockLogout).toHaveBeenCalledOnce();
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors with JSON response', async () => {
      const errorResponse = {
        error: {
          message: 'Bad Request',
          type: 'VALIDATION_ERROR',
          code: '400',
        },
      };
      mockFetchError(errorResponse, 400);

      await expect(apiClient.get('/test')).rejects.toThrow('Bad Request');
    });

    it('should handle HTTP errors without JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Not JSON'); },
        headers: new Headers({ 'content-type': 'text/plain' }),
      } );

      await expect(apiClient.get('/test')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('should handle unknown errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce('Unknown error');

      await expect(apiClient.get('/test')).rejects.toThrow('Network error occurred');
    });
  });

  describe('File Upload', () => {
    it('should upload files with FormData', async () => {
      const tokens = createMockTokens();
      mockGetTokens.mockReturnValue(tokens);
      
      const mockResponse = { url: 'https://example.com/file.jpg' };
      mockFetchSuccess(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const result = await apiClient.upload('/upload', formData);

      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
        body: formData,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should upload files without auth token', async () => {
      mockGetTokens.mockReturnValue(null);
      
      const mockResponse = { url: 'https://example.com/file.jpg' };
      mockFetchSuccess(mockResponse);

      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const result = await apiClient.upload('/upload', formData);

      expect(fetch).toHaveBeenCalledWith('/api/upload', {
        method: 'POST',
        headers: {},
        body: formData,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Response Handling', () => {
    it('should handle JSON responses', async () => {
      const jsonData = { message: 'success' };
      mockFetchSuccess(jsonData);

      const result = await apiClient.get('/test');
      expect(result).toEqual(jsonData);
    });

    it('should handle non-JSON responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain' }),
      } );

      const result = await apiClient.get('/test');
      expect(result).toBeDefined();
    });
  });
});