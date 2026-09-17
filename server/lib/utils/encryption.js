import crypto from 'crypto';
import {
  createHmacSignature,
  generateSecureToken,
  verifyHmacSignature,
} from './crypto.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

class EncryptionService {


  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      if (this.isProduction()) {
        throw new Error(
          'ENCRYPTION_KEY must be set in production; refusing to use a fallback key.'
        );
      }
      // Development-only fallback so local tooling keeps working.
      this.key = crypto.scryptSync('feexsystems-dev-only-key', 'salt', KEY_LENGTH);
      return;
    }

    // Derive a consistent key from the environment variable
    this.key = crypto.scryptSync(encryptionKey, 'salt', KEY_LENGTH);
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Encrypt a string value
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      cipher.setAAD(Buffer.from('devops-tokens'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine iv, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt a string value
   */
  decrypt(encryptedData) {
    try {
      const combined = Buffer.from(encryptedData, 'base64');

      if (combined.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error(
          `Invalid ciphertext: expected at least ${IV_LENGTH + TAG_LENGTH} bytes, received ${combined.length}.`
        );
      }

      // Extract iv, tag, and encrypted data
      const iv = combined.subarray(0, IV_LENGTH);
      const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAAD(Buffer.from('devops-tokens'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a secure random string for webhook secrets
   */
  generateSecret(length = 32) {
    return generateSecureToken(length);
  }

  /**
   * Create HMAC signature for webhook validation
   */
  createHmacSignature(payload, secret) {
    if (!secret) {
      throw new Error('Cannot create HMAC signature without a secret.');
    }
    return createHmacSignature(payload, secret);
  }

  /**
   * Verify HMAC signature for webhook validation
   */
  verifyHmacSignature(payload, signature, secret) {
    if (!secret || !signature) return false;
    return verifyHmacSignature(payload, signature, secret);
  }
}

export const encryptionService = new EncryptionService();