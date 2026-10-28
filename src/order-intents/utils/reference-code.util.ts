import { randomInt } from 'node:crypto';

// Characters excluded: 0, O, 1, I, L to prevent human reading confusion
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const PREFIX = 'TM-';

/**
 * Generates a human-friendly reference code for WhatsApp handoff requests.
 * Format: TM-XXXXXX (e.g., TM-7K4P9Q)
 */
export function generateReferenceCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = randomInt(0, CHARSET.length);
    code += CHARSET[idx];
  }
  return `${PREFIX}${code}`;
}

export function isValidReferenceCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  const regex = new RegExp(`^${PREFIX}[${CHARSET}]{${CODE_LENGTH}}$`);
  return regex.test(code.toUpperCase());
}

