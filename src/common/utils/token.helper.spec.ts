import { describe, it, expect } from 'vitest';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  isWellFormedToken,
  hashesMatch,
} from './token.helper.js';

describe('token.helper', () => {
  it('generates a 64-character hexadecimal opaque token', () => {
    const token = generateOpaqueToken();
    expect(token).toBeDefined();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
  });

  it('generates unique tokens on subsequent calls', () => {
    const token1 = generateOpaqueToken();
    const token2 = generateOpaqueToken();
    expect(token1).not.toBe(token2);
  });

  it('determines if a token is well formed', () => {
    const validToken = generateOpaqueToken();
    expect(isWellFormedToken(validToken)).toBe(true);
    expect(isWellFormedToken('too-short')).toBe(false);
    expect(isWellFormedToken(null)).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
    expect(isWellFormedToken('z'.repeat(64))).toBe(false);
  });

  it('consistently hashes a token with SHA-256', () => {
    const token = generateOpaqueToken();
    const hash1 = hashOpaqueToken(token);
    const hash2 = hashOpaqueToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('correctly matches hashes using timing-safe comparison', () => {
    const token = generateOpaqueToken();
    const hash = hashOpaqueToken(token);
    const differentHash = hashOpaqueToken(generateOpaqueToken());

    expect(hashesMatch(hash, hash)).toBe(true);
    expect(hashesMatch(hash, differentHash)).toBe(false);
    expect(hashesMatch('', '')).toBe(false);
  });
});

