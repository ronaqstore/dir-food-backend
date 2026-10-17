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
          return res;
        }
        return { data: res };
      }),
    );
  }
}

