import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidPakistaniMobile, slugify } from './phone.js';

describe('Phone & Slug Utils (unit)', () => {
  describe('normalizePhone', () => {
    it('normalizes local 03001234567 to 923001234567', () => {
      expect(normalizePhone('03001234567')).toBe('923001234567');
    });

    it('normalizes 00923001234567 to 923001234567', () => {
      expect(normalizePhone('00923001234567')).toBe('923001234567');
    });

    it('handles +92 formatted phone', () => {
      expect(normalizePhone('+923001234567')).toBe('923001234567');
    });

    it('strips non-digit formatting characters', () => {
      expect(normalizePhone('+92 (300) 123-4567')).toBe('923001234567');
    });

    it('returns empty string for empty input', () => {
      expect(normalizePhone('')).toBe('');
    });
  });

  describe('isValidPakistaniMobile', () => {
    it('returns true for valid Pakistani mobile numbers', () => {
      expect(isValidPakistaniMobile('03001234567')).toBe(true);
      expect(isValidPakistaniMobile('923001234567')).toBe(true);
      expect(isValidPakistaniMobile('+923451234567')).toBe(true);
    });

    it('returns false for invalid Pakistani mobile numbers', () => {
      expect(isValidPakistaniMobile('0300123456')).toBe(false); // too short
      expect(isValidPakistaniMobile('04231234567')).toBe(false); // landline
      expect(isValidPakistaniMobile('9230012345678')).toBe(false); // too long
      expect(isValidPakistaniMobile('invalid')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('generates URL-friendly lowercase slugs', () => {
      expect(slugify('Al Madina Hotel & Tikka')).toBe('al-madina-hotel-tikka');
      expect(slugify('  Timergara-Food ! 123  ')).toBe('timergara-food-123');
    });
  });
});
