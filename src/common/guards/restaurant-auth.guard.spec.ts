import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RestaurantAuthGuard } from './restaurant-auth.guard.js';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthTokenType } from './auth-token.js';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus, RestaurantStatus } from '../../generated/prisma/enums.js';

describe('RestaurantAuthGuard (DB checks)', () => {
  const secret = 'test-secret-at-least-16-chars-long';
  let jwtService: JwtService;
  let configService: AppConfigurationService;
  let mockPrisma: any;
  let guard: RestaurantAuthGuard;

  beforeEach(() => {
    jwtService = new JwtService({ secret });
    configService = { jwtSecret: secret } as AppConfigurationService;
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    guard = new RestaurantAuthGuard(jwtService, configService, mockPrisma as PrismaService);
  });

  const createMockContext = (
    headers: Record<string, string>,
    method = 'GET',
    cookies: Record<string, string> = {},
  ) => {
    const request: any = { headers, cookies, method };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access with active owner and active restaurant', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: new Date(Date.now() + 86400000),
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({
      userId: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    });
  });

  it('allows access with pending restaurant so owner can configure menu before approval', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.PENDING,
        subscriptionEndsAt: null,
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` }, 'POST');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows access with expired subscription so owner can update menu/hours/delivery while renewing', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: new Date(Date.now() - 86400000), // expired yesterday
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` }, 'POST');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('allows read-only GET requests on suspended restaurants', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.SUSPENDED,
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` }, 'GET');
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('blocks mutation requests (POST/PATCH/DELETE) on suspended restaurants', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.SUSPENDED,
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` }, 'PATCH');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('blocks all requests on deactivated restaurants', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.DEACTIVATED,
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` }, 'GET');
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('blocks requests when user account is disabled', async () => {
    const token = await jwtService.signAsync({
      sub: 'owner-1',
      restaurantId: 'rest-1',
      role: UserRole.RESTAURANT_OWNER,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'owner-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.DISABLED,
      restaurantId: 'rest-1',
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.ACTIVE,
      },
    });

    const context = createMockContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
