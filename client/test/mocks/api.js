import { vi } from 'vitest';
import { createMockUser, createMockTokens } from '../utils/mock-factories';

// Mock API responses
export const mockApiResponses = {
  login: {
    success: {
      user: createMockUser(),
      tokens: createMockTokens(),
    },
    error: {
      error: {
        message: 'Invalid credentials',
        type: 'AUTHENTICATION_ERROR',
        code: '401',
      },
    },
  },
  register: {
    success: {
      user: createMockUser(),
      tokens: createMockTokens(),
    },
    error: {
      error: {
        message: 'Email already exists',
        type: 'VALIDATION_ERROR',
        code: '400',
      },
    },
  },
  refreshToken: {
    success: {
      tokens: createMockTokens(),
    },
    error: {
      error: {
        message: 'Invalid refresh token',
        type: 'AUTHENTICATION_ERROR',
        code: '401',
      },
    },
  },
  profile: {
    success: {
      user: createMockUser(),
    },
    error: {
      error: {
        message: 'User not found',
        type: 'NOT_FOUND_ERROR',
        code: '404',
      },
    },
  },
};

// Helper to mock successful fetch responses
export const mockFetchSuccess = (data, status = 200) => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    status,
    json: async () => data,
    headers: new Headers({ 'content-type': 'application/json' }),
  } );
};

// Helper to mock failed fetch responses
export const mockFetchError = (error, status = 400) => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => error,
    headers: new Headers({ 'content-type': 'application/json' }),
  } );
};

// Helper to mock network errors
export const mockNetworkError = () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
};

// Mock API client for testing
export const createMockApiClient = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  upload: vi.fn(),
  initialize: vi.fn(),
});

// Helper to setup common API mocks
export const setupAuthApiMocks = () => {
  // Mock successful login
  const mockLogin = vi.fn().mockResolvedValue(mockApiResponses.login.success);
  
  // Mock successful registration
  const mockRegister = vi.fn().mockResolvedValue(mockApiResponses.register.success);
  
  // Mock successful token refresh
  const mockRefreshToken = vi.fn().mockResolvedValue(mockApiResponses.refreshToken.success);
  
  // Mock successful profile update
  const mockUpdateProfile = vi.fn().mockResolvedValue(mockApiResponses.profile.success);
  
  return {
    mockLogin,
    mockRegister,
    mockRefreshToken,
    mockUpdateProfile,
  };
};