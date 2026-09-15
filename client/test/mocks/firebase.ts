import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

/**
 * Create a mock Firebase ID token for testing.
 * Mimics Firebase token structure without actual Firebase Admin SDK.
 *
 * @param uid - User ID
 * @param email - User email address
 * @param customClaims - Optional additional claims to include in token
 * @returns Signed JWT token string
 *
 * Validates: Requirements 4.3 (Mock Firebase Auth)
 */
export function createMockFirebaseToken(
  uid: string,
  email: string,
  customClaims?: Record<string, unknown>
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: 'https://securetoken.google.com/test-project',
    aud: 'test-project',
    auth_time: now,
    user_id: uid,
    sub: uid,
    iat: now,
    exp: now + 3600,
    email,
    email_verified: true,
    ...(customClaims || {}),
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Mock Firebase auth context for component and integration testing.
 * All methods are Vitest mocks that can be configured per test.
 *
 * Validates: Requirements 4.3 (Mock Firebase Auth)
 */
export const mockFirebaseAuth = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
    getIdToken: vi.fn(async () =>
      createMockFirebaseToken('test-user-123', 'test@example.com')
    ),
  },
  signInWithEmailAndPassword: vi.fn(
    async (email: string, password: string) => ({
      user: {
        uid: 'test-user-123',
        email,
      },
    })
  ),
  signOut: vi.fn(async () => undefined),
  onAuthStateChanged: vi.fn((callback: (user: unknown) => void) => {
    callback(mockFirebaseAuth.currentUser);
    return () => {};
  }),
};
