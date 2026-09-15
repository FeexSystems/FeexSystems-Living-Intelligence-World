import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { createMockFirebaseToken, mockFirebaseAuth } from './firebase';

describe('Firebase Mock', () => {
  describe('createMockFirebaseToken', () => {
    it('should create a valid JWT token', () => {
      const token = createMockFirebaseToken('user-123', 'test@example.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all required Firebase fields in token payload', () => {
      const token = createMockFirebaseToken('user-456', 'user@test.local');
      const secret = process.env.JWT_SECRET || 'test-secret-key';
      const decoded = jwt.verify(token, secret) ;

      expect(decoded.iss).toBe('https://securetoken.google.com/test-project');
      expect(decoded.aud).toBe('test-project');
      expect(decoded.user_id).toBe('user-456');
      expect(decoded.sub).toBe('user-456');
      expect(decoded.email).toBe('user@test.local');
      expect(decoded.email_verified).toBe(true);
      expect(decoded.auth_time).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should set exp to 1 hour from iat', () => {
      const before = Math.floor(Date.now() / 1000);
      const token = createMockFirebaseToken('user-789', 'test@feex.local');
      const after = Math.floor(Date.now() / 1000);
      const secret = process.env.JWT_SECRET || 'test-secret-key';
      const decoded = jwt.verify(token, secret) ;

      const iat = decoded.iat ;
      const exp = decoded.exp ;
      const expDiff = exp - iat;

      expect(expDiff).toBe(3600); // 1 hour = 3600 seconds
    });

    it('should include custom claims when provided', () => {
      const customClaims = {
        role: 'admin',
        org_id: 'org-001',
        permissions: ['read', 'write'],
      };
      const token = createMockFirebaseToken(
        'admin-user',
        'admin@test.local',
        customClaims
      );
      const secret = process.env.JWT_SECRET || 'test-secret-key';
      const decoded = jwt.verify(token, secret) ;

      expect(decoded.role).toBe('admin');
      expect(decoded.org_id).toBe('org-001');
      expect(decoded.permissions).toEqual(['read', 'write']);
    });

    it('should be decodable and verifiable with JWT secret', () => {
      const token = createMockFirebaseToken(
        'user-decode-test',
        'decode@test.local'
      );
      const secret = process.env.JWT_SECRET || 'test-secret-key';

      expect(() => jwt.verify(token, secret)).not.toThrow();
    });

    it('should fail verification with wrong secret', () => {
      const token = createMockFirebaseToken(
        'user-verify-test',
        'verify@test.local'
      );
      const wrongSecret = 'wrong-secret-key';

      expect(() => jwt.verify(token, wrongSecret)).toThrow();
    });
  });

  describe('mockFirebaseAuth', () => {
    it('should have currentUser with uid and email', () => {
      expect(mockFirebaseAuth.currentUser.uid).toBe('test-user-123');
      expect(mockFirebaseAuth.currentUser.email).toBe('test@example.com');
    });

    it('should have getIdToken method that returns a token', async () => {
      const token = await mockFirebaseAuth.currentUser.getIdToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should have signInWithEmailAndPassword method', async () => {
      const result = await mockFirebaseAuth.signInWithEmailAndPassword(
        'user@test.local',
        'password123'
      );
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('user@test.local');
      expect(result.user.uid).toBeDefined();
    });

    it('should have signOut method', async () => {
      const result = await mockFirebaseAuth.signOut();
      expect(result).toBeUndefined();
    });

    it('should have onAuthStateChanged method', () => {
      const callback = vi.fn();
      const unsubscribe = mockFirebaseAuth.onAuthStateChanged(callback);

      expect(callback).toHaveBeenCalledWith(mockFirebaseAuth.currentUser);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should have all methods as vi.fn() mocks', () => {
      expect(vi.isMockFunction(mockFirebaseAuth.currentUser.getIdToken)).toBe(
        true
      );
      expect(
        vi.isMockFunction(mockFirebaseAuth.signInWithEmailAndPassword)
      ).toBe(true);
      expect(vi.isMockFunction(mockFirebaseAuth.signOut)).toBe(true);
      expect(vi.isMockFunction(mockFirebaseAuth.onAuthStateChanged)).toBe(true);
    });
  });
});
