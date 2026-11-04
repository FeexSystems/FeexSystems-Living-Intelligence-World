import { describe, it, expect } from 'vitest';
import {
  createHmacSignature,
  generateSecureString,
  generateSecureToken,
  generateUUID,
  hashPassword,
  verifyHmacSignature,
  verifyPassword,
} from './crypto';

describe('hashPassword / verifyPassword', () => {
  it('generates a salt when one is not provided', () => {
    const { hash, salt } = hashPassword('correct horse battery staple');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it('is deterministic for a fixed salt', () => {
    const a = hashPassword('password123', 'fixed-salt');
    const b = hashPassword('password123', 'fixed-salt');
    expect(a.hash).toBe(b.hash);
  });

  it('verifies a correct password', () => {
    const { hash, salt } = hashPassword('password123');
    expect(verifyPassword('password123', hash, salt)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const { hash, salt } = hashPassword('password123');
    expect(verifyPassword('password124', hash, salt)).toBe(false);
  });

  it('returns false instead of throwing on a malformed hash', () => {
    const { salt } = hashPassword('password123');
    expect(verifyPassword('password123', 'not-a-valid-hex-hash', salt)).toBe(false);
    expect(verifyPassword('password123', 'abcd', salt)).toBe(false);
  });

  it('returns false when hash or salt is empty', () => {
    expect(verifyPassword('password123', '', 'salt')).toBe(false);
    expect(verifyPassword('password123', 'deadbeef', '')).toBe(false);
  });
});

describe('createHmacSignature / verifyHmacSignature', () => {
  const secret = 'webhook-secret';
  const payload = JSON.stringify({ action: 'opened' });

  it('produces a stable sha256 signature by default', () => {
    expect(createHmacSignature(payload, secret)).toBe(createHmacSignature(payload, secret));
    expect(createHmacSignature(payload, secret)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('supports sha512', () => {
    expect(createHmacSignature(payload, secret, 'sha512')).toMatch(/^[0-9a-f]{128}$/);
  });

  it('verifies a valid signature', () => {
    const signature = createHmacSignature(payload, secret);
    expect(verifyHmacSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects a signature computed over different data', () => {
    const signature = createHmacSignature('other-payload', secret);
    expect(verifyHmacSignature(payload, signature, secret)).toBe(false);
  });

  it('returns false instead of throwing on odd-length or non-hex signatures', () => {
    expect(verifyHmacSignature(payload, 'abc', secret)).toBe(false);
    expect(verifyHmacSignature(payload, 'zz', secret)).toBe(false);
  });

  it('returns false when signature or secret is missing', () => {
    const signature = createHmacSignature(payload, secret);
    expect(verifyHmacSignature(payload, '', secret)).toBe(false);
    expect(verifyHmacSignature(payload, signature, '')).toBe(false);
  });
});

describe('random generators', () => {
  it('generateSecureToken returns hex of the requested byte length', () => {
    expect(generateSecureToken(8)).toMatch(/^[0-9a-f]{16}$/);
    expect(generateSecureToken()).toHaveLength(64);
  });

  it('generateSecureString only uses the allowed alphabet', () => {
    const value = generateSecureString(64);
    expect(value).toHaveLength(64);
    expect(value).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generateUUID returns a v4 UUID', () => {
    expect(generateUUID()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
