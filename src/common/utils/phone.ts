export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) {
    return '';
  }
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('03')) {
    digits = '92' + digits.slice(1);
  } else if (digits.startsWith('0092')) {
    digits = digits.slice(2);
  }
  return digits;
}

export function isValidPakistaniMobile(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^923\d{9}$/.test(normalized);
}

/**
 * Reserved system and platform admin phone numbers:
 * - 03115514151 (923115514151) -> Super Admin / Platform Admin Login 1
 * - 03059596704 (923059596704) -> Super Admin / Platform Admin Login 2
 * - 03029825213 (923029825213) -> Super Admin Public Support Contact 1
 * - 03484894115 (923484894115) -> Super Admin Public Support Contact 2
 */
export const RESERVED_PHONE_NUMBERS = [
  '923115514151',
  '923059596704',
  '923029825213',
  '923484894115',
] as const;

export function isReservedPhoneNumber(rawPhone: string): boolean {
  if (!rawPhone) {
    return false;
  }
  const normalized = normalizePhone(rawPhone);
  return (RESERVED_PHONE_NUMBERS as readonly string[]).includes(normalized);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
