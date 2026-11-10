import { BadRequestException } from '@nestjs/common';
import { ManualStatus } from '../../generated/prisma/enums.js';
import type { DayHoursDto } from '../dto/update-hours.dto.js';

export interface ParsedRange {
  dayOfWeek: number;
  openStr: string;
  closeStr: string;
  openMinutes: number;
  closeMinutes: number;
  isOvernight: boolean;
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return h * 60 + m;
}

export function timeStringToDate(timeStr: string): Date {
  const parts = timeStr.split(':');
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return new Date(`1970-01-01T${h}:${m}:00.000Z`);
}

export function dateTimeToTimeString(date: Date | string): string {
  if (typeof date === 'string') {
    const match = date.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : date;
  }
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function validateWeeklyHours(days: DayHoursDto[]): ParsedRange[] {
  const seenDays = new Set<number>();
  const allParsed: ParsedRange[] = [];
  const rangesByDay = new Map<number, ParsedRange[]>();

  for (const day of days) {
    if (seenDays.has(day.dayOfWeek)) {
      throw new BadRequestException(
        `Duplicate entry for dayOfWeek ${day.dayOfWeek}. Group ranges under a single day entry.`,
      );
    }
    seenDays.add(day.dayOfWeek);

    const dayParsed: ParsedRange[] = [];

    for (const r of day.ranges) {
      if (r.openTime === r.closeTime) {
        throw new BadRequestException(
          `Day ${day.dayOfWeek}: openTime (${r.openTime}) and closeTime (${r.closeTime}) cannot be identical`,
        );
      }

      const openMin = parseTimeToMinutes(r.openTime);
      const closeMin = parseTimeToMinutes(r.closeTime);
      const isOvernight = closeMin < openMin;

      dayParsed.push({
        dayOfWeek: day.dayOfWeek,
        openStr: r.openTime,
        closeStr: r.closeTime,
        openMinutes: openMin,
        closeMinutes: closeMin,
        isOvernight,
      });
    }

    for (let i = 0; i < dayParsed.length; i++) {
      for (let j = i + 1; j < dayParsed.length; j++) {
        const r1 = dayParsed[i];
        const r2 = dayParsed[j];

        if (r1.isOvernight && r2.isOvernight) {
          throw new BadRequestException(
            `Day ${day.dayOfWeek}: Cannot have multiple overnight ranges on the same day`,
          );
        }

        if (!r1.isOvernight && !r2.isOvernight) {
          const maxStart = Math.max(r1.openMinutes, r2.openMinutes);
          const minEnd = Math.min(r1.closeMinutes, r2.closeMinutes);
          if (maxStart < minEnd) {
            throw new BadRequestException(
              `Day ${day.dayOfWeek}: Overlapping ranges (${r1.openStr}-${r1.closeStr}) and (${r2.openStr}-${r2.closeStr})`,
            );
          }
        } else {
          const overnight = r1.isOvernight ? r1 : r2;
          const sameDay = r1.isOvernight ? r2 : r1;

          if (sameDay.closeMinutes > overnight.openMinutes) {
            throw new BadRequestException(
              `Day ${day.dayOfWeek}: Range (${sameDay.openStr}-${sameDay.closeStr}) overlaps overnight range start (${overnight.openStr})`,
            );
          }
        }
      }
    }

    rangesByDay.set(day.dayOfWeek, dayParsed);
    allParsed.push(...dayParsed);
  }

  for (const r of allParsed) {
    if (r.isOvernight) {
      const nextDay = (r.dayOfWeek + 1) % 7;
      const nextDayRanges = rangesByDay.get(nextDay) ?? [];

      for (const nextR of nextDayRanges) {
        if (nextR.openMinutes < r.closeMinutes) {
          throw new BadRequestException(
            `Overnight range on day ${r.dayOfWeek} (${r.openStr}-${r.closeStr}) overlaps into day ${nextDay} early hours (${nextR.openStr}-${nextR.closeStr})`,
          );
        }
      }
    }
  }

  return allParsed;
}

export function getCurrentKarachiTime(targetDate?: Date): {
  dayOfWeek: number;
  minutes: number;
  date: Date;
} {
  const now = targetDate ?? new Date();
  const karachiFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = karachiFormatter.formatToParts(now);
  let weekdayStr = '';
  let hour = 0;
  let minute = 0;

  for (const p of parts) {
    if (p.type === 'weekday') weekdayStr = p.value;
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }

  if (hour === 24) hour = 0;

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const dayOfWeek = dayMap[weekdayStr] ?? now.getDay();
  const minutes = hour * 60 + minute;

  return { dayOfWeek, minutes, date: now };
}

export function computeKarachiIso(
  now: Date,
  dayOffset: number,
  openMinutes: number,
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(now);
  const [y, m, d] = dateStr.split('-').map(Number);

  const targetUtc = new Date(Date.UTC(y, m - 1, d));
  targetUtc.setUTCDate(targetUtc.getUTCDate() + dayOffset);

  const tYear = targetUtc.getUTCFullYear();
  const tMonth = String(targetUtc.getUTCMonth() + 1).padStart(2, '0');
  const tDay = String(targetUtc.getUTCDate()).padStart(2, '0');

  const hh = String(Math.floor(openMinutes / 60)).padStart(2, '0');
  const mm = String(openMinutes % 60).padStart(2, '0');

  const localIsoWithTz = `${tYear}-${tMonth}-${tDay}T${hh}:${mm}:00+05:00`;
  return new Date(localIsoWithTz).toISOString();
}

export function calculateNextOpenAt(
  hours: Array<{
    dayOfWeek: number;
    openTime: Date | string;
    closeTime: Date | string;
  }>,
  nowDate?: Date,
): { nextOpenAt: string | null; openStr: string | null; dayOffset: number } {
  if (hours.length === 0) {
    return { nextOpenAt: null, openStr: null, dayOffset: -1 };
  }

  const now = nowDate ?? new Date();
  const { dayOfWeek: currentDay, minutes: currentMinutes } =
    getCurrentKarachiTime(now);

  for (let offset = 0; offset <= 7; offset++) {
    const targetDay = (currentDay + offset) % 7;
    const dayRanges = hours
      .filter((h) => h.dayOfWeek === targetDay)
      .map((h) => {
        const openStr = dateTimeToTimeString(h.openTime);
        const openMin = parseTimeToMinutes(openStr);
        return { openStr, openMin };
      })
      .sort((a, b) => a.openMin - b.openMin);

    for (const r of dayRanges) {
      if (offset === 0) {
        if (r.openMin > currentMinutes) {
          const iso = computeKarachiIso(now, offset, r.openMin);
          return { nextOpenAt: iso, openStr: r.openStr, dayOffset: offset };
        }
      } else {
        const iso = computeKarachiIso(now, offset, r.openMin);
        return { nextOpenAt: iso, openStr: r.openStr, dayOffset: offset };
      }
    }
  }

  return { nextOpenAt: null, openStr: null, dayOffset: -1 };
}

export function isRestaurantOpenNow(
  hours: Array<{
    dayOfWeek: number;
    openTime: Date | string;
    closeTime: Date | string;
  }>,
  manualStatus: ManualStatus = ManualStatus.AUTO,
  unavailableNote?: string | null,
  nowDate?: Date,
): {
  isOpenNow: boolean;
  manualStatus: ManualStatus;
  unavailableNote: string | null;
  availabilityText: string;
  nextOpenAt: string | null;
} {
  if (manualStatus === ManualStatus.CLOSED) {
    return {
      isOpenNow: false,
      manualStatus,
      unavailableNote: unavailableNote ?? null,
      availabilityText: unavailableNote
        ? `Closed (${unavailableNote})`
        : 'Closed',
      nextOpenAt: null,
    };
  }

  if (manualStatus === ManualStatus.TEMP_UNAVAILABLE) {
    return {
      isOpenNow: false,
      manualStatus,
      unavailableNote: unavailableNote ?? null,
      availabilityText: unavailableNote
        ? `Temporarily unavailable (${unavailableNote})`
        : 'Temporarily unavailable',
      nextOpenAt: null,
    };
  }

  if (hours.length === 0) {
    return {
      isOpenNow: false,
      manualStatus: ManualStatus.AUTO,
      unavailableNote: null,
      availabilityText: 'Closed',
      nextOpenAt: null,
    };
  }

  const { dayOfWeek: currentDay, minutes: currentMinutes } =
    getCurrentKarachiTime(nowDate);
  const prevDay = (currentDay + 6) % 7;

  for (const h of hours) {
    const openStr = dateTimeToTimeString(h.openTime);
    const closeStr = dateTimeToTimeString(h.closeTime);
    const openMin = parseTimeToMinutes(openStr);
    const closeMin = parseTimeToMinutes(closeStr);
    const isOvernight = closeMin < openMin;

    if (h.dayOfWeek === currentDay) {
      if (!isOvernight) {
        if (currentMinutes >= openMin && currentMinutes < closeMin) {
          return {
            isOpenNow: true,
            manualStatus: ManualStatus.AUTO,
            unavailableNote: null,
            availabilityText: `Open until ${closeStr}`,
            nextOpenAt: null,
          };
        }
      } else {
        if (currentMinutes >= openMin) {
          return {
            isOpenNow: true,
            manualStatus: ManualStatus.AUTO,
            unavailableNote: null,
            availabilityText: `Open until ${closeStr} tomorrow`,
            nextOpenAt: null,
          };
        }
      }
    }

    if (h.dayOfWeek === prevDay && isOvernight) {
      if (currentMinutes < closeMin) {
        return {
          isOpenNow: true,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          availabilityText: `Open until ${closeStr}`,
          nextOpenAt: null,
        };
      }
    }
  }

  const next = calculateNextOpenAt(hours, nowDate);
  let availabilityText = 'Closed now';
  if (next.nextOpenAt && next.openStr) {
    if (next.dayOffset === 0) {
      availabilityText = `Closed, opens at ${next.openStr}`;
    } else if (next.dayOffset === 1) {
      availabilityText = `Closed, opens at ${next.openStr} tomorrow`;
    } else {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const targetDay = (currentDay + next.dayOffset) % 7;
      availabilityText = `Closed, opens ${dayNames[targetDay]} at ${next.openStr}`;
    }
  }

  return {
    isOpenNow: false,
    manualStatus: ManualStatus.AUTO,
    unavailableNote: null,
    availabilityText,
    nextOpenAt: next.nextOpenAt,
  };
}
