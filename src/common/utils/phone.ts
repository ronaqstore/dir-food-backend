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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
