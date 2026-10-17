import { describe, it, expect } from 'vitest';
import { of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor.js';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const mockContext = {} as ExecutionContext;

  it('wraps simple response into data envelope', async () => {
    const handler: CallHandler = {
      handle: () => of({ name: 'Dir Food' }),
    };

    const observable = interceptor.intercept(mockContext, handler);
    observable.subscribe((result) => {
      expect(result).toEqual({ data: { name: 'Dir Food' } });
    });
  });

  it('preserves existing data/meta envelopes while serializing BigInt', async () => {
    const handler: CallHandler = {
      handle: () =>
        of({
          data: [{ id: '1', price: 150000n }],
          meta: { total: 1 },
        }),
    };

    const observable = interceptor.intercept(mockContext, handler);
    observable.subscribe((result) => {
      expect(result).toEqual({
        data: [{ id: '1', price: 150000 }],
        meta: { total: 1 },
      });
    });
  });

  it('recursively converts BigInt to Number', async () => {
    const handler: CallHandler = {
      handle: () =>
        of({
          restaurant: {
            minOrderAmount: 50000n,
            items: [{ basePrice: 20000n }],
          },
        }),
    };

    const observable = interceptor.intercept(mockContext, handler);
    observable.subscribe((result) => {
      expect(result).toEqual({
        data: {
          restaurant: {
            minOrderAmount: 50000,
            items: [{ basePrice: 20000 }],
          },
        },
      });
    });
  });

  it('handles null and undefined responses', async () => {
    const handler: CallHandler = {
      handle: () => of(null),
    };

    const observable = interceptor.intercept(mockContext, handler);
    observable.subscribe((result) => {
      expect(result).toEqual({ data: null });
    });
  });
});
