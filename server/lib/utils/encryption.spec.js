import { describe, it, expect } from 'vitest';
import { encryptionService } from './encryption';

describe('encryptionService encrypt/decrypt', () => {
  it('round-trips a value', () => {
    const plaintext = 'ghp_super-secret-devops-token';
    const ciphertext = encryptionService.encrypt(plaintext);

    expect(ciphertext).not.toBe(plaintext);
    expect(encryptionService.decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext for the same input (random IV)', () => {
    const plaintext = 'repeatable-input';
    const first = encryptionService.encrypt(plaintext);
    const second = encryptionService.encrypt(plaintext);

    expect(first).not.toBe(second);
    expect(encryptionService.decrypt(first)).toBe(plaintext);
    expect(encryptionService.decrypt(second)).toBe(plaintext);
  });

  it('round-trips empty strings', () => {
    expect(encryptionService.decrypt(encryptionService.encrypt(''))).toBe('');
  });

  it('fails to decrypt tampered ciphertext', () => {
    const ciphertext = encryptionService.encrypt('tamper-me');
    const raw = Buffer.from(ciphertext, 'base64');
    raw[raw.length - 1] = raw[raw.length - 1] ^ 0xff;

    expect(() => encryptionService.decrypt(raw.toString('base64'))).toThrow(/Decryption failed/);
  });

  it('throws a descriptive error for ciphertext shorter than iv + tag', () => {
    const tooShort = Buffer.alloc(8).toString('base64');
    expect(() => encryptionService.decrypt(tooShort)).toThrow(/Invalid ciphertext/);
  });

  it('rejects an iv+tag payload with no ciphertext body', () => {
    const boundary = Buffer.alloc(32).toString('base64');
    expect(() => encryptionService.decrypt(boundary)).toThrow(/Decryption failed/);
  });
});

describe('encryptionService HMAC helpers', () => {
  const secret = 'a-strong-webhook-secret';
  const payload = '{"event":"push"}';

  it('creates and verifies a signature', () => {
    const signature = encryptionService.createHmacSignature(payload, secret);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(encryptionService.verifyHmacSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a mismatched signature without throwing', () => {
    const signature = encryptionService.createHmacSignature('different-payload', secret);
    expect(encryptionService.verifyHmacSignature(payload, signature, secret)).toBe(false);
    expect(encryptionService.verifyHmacSignature(payload, 'not-hex', secret)).toBe(false);
    expect(encryptionService.verifyHmacSignature(payload, '', secret)).toBe(false);
    expect(encryptionService.verifyHmacSignature(payload, signature, '')).toBe(false);
  });

  it('throws rather than signing with an empty secret', () => {
    expect(() => encryptionService.createHmacSignature(payload, '')).toThrow(/secret/);
  });

  it('generates secrets of the requested length', () => {
    expect(encryptionService.generateSecret(16)).toHaveLength(32);
    expect(encryptionService.generateSecret()).toHaveLength(64);
  });
});
