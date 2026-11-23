import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { normalizePhone } from '../../common/utils/phone.js';

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class OrderIntentRateLimiterService {
  private readonly IP_LIMIT = 5;
  private readonly IP_WINDOW_MS = 10 * 60 * 1000;

  private readonly PHONE_LIMIT = 3;
  private readonly PHONE_WINDOW_MS = 60 * 60 * 1000;

  private readonly ipRecords = new Map<string, RateLimitRecord>();
  private readonly phoneRecords = new Map<string, RateLimitRecord>();

  private hashKey(key: string): string {
    return createHash('sha256').update(`dir_food_rl:${key}`).digest('hex');
  }

  private cleanup(now: number): void {
    if (this.ipRecords.size > 2000) {
      const ipMap = this.ipRecords;
      for (const [key, record] of ipMap.entries()) {
        record.timestamps = record.timestamps.filter(
          (ts) => now - ts < this.IP_WINDOW_MS,
        );
        if (record.timestamps.length === 0) {
          ipMap.delete(key);
        }
      }
    }

    if (this.phoneRecords.size > 2000) {
      const phoneMap = this.phoneRecords;
      for (const [key, record] of phoneMap.entries()) {
        record.timestamps = record.timestamps.filter(
          (ts) => now - ts < this.PHONE_WINDOW_MS,
        );
        if (record.timestamps.length === 0) {
          phoneMap.delete(key);
        }
      }
    }
  }

  checkOnly(
    ip: string,
    restaurantId: string,
    customerPhone?: string | null,
  ): void {
    const now = Date.now();
    this.cleanup(now);

    const ipKey = ip || 'unknown-ip';
    const ipEntry = this.ipRecords.get(ipKey);
    if (ipEntry) {
      const activeTimestamps = ipEntry.timestamps.filter(
        (ts) => now - ts < this.IP_WINDOW_MS,
      );
      if (activeTimestamps.length >= this.IP_LIMIT) {
        throw new HttpException(
          {
            code: 'RATE_LIMIT_EXCEEDED',
            message:
              'Too many requests. Please wait a few minutes before trying again.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    if (customerPhone && customerPhone.trim()) {
      const normalized =
        normalizePhone(customerPhone) || customerPhone.replace(/\D/g, '');
      const phoneKey = this.hashKey(`${restaurantId}:${normalized}`);
      const phoneEntry = this.phoneRecords.get(phoneKey);
      if (phoneEntry) {
        const activeTimestamps = phoneEntry.timestamps.filter(
          (ts) => now - ts < this.PHONE_WINDOW_MS,
        );
        if (activeTimestamps.length >= this.PHONE_LIMIT) {
          throw new HttpException(
            {
              code: 'RATE_LIMIT_EXCEEDED',
              message:
                'Too many order requests for this phone number. Please try again later.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }
  }

  record(
    ip: string,
    restaurantId: string,
    customerPhone?: string | null,
  ): void {
    const now = Date.now();
    this.cleanup(now);

    const ipKey = ip || 'unknown-ip';
    let ipEntry = this.ipRecords.get(ipKey);
    if (!ipEntry) {
      ipEntry = { timestamps: [] };
      this.ipRecords.set(ipKey, ipEntry);
    }
    ipEntry.timestamps.push(now);

    if (customerPhone && customerPhone.trim()) {
      const normalized =
        normalizePhone(customerPhone) || customerPhone.replace(/\D/g, '');
      const phoneKey = this.hashKey(`${restaurantId}:${normalized}`);
      let phoneEntry = this.phoneRecords.get(phoneKey);
      if (!phoneEntry) {
        phoneEntry = { timestamps: [] };
        this.phoneRecords.set(phoneKey, phoneEntry);
      }
      phoneEntry.timestamps.push(now);
    }
  }

  checkAndRecord(
    ip: string,
    restaurantId: string,
    customerPhone?: string | null,
  ): void {
    this.checkOnly(ip, restaurantId, customerPhone);
    this.record(ip, restaurantId, customerPhone);
  }

  reset(): void {
    this.ipRecords.clear();
    this.phoneRecords.clear();
  }
}
