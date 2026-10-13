import crypto from 'crypto';
import {
  createHmacSignature,
  generateSecureToken,
  verifyHmacSignature,
} from './crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

class EncryptionService {
  private key: Buffer | null;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      // Deliberately deferred to first use (see resolveKey): importing this
      // module must NEVER throw. The Firebase Functions code analyzer loads
      // the server bundle with no runtime secrets provisioned, and a
      // top-level throw here kills `firebase deploy` with "codebase could
      // not be analyzed successfully".
      this.key = null;
      return;
    }

    // Derive a consistent key from the environment variable
    this.key = crypto.scryptSync(encryptionKey, 'salt', KEY_LENGTH);
  }

  private resolveKey(): Buffer {
    if (this.key) return this.key;
    if (this.isProduction()) {
      throw new Error(
        'ENCRYPTION_KEY must be set in production; refusing to use a fallback key.'
      );
    }
    // Development-only fallback so local tooling keeps working.
    this.key = crypto.scryptSync('feexsystems-dev-only-key', 'salt', KEY_LENGTH);
    return this.key;
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Encrypt a string value
   */
  encrypt(text: string): string {
    const key = this.resolveKey();
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
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
  decrypt(encryptedData: string): string {
    const key = this.resolveKey();
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

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
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
  generateSecret(length: number = 32): string {
    return generateSecureToken(length);
  }

  /**
   * Create HMAC signature for webhook validation
   */
  createHmacSignature(payload: string, secret: string): string {
    if (!secret) {
      throw new Error('Cannot create HMAC signature without a secret.');
    }
    return createHmacSignature(payload, secret);
  }

  /**
   * Verify HMAC signature for webhook validation
   */
  verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret || !signature) return false;
    return verifyHmacSignature(payload, signature, secret);
  }
}

export const encryptionService = new EncryptionService();