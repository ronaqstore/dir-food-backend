import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EnvelopeResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

const MIN_SAFE_BIGINT = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

export function serializeBigInts(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'bigint') {
    if (value >= MIN_SAFE_BIGINT && value <= MAX_SAFE_BIGINT) {
      return Number(value);
    }
    return value.toString();
  }
  if (value instanceof Date) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(serializeBigInts);
  }
  if (typeof value === 'object') {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = serializeBigInts(v);
    }
    return res;
  }
  return value;
}

@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, EnvelopeResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<EnvelopeResponse<T>> {
    return next.handle().pipe(
      map((res) => {
        // If response is null/undefined
        if (res === null || res === undefined) {
          return { data: null as unknown as T };
        }
        // If response is already formatted with data/meta
        if (typeof res === 'object' && res !== null && 'data' in res) {
          return serializeBigInts(res) as EnvelopeResponse<T>;
        }
        return { data: serializeBigInts(res) as T };
      }),
    );
  }
}

