import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  isValidPakistaniMobile,
  slugify,
  isReservedPhoneNumber,
  RESERVED_PHONE_NUMBERS,
} from './phone.js';

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

  describe('isReservedPhoneNumber', () => {
    it('returns true for reserved admin and support numbers in any format', () => {
      expect(isReservedPhoneNumber('03115514151')).toBe(true);
      expect(isReservedPhoneNumber('+923115514151')).toBe(true);
      expect(isReservedPhoneNumber('03059596704')).toBe(true);
      expect(isReservedPhoneNumber('0302 9825213')).toBe(true);
      expect(isReservedPhoneNumber('0348 4894115')).toBe(true);
      expect(isReservedPhoneNumber('923484894115')).toBe(true);
    });

    it('has all 4 designated admin and support numbers in RESERVED_PHONE_NUMBERS', () => {
      expect(RESERVED_PHONE_NUMBERS.length).toBe(4);
    });

    it('returns false for non-reserved numbers', () => {
      expect(isReservedPhoneNumber('03111111111')).toBe(false);
      expect(isReservedPhoneNumber('03001234567')).toBe(false);
      expect(isReservedPhoneNumber('')).toBe(false);
    });
  });
});
