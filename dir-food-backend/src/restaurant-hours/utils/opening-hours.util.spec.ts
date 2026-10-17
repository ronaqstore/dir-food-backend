import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  validateWeeklyHours,
  isRestaurantOpenNow,
  timeStringToDate,
  dateTimeToTimeString,
} from './opening-hours.util.js';
import { ManualStatus } from '../../generated/prisma/enums.js';

describe('opening-hours.util', () => {
  describe('validateWeeklyHours', () => {
    it('accepts valid daytime and touching ranges', () => {
      const schedule = [
        {
          dayOfWeek: 1,
          ranges: [
            { openTime: '10:00', closeTime: '14:00' },
            { openTime: '14:00', closeTime: '18:00' }, // Touching range is accepted
          ],
        },
      ];

      const parsed = validateWeeklyHours(schedule);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].openStr).toBe('10:00');
      expect(parsed[1].closeStr).toBe('18:00');
    });

    it('rejects identical open and close time', () => {
      const schedule = [
        {
          dayOfWeek: 1,
          ranges: [{ openTime: '12:00', closeTime: '12:00' }],
        },
      ];

      expect(() => validateWeeklyHours(schedule)).toThrow(BadRequestException);
    });

    it('rejects overlapping ranges on the same day', () => {
      const schedule = [
        {
          dayOfWeek: 1,
          ranges: [
            { openTime: '10:00', closeTime: '15:00' },
            { openTime: '14:00', closeTime: '18:00' },
          ],
        },
      ];

      expect(() => validateWeeklyHours(schedule)).toThrow(BadRequestException);
    });

    it('accepts valid overnight range', () => {
      const schedule = [
        {
          dayOfWeek: 1, // Monday 18:00 to Tuesday 02:00
          ranges: [{ openTime: '18:00', closeTime: '02:00' }],
        },
      ];

      const parsed = validateWeeklyHours(schedule);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].isOvernight).toBe(true);
    });

    it('rejects overnight range overlapping with next day early hours', () => {
      const schedule = [
        {
          dayOfWeek: 1, // Monday 22:00 to 02:00
          ranges: [{ openTime: '22:00', closeTime: '02:00' }],
        },
        {
          dayOfWeek: 2, // Tuesday 01:00 to 05:00 (overlaps with 00:00-02:00 from Monday)
          ranges: [{ openTime: '01:00', closeTime: '05:00' }],
        },
      ];

      expect(() => validateWeeklyHours(schedule)).toThrow(BadRequestException);
    });

    it('accepts overnight range when next day starts after overnight close', () => {
      const schedule = [
        {
          dayOfWeek: 1, // Monday 22:00 to 02:00
          ranges: [{ openTime: '22:00', closeTime: '02:00' }],
        },
        {
          dayOfWeek: 2, // Tuesday 02:00 to 06:00 (touching at 02:00)
          ranges: [{ openTime: '02:00', closeTime: '06:00' }],
        },
      ];

      const parsed = validateWeeklyHours(schedule);
      expect(parsed).toHaveLength(2);
    });
  });

  describe('isRestaurantOpenNow', () => {
    // Mon 18:00 to Tue 02:00 overnight range
    const hours = [
      {
        dayOfWeek: 1, // Monday
        openTime: timeStringToDate('18:00'),
        closeTime: timeStringToDate('02:00'),
      },
      {
        dayOfWeek: 2, // Tuesday
        openTime: timeStringToDate('10:00'),
        closeTime: timeStringToDate('22:00'),
      },
    ];

    it('returns false when restaurant has manual CLOSED status', () => {
      const res = isRestaurantOpenNow(hours, ManualStatus.CLOSED, 'Renovating');
      expect(res.isOpenNow).toBe(false);
      expect(res.manualStatus).toBe(ManualStatus.CLOSED);
      expect(res.availabilityText).toContain('Renovating');
    });

    it('returns false when restaurant has TEMP_UNAVAILABLE status', () => {
      const res = isRestaurantOpenNow(hours, ManualStatus.TEMP_UNAVAILABLE, 'No electricity');
      expect(res.isOpenNow).toBe(false);
      expect(res.manualStatus).toBe(ManualStatus.TEMP_UNAVAILABLE);
      expect(res.availabilityText).toContain('No electricity');
    });

    it('evaluates open now at 23:30 on Monday for overnight range', () => {
      // 2026-10-19 is a Monday. 23:30 in Karachi (UTC+5) is 18:30 UTC.
      const mondayNight = new Date('2026-10-19T18:30:00.000Z');
      const res = isRestaurantOpenNow(hours, ManualStatus.AUTO, null, mondayNight);
      expect(res.isOpenNow).toBe(true);
    });

    it('evaluates open now at 01:00 on Tuesday morning for Monday overnight range', () => {
      // 2026-10-20 is Tuesday. 01:00 in Karachi (UTC+5) is 20:00 UTC on 2026-10-19.
      const tuesdayEarly = new Date('2026-10-19T20:00:00.000Z');
      const res = isRestaurantOpenNow(hours, ManualStatus.AUTO, null, tuesdayEarly);
      expect(res.isOpenNow).toBe(true);
    });

    it('evaluates closed at 03:00 on Tuesday after overnight range closes', () => {
      // 03:00 Karachi on Tuesday = 22:00 UTC on Monday
      const tuesdayLateNight = new Date('2026-10-19T22:00:00.000Z');
      const res = isRestaurantOpenNow(hours, ManualStatus.AUTO, null, tuesdayLateNight);
      expect(res.isOpenNow).toBe(false);
    });

    it('returns false when hours list is empty', () => {
      const res = isRestaurantOpenNow([], ManualStatus.AUTO);
      expect(res.isOpenNow).toBe(false);
    });
  });

  describe('time format helpers', () => {
    it('converts HH:mm to Date and back', () => {
      const date = timeStringToDate('14:30');
      const formatted = dateTimeToTimeString(date);
      expect(formatted).toBe('14:30');
    });
  });
});
