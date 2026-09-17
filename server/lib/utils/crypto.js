import crypto from 'crypto';

/**
 * Generate a secure random token for invitations, password resets, etc.
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string for API keys, secrets, etc.
 */
export function generateSecureString(length = 32) {
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
export function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Hash a password using bcrypt-like approach with crypto
 */
export function hashPassword(password, salt) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password, hash, salt) {
  if (!hash || !salt) return false;
  const { hash: computedHash } = hashPassword(password, salt);
  const provided = Buffer.from(hash, 'hex');
  const expected = Buffer.from(computedHash, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

/**
 * Create HMAC signature
 */
/**
 * Supported HMAC digest algorithms.
 */
export const HMAC_ALGORITHMS = ['sha256', 'sha512'];

/**
 * Create HMAC signature
 */
export function createHmacSignature(data, secret, algorithm = 'sha256') {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmacSignature(data, signature, secret, algorithm = 'sha256') {
  if (!signature || !secret) return false;
  const expectedSignature = createHmacSignature(data, secret, algorithm);
  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}