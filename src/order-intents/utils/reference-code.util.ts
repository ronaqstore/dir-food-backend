import { randomInt } from 'node:crypto';

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const PREFIX = 'TM-';

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
