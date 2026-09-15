import { useFirebaseAuth } from './firebase-auth';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  requireAuth?: boolean;
  skipCSRF?: boolean;
}

interface ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

class ApiClient {
  private baseURL: string;
  private timeout: number;
  private getIdToken: (() => Promise<string | null>) | null = null;
  private errorReporter: ((error: ApiError) => void) | null = null;
  private csrfToken: string | null = null;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || '/api';
    this.timeout = config.timeout || 30000;
    this.initCSRFToken();
  }

  private initCSRFToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      this.csrfToken = metaTag.getAttribute('content');
    }
    if (!this.csrfToken) {
      const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (match) {
        this.csrfToken = decodeURIComponent(match[1]);
      }
    }
  }

  initialize(getIdToken: () => Promise<string | null>, errorReporter?: (error: ApiError) => void) {
    this.getIdToken = getIdToken;
    this.errorReporter = errorReporter || null;
  }

  /** Backward compatibility: Legacy onError property via getter/setter */
  get onError(): ((error: ApiError) => void) | null {
    return this.errorReporter;
  }

  set onError(callback: ((error: ApiError) => void) | null | undefined) {
    this.errorReporter = callback ?? null;
  }

  /** Legacy hook alias — prefer initialize(..., errorReporter). */
  get onErrorReporter(): ((error: ApiError) => void) | null {
    return this.errorReporter;
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const {
      timeout = this.timeout,
      requireAuth = true,
      headers = {},
      ...requestConfig
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers as Record<string, string>,
      };

      const isStateMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestConfig.method || 'GET');
      if (isStateMutating && this.csrfToken && !config.skipCSRF) {
        requestHeaders['X-CSRF-Token'] = this.csrfToken;
      }

      if (requireAuth && this.getIdToken) {
        const token = await this.getIdToken();
        if (token) {
          requestHeaders = {
            ...requestHeaders,
            Authorization: `Bearer ${token}`,
          };
        } else if (requireAuth) {
          throw new Error('No valid access token available');
        }
      }

      const response = await fetch(url, {
        ...requestConfig,
        headers: requestHeaders,
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers?.get ? response.headers.get('content-type') : null;
      if (!contentType || response.status === 204) {
        return {} as T;
      }

      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode: string | undefined;
    let errorDetails: Record<string, unknown> | undefined;

    try {
      const contentType = response.headers?.get ? response.headers.get('content-type') : null;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message ||
                       (errorData.error && typeof errorData.error === 'object' ? errorData.error.message : errorData.error) ||
                       errorMessage;
        errorCode = errorData.code || (errorData.error && typeof errorData.error === 'object' ? errorData.error.code : undefined);
        errorDetails = errorData.details;
      }
    } catch {
      // If we can't parse the error response, use the default message
    }

    const apiError = new Error(errorMessage) as ApiError;
    apiError.status = response.status;
    apiError.code = errorCode;
    apiError.details = errorDetails;

    if (this.errorReporter) {
      try {
        this.errorReporter(apiError);
      } catch {
        // Ignore error reporter failures
      }
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        apiError.details = { ...(errorDetails ?? {}), retryAfter };
      }
    }

    throw apiError;
  }

  async get<T>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, config: Omit<RequestConfig, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config: Omit<RequestConfig, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async upload<T>(
    endpoint: string,
    file: File,
    fieldName = 'file',
    config: Omit<RequestConfig, 'method' | 'body' | 'headers'> = {}
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {},
    });
  }
}

export const apiClient = new ApiClient();
export type { ApiError, RequestConfig };

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number'
  );
};

export const handleApiError = (error: unknown): string => {
  if (isApiError(error)) {
    switch (error.status) {
      case 400: return error.message || 'Bad request. Please check your input.';
      case 401: return 'Authentication required. Please log in again.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 409: return error.message || 'A conflict occurred.';
      case 422: return error.message || 'Validation failed.';
      case 429: return 'Too many requests. Please try again later.';
      case 500: return 'An internal server error occurred.';
      case 503: return 'Service temporarily unavailable.';
      default: return error.message || `An error occurred (${error.status}).`;
    }
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
};