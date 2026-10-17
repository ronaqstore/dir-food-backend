import { describe, it, expect } from 'vitest';
import {
  generateReferenceCode,
  isValidReferenceCode,
} from './reference-code.util.js';

describe('reference-code.util', () => {
  it('generates a reference code matching the TM-XXXXXX format', () => {
    const code = generateReferenceCode();
    expect(code).toMatch(/^TM-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it('generates unique codes across multiple invocations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateReferenceCode());
    }
    expect(codes.size).toBe(50);
  });

  it('validates well-formed codes', () => {
    expect(isValidReferenceCode('TM-7K4P9Q')).toBe(true);
    expect(isValidReferenceCode('tm-7k4p9q')).toBe(true);
  });

  it('rejects malformed codes with confusing characters (0, O, 1, I, L) or bad length', () => {
    expect(isValidReferenceCode('TM-0K4P9Q')).toBe(false); // contains 0
    expect(isValidReferenceCode('TM-OK4P9Q')).toBe(false); // contains O
    expect(isValidReferenceCode('TM-1K4P9Q')).toBe(false); // contains 1
    expect(isValidReferenceCode('TM-IK4P9Q')).toBe(false); // contains I
    expect(isValidReferenceCode('TM-LK4P9Q')).toBe(false); // contains L
    expect(isValidReferenceCode('TM-7K4P')).toBe(false); // too short
    expect(isValidReferenceCode('AB-7K4P9Q')).toBe(false); // wrong prefix
    expect(isValidReferenceCode('')).toBe(false);
  });
});

