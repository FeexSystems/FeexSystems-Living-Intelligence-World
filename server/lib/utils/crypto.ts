import crypto from 'crypto';

/**
 * Generate a secure random token for invitations, password resets, etc.
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string for API keys, secrets, etc.
 */
export function generateSecureString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  // crypto.randomInt uses rejection sampling, avoiding modulo bias.
  for (let i = 0; i < length; i++) {
    result += chars[crypto.randomInt(chars.length)];
  }

  return result;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a password using bcrypt-like approach with crypto
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  const { hash: computedHash } = hashPassword(password, salt);
  const provided = Buffer.from(hash, 'hex');
  const expected = Buffer.from(computedHash, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Supported HMAC digest algorithms.
 */
export type HmacAlgorithm = 'sha256' | 'sha512';

/**
 * Create HMAC signature
 */
export function createHmacSignature(data: string, secret: string, algorithm: HmacAlgorithm = 'sha256'): string {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(data: string, signature: string, secret: string, algorithm: HmacAlgorithm = 'sha256'): boolean {
  if (!signature || !secret) return false;
  const expectedSignature = createHmacSignature(data, secret, algorithm);
  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}