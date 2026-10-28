import { describe, it, expect, beforeEach } from 'vitest';
import { OrderIntentRateLimiterService } from './rate-limiter.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('OrderIntentRateLimiterService', () => {
  let rateLimiter: OrderIntentRateLimiterService;

  beforeEach(() => {
    rateLimiter = new OrderIntentRateLimiterService();
  });

  it('allows requests within the IP limit (up to 5 in 10 minutes)', () => {
    const ip = '192.168.1.100';
    const restId = 'rest-123';

    for (let i = 0; i < 5; i++) {
      expect(() => rateLimiter.checkAndRecord(ip, restId)).not.toThrow();
    }

    expect(() => rateLimiter.checkAndRecord(ip, restId)).toThrow(HttpException);
    try {
      rateLimiter.checkAndRecord(ip, restId);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('enforces phone limit (up to 3 per hour per restaurant) only when phone is supplied', () => {
    const restId = 'rest-123';
    const phone = '03001234567';

    // Different IPs to avoid IP rate limit
    rateLimiter.checkAndRecord('10.0.0.1', restId, phone);
    rateLimiter.checkAndRecord('10.0.0.2', restId, phone);
    rateLimiter.checkAndRecord('10.0.0.3', restId, phone);

    // 4th attempt from same phone for same restaurant should fail
    expect(() => rateLimiter.checkAndRecord('10.0.0.4', restId, phone)).toThrow(
      HttpException,
    );
  });

  it('allows requests without phone to be bounded only by IP limit', () => {
    const ip = '10.0.0.5';
    const restId = 'rest-123';

    for (let i = 0; i < 5; i++) {
      expect(() => rateLimiter.checkAndRecord(ip, restId, null)).not.toThrow();
    }
    expect(() => rateLimiter.checkAndRecord(ip, restId, null)).toThrow();
  });
});

