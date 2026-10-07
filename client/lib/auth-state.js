 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }








/**
 * Logger helper for auth state
 */
function logAuthState(message, data) {
  console.log(`[AuthState] ${message}`, data);
}

/**
 * Validate current auth state by checking session with backend
 * Returns true if session is valid, false otherwise
 */
export async function validateAuthState() {
  try {
    const token = localStorage.getItem('feex_access_token');
    if (!token) {
      return false;
    }

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Get current auth user from local storage or backend
 * Returns null if no valid session exists
 */
export async function getAuthUser() {
  try {
    const token = localStorage.getItem('feex_access_token');
    if (!token) {
      return null;
    }

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || _optionalChain([data, 'access', _ => _.data, 'optionalAccess', _2 => _2.user]) || null;
  } catch (e2) {
    return null;
  }
}

/**
 * Check if current session is valid
 */
export async function isSessionValid() {
  return await validateAuthState();
}

/**
 * Refresh auth state from backend
 */
export async function refreshAuthState() {
  return await getAuthUser();
}
