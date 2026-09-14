 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


















class ApiClient {
  
  
   __init() {this.getIdToken = null}
   __init2() {this.errorReporter = null}
  
   __init3() {this.csrfToken = null}

  constructor(config = {}) {;ApiClient.prototype.__init.call(this);ApiClient.prototype.__init2.call(this);ApiClient.prototype.__init3.call(this);
    this.baseURL = config.baseURL || '/api';
    this.timeout = config.timeout || 30000;
    this.initCSRFToken();
  }

   initCSRFToken() {
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

  initialize(getIdToken, errorReporter) {
    this.getIdToken = getIdToken;
    this.errorReporter = errorReporter || null;
    // Back-compat: ErrorReporter doubles as the legacy onError hook.
    this.onError = errorReporter ? (e) => errorReporter(e) : undefined;
  }

  /** Legacy hook alias — prefer initialize(..., errorReporter). */
  get onErrorReporter() {
    return this.errorReporter;
  }

  async request(endpoint, config = {}) {
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
      let requestHeaders = {
        'Content-Type': 'application/json',
        ...headers ,
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

      const contentType = _optionalChain([response, 'access', _ => _.headers, 'optionalAccess', _2 => _2.get]) ? response.headers.get('content-type') : null;
      if (!contentType || response.status === 204) {
        return {} ;
      }

      if (contentType.includes('application/json')) {
        return await response.json();
      }

      return (await response.text()) ;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

   async handleErrorResponse(response) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode;
    let errorDetails;

    try {
      const contentType = _optionalChain([response, 'access', _3 => _3.headers, 'optionalAccess', _4 => _4.get]) ? response.headers.get('content-type') : null;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.message ||
                       (errorData.error && typeof errorData.error === 'object' ? errorData.error.message : errorData.error) ||
                       errorMessage;
        errorCode = errorData.code || (errorData.error && typeof errorData.error === 'object' ? errorData.error.code : undefined);
        errorDetails = errorData.details;
      }
    } catch (e2) {
      // If we can't parse the error response, use the default message
    }

    const apiError = new Error(errorMessage) ;
    apiError.status = response.status;
    apiError.code = errorCode;
    apiError.details = errorDetails;

    if (this.errorReporter) {
      try {
        this.errorReporter(apiError);
      } catch (e3) {
        // Ignore error reporter failures
      }
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        apiError.details = { ...(_nullishCoalesce(errorDetails, () => ( {}))), retryAfter };
      }
    }

    throw apiError;
  }

  async get(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'GET' });
  }

  async post(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(endpoint, data, config = {}) {
    return this.request(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint, config = {}) {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }

  async upload(
    endpoint,
    file,
    fieldName = 'file',
    config = {}
  ) {
    const formData = new FormData();
    formData.append(fieldName, file);

    return this.request(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {},
    });
  }
}

export const apiClient = new ApiClient();
;

export const isApiError = (error) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error ).status === 'number'
  );
};

export const handleApiError = (error) => {
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