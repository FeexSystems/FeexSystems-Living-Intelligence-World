/**
 * Cookie-based token manager — replaces localStorage token storage.
 *
 * Architecture:
 * - Refresh token: httpOnly cookie (set by server, inaccessible to JS)
 * - Access token: in-memory variable (lost on page refresh, re-fetched via refresh)
 * - No tokens in localStorage or sessionStorage (XSS-safe)
 */






// In-memory access token (lost on page refresh — re-fetched via refresh token cookie)
let cachedAccessToken = null;
let cachedExpiresAt = 0; // timestamp in ms
let refreshPromise = null;

const ACCESS_TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

/**
 * Store access token in memory only (not in localStorage)
 */
export function setAccessToken(token, expiresIn) {
  cachedAccessToken = token;
  cachedExpiresAt = Date.now() + expiresIn * 1000;
}

/**
 * Get the cached access token if it's still valid
 */
export function getAccessToken() {
  if (!cachedAccessToken) return null;
  if (Date.now() >= cachedExpiresAt - ACCESS_TOKEN_BUFFER_MS) return null;
  return cachedAccessToken;
}

/**
 * Clear the cached access token (on logout)
 */
export function clearAccessToken() {
  cachedAccessToken = null;
  cachedExpiresAt = 0;
  refreshPromise = null;
}

/**
 * Refresh the access token using the httpOnly refresh token cookie.
 * The refresh token is sent automatically by the browser (httpOnly cookie).
 */
export async function refreshAccessToken() {
  // Deduplicate concurrent refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send httpOnly cookies
    });

    if (!response.ok) {
      clearAccessToken();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const tokens = {
      accessToken: data.tokens.accessToken,
      expiresIn: data.tokens.expiresIn,
    };

    setAccessToken(tokens.accessToken, tokens.expiresIn);
    return tokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 * This is the main entry point for the API client.
 */
export async function getValidAccessToken() {
  // Return cached token if still valid
  const cached = getAccessToken();
  if (cached) return cached;

  // Try to refresh
  try {
    const tokens = await refreshAccessToken();
    return tokens.accessToken;
  } catch (e) {
    return null;
  }
}

/**
 * Call this on app startup to check if a valid session exists.
 * Attempts to refresh the access token using the httpOnly refresh cookie.
 */
export async function initializeSession() {
  try {
    const tokens = await refreshAccessToken();
    return !!tokens.accessToken;
  } catch (e2) {
    return false;
  }
}