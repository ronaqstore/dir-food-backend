import { describe, it, expect } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import {
  AuthTokenType,
  extractRawToken,
  verifyTokenOfType,
} from './auth-token.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('auth-token', () => {
  const secret = 'test-secret-at-least-16-chars-long';
  const jwtService = new JwtService({ secret });

  it('extracts token from cookie first', () => {
    const req: any = {
      cookies: { dir_food_token: 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    };
    expect(extractRawToken(req)).toBe('cookie-token');
  });

  it('extracts token from Bearer header if cookie is missing', () => {
    const req: any = {
      cookies: {},
      headers: { authorization: 'Bearer header-token' },
    };
    expect(extractRawToken(req)).toBe('header-token');
  });

  it('returns null if no token is present', () => {
    const req: any = {
      cookies: {},
      headers: {},
    };
    expect(extractRawToken(req)).toBeNull();
  });

  it('verifies RESTAURANT_OWNER token successfully', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-1',
        restaurantId: 'rest-1',
        role: UserRole.RESTAURANT_OWNER,
        typ: AuthTokenType.RESTAURANT_OWNER,
      },
      { secret },
    );

    const payload = await verifyTokenOfType(
      jwtService,
      secret,
      token,
      AuthTokenType.RESTAURANT_OWNER,
    );
    expect(payload.userId).toBe('user-1');
    expect((payload as any).restaurantId).toBe('rest-1');
  });

  it('verifies PLATFORM_ADMIN token successfully', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'admin-1',
        role: UserRole.PLATFORM_ADMIN,
        typ: AuthTokenType.PLATFORM_ADMIN,
      },
      { secret },
    );

    const payload = await verifyTokenOfType(
      jwtService,
      secret,
      token,
      AuthTokenType.PLATFORM_ADMIN,
    );
    expect(payload.userId).toBe('admin-1');
  });

  it('rejects an owner token when PLATFORM_ADMIN is expected', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'user-1',
        restaurantId: 'rest-1',
        role: UserRole.RESTAURANT_OWNER,
        typ: AuthTokenType.RESTAURANT_OWNER,
      },
      { secret },
    );

    await expect(
      verifyTokenOfType(jwtService, secret, token, AuthTokenType.PLATFORM_ADMIN),
    ).rejects.toThrow();
  });

  it('rejects an admin token when RESTAURANT_OWNER is expected', async () => {
    const token = await jwtService.signAsync(
      {
        sub: 'admin-1',
        role: UserRole.PLATFORM_ADMIN,
        typ: AuthTokenType.PLATFORM_ADMIN,
      },
      { secret },
    );

    await expect(
      verifyTokenOfType(jwtService, secret, token, AuthTokenType.RESTAURANT_OWNER),
    ).rejects.toThrow();
  });
});
