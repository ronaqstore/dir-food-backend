import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { createHash } from 'node:crypto';

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class OrderIntentRateLimiterService {
  // IP limit: 5 requests per 10 minutes (600,000 ms)
  private readonly IP_LIMIT = 5;
  private readonly IP_WINDOW_MS = 10 * 60 * 1000;

  // Phone limit: 3 requests per 1 hour (3,600,000 ms) per (phone + restaurant)
  private readonly PHONE_LIMIT = 3;
  private readonly PHONE_WINDOW_MS = 60 * 60 * 1000;

  private readonly ipRecords = new Map<string, RateLimitRecord>();
  private readonly phoneRecords = new Map<string, RateLimitRecord>();

  /**
   * Hashes customer phone with a static salt to prevent in-memory plaintext phone tracking.
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(`dir_food_rl:${key}`).digest('hex');
  }

  /**
   * Checks and consumes an attempt. Throws 429 TooManyRequestsException if exceeded.
   */
  checkAndRecord(ip: string, restaurantId: string, customerPhone?: string | null): void {
    const now = Date.now();

    // 1. IP rate check
    const ipKey = ip || 'unknown-ip';
    let ipEntry = this.ipRecords.get(ipKey);
    if (!ipEntry) {
      ipEntry = { timestamps: [] };
      this.ipRecords.set(ipKey, ipEntry);
    }
    // Prune expired
    ipEntry.timestamps = ipEntry.timestamps.filter((ts) => now - ts < this.IP_WINDOW_MS);
    if (ipEntry.timestamps.length >= this.IP_LIMIT) {
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait a few minutes before trying again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Phone rate check (only if phone is provided)
    if (customerPhone && customerPhone.trim()) {
      const normalized = customerPhone.replace(/\D/g, '');
      const phoneKey = this.hashKey(`${restaurantId}:${normalized}`);
      let phoneEntry = this.phoneRecords.get(phoneKey);
      if (!phoneEntry) {
        phoneEntry = { timestamps: [] };
        this.phoneRecords.set(phoneKey, phoneEntry);
      }
      phoneEntry.timestamps = phoneEntry.timestamps.filter(
        (ts) => now - ts < this.PHONE_WINDOW_MS,
      );
      if (phoneEntry.timestamps.length >= this.PHONE_LIMIT) {
        throw new HttpException(
          {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many order requests for this phone number. Please try again later.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      phoneEntry.timestamps.push(now);
    }

    // Record the IP attempt
    ipEntry.timestamps.push(now);
  }

  /**
   * For testing: resets internal state.
   */
  reset(): void {
    this.ipRecords.clear();
    this.phoneRecords.clear();
  }
}

