 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }













class TokenManager {constructor() { TokenManager.prototype.__init.call(this);TokenManager.prototype.__init2.call(this);TokenManager.prototype.__init3.call(this);TokenManager.prototype.__init4.call(this);TokenManager.prototype.__init5.call(this);TokenManager.prototype.__init6.call(this);TokenManager.prototype.__init7.call(this);TokenManager.prototype.__init8.call(this); }
  
   __init() {this.refreshTimer = null}
   __init2() {this.warningTimer = null}
   __init3() {this.refreshPromise = null}
   __init4() {this.refreshCallback = null}
   __init5() {this.expiredCallback = null}
   __init6() {this.warningCallback = null}
   __init7() {this.isRefreshing = false}
  // Warning threshold in seconds (default: 2 minutes before expiration)
   __init8() {this.warningThresholdSeconds = 120}

  static getInstance() {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Initialize the token manager with callbacks
   */
  initialize(
    refreshCallback,
    expiredCallback,
    warningCallback,
    warningThresholdSeconds
  ) {
    this.refreshCallback = refreshCallback;
    this.expiredCallback = expiredCallback;
    this.warningCallback = warningCallback || null;
    if (warningThresholdSeconds) {
      this.warningThresholdSeconds = warningThresholdSeconds;
    }
  }

  /**
   * Start automatic token refresh based on token expiration
   */
  startAutoRefresh(tokens) {
    this.clearRefreshTimer();
    this.clearWarningTimer();

    if (!tokens.accessToken || !tokens.expiresIn) {
      return;
    }

    const expirationTime = tokens.expiresIn * 1000;
    const now = Date.now();

    // Schedule timeout warning (e.g., 2 minutes before expiration)
    const warningTime = expirationTime - (this.warningThresholdSeconds * 1000);
    const timeUntilWarning = Math.max(warningTime - now, 0);

    if (timeUntilWarning > 0 && this.warningCallback) {
      console.log(`⚠️ Session timeout warning scheduled in ${Math.round(timeUntilWarning / 1000 / 60)} minutes`);
      this.warningTimer = setTimeout(() => {
        if (this.warningCallback) {
          this.warningCallback(this.warningThresholdSeconds);
        }
      }, timeUntilWarning);
    }

    // Calculate when to refresh (5 minutes before expiration)
    const refreshTime = expirationTime - (5 * 60 * 1000);
    const timeUntilRefresh = Math.max(refreshTime - now, 0);

    console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, timeUntilRefresh);
  }

  /**
   * Stop automatic token refresh and clear warning timers
   */
  stopAutoRefresh() {
    this.clearRefreshTimer();
    this.clearWarningTimer();
    this.refreshPromise = null;
    this.isRefreshing = false;
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(tokens, bufferMinutes = 5) {
    if (!tokens.accessToken || !tokens.expiresIn) {
      return true;
    }

    const expirationTime = tokens.expiresIn * 1000;
    const bufferTime = bufferMinutes * 60 * 1000;
    const now = Date.now();

    return now >= (expirationTime - bufferTime);
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(currentTokens) {
    if (!_optionalChain([currentTokens, 'optionalAccess', _ => _.accessToken])) {
      return null;
    }

    // If token is not expired, return it
    if (!this.isTokenExpired(currentTokens)) {
      return currentTokens.accessToken;
    }

    // If token is expired, try to refresh
    try {
      const newTokens = await this.refreshTokens();
      return newTokens.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  /**
   * Refresh tokens with deduplication
   */
  async refreshTokens() {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshCallback) {
      throw new Error('Token refresh callback not initialized');
    }

    this.isRefreshing = true;

    this.refreshPromise = this.refreshCallback()
      .then((newTokens) => {
        console.log('✅ Token refresh successful');
        this.isRefreshing = false;
        this.refreshPromise = null;

        // Schedule next refresh
        this.startAutoRefresh(newTokens);

        return newTokens;
      })
      .catch((error) => {
        console.error('❌ Token refresh failed:', error);
        this.isRefreshing = false;
        this.refreshPromise = null;

        // Call expired callback to logout user
        if (this.expiredCallback) {
          this.expiredCallback();
        }

        throw error;
      });

    return this.refreshPromise;
  }

  /**
   * Handle API request with automatic token refresh retry
   */
  async makeAuthenticatedRequest(
    requestFn,
    currentTokens,
    maxRetries = 1
  ) {
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        const token = await this.getValidAccessToken(currentTokens);

        if (!token) {
          throw new Error('No valid access token available');
        }

        return await requestFn(token);
      } catch (error) {
        attempts++;

        // If it's a 401 error and we haven't exceeded max retries, try to refresh
        if (_optionalChain([error, 'optionalAccess', _2 => _2.status]) === 401) {
          if (attempts <= maxRetries) {
            console.log(`🔄 Received 401, attempting token refresh (attempt ${attempts}/${maxRetries + 1})`);

            try {
              const newTokens = await this.refreshTokens();
              currentTokens = newTokens;
              continue; // Retry with new token
            } catch (refreshError) {
              console.error('Token refresh failed during retry:', refreshError);
              throw refreshError;
            }
          }
          throw new Error('Max retry attempts exceeded');
        }

        // If not a 401 or exceeded retries, throw the error
        throw error;
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Get time until token expiration in minutes
   */
  getTimeUntilExpiration(tokens) {
    if (!tokens.expiresIn) {
      return null;
    }

    const expirationTime = tokens.expiresIn * 1000;
    const now = Date.now();
    const timeLeft = expirationTime - now;

    return Math.max(0, Math.round(timeLeft / 1000 / 60));
  }

  /**
   * Check if refresh is currently in progress
   */
  get isCurrentlyRefreshing() {
    return this.isRefreshing;
  }

   clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

   clearWarningTimer() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Utility functions
export const isTokenExpired = (tokens, bufferMinutes = 5) => {
  if (!tokens) return true;
  return tokenManager.isTokenExpired(tokens, bufferMinutes);
};

export const getValidAccessToken = async (tokens) => {
  return tokenManager.getValidAccessToken(tokens);
};

export const makeAuthenticatedRequest = async ( 
  requestFn,
  tokens,
  maxRetries = 1
) => {
  return tokenManager.makeAuthenticatedRequest(requestFn, tokens, maxRetries);
};