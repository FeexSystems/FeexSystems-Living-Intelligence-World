 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }



























class AuthService {constructor() { AuthService.prototype.__init.call(this); }
   __init() {this.baseUrl = '/api/auth'}

   async makeRequest(
    endpoint, 
    options = {}
  ) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(_optionalChain([data, 'access', _ => _.error, 'optionalAccess', _2 => _2.message]) || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`Auth service error (${endpoint}):`, error);
      throw error;
    }
  }

  async login(credentials) {
    const response = await this.makeRequest('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    return response.data || response;
  }

  async register(userData) {
    const response = await this.makeRequest('/register', {
      method: 'POST',
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
      }),
    });

    return response.data || response;
  }

  async logout() {
    try {
      await this.makeRequest('/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Logout should always succeed locally even if server request fails
      console.warn('Logout request failed:', error);
    }
  }

  async refreshToken(refreshToken) {
    const response = await this.makeRequest('/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    return response.data || response;
  }

  async requestPasswordReset(data) {
    return this.makeRequest('/password-reset-request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data) {
    return this.makeRequest('/password-reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(data) {
    return this.makeRequest('/verify-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resendVerificationEmail() {
    return this.makeRequest('/resend-verification', {
      method: 'POST',
    });
  }

  async changePassword(data, token) {
    return this.makeRequest('/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async updateProfile(data, token) {
    return this.makeRequest('/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getProfile(token) {
    return this.makeRequest('/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async uploadProfileImage(file, token) {
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await fetch(`${this.baseUrl}/profile/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(_optionalChain([data, 'access', _3 => _3.error, 'optionalAccess', _4 => _4.message]) || data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Profile image upload error:', error);
      throw error;
    }
  }

  async deleteAccount(password, token) {
    return this.makeRequest('/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });
  }

  // Utility methods
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password)


 {
    const errors = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getPasswordStrength(password)



 {
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&]/.test(password)) score += 1;

    // Additional complexity
    if (password.length >= 16) score += 1;
    if (/[^a-zA-Z\d@$!%*?&]/.test(password)) score += 1;

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a', '#15803d'];

    const index = Math.min(score, labels.length - 1);

    return {
      score,
      label: labels[index],
      color: colors[index],
    };
  }
}

export const authService = new AuthService();