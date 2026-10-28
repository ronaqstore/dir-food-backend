import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard.js';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthTokenType } from './auth-token.js';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';

describe('PlatformAdminGuard (DB checks)', () => {
  const secret = 'test-secret-at-least-16-chars-long';
  let jwtService: JwtService;
  let configService: AppConfigurationService;
  let mockPrisma: any;
  let guard: PlatformAdminGuard;

  beforeEach(() => {
    jwtService = new JwtService({ secret });
    configService = { jwtSecret: secret } as AppConfigurationService;
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    guard = new PlatformAdminGuard(jwtService, configService, mockPrisma as PrismaService);
  });

  const createMockContext = (
    headers: Record<string, string>,
    cookies: Record<string, string> = {},
  ) => {
    const request: any = { headers, cookies, method: 'GET' };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access with active platform admin in DB', async () => {
    const token = await jwtService.signAsync({
      sub: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      typ: AuthTokenType.PLATFORM_ADMIN,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      restaurantId: null,
    });

    const context = createMockContext({ authorization: `Bearer ${token}` });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({
      userId: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      restaurantId: null,
    });
  });

  it('blocks access when admin account is disabled in DB', async () => {
    const token = await jwtService.signAsync({
      sub: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      typ: AuthTokenType.PLATFORM_ADMIN,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.DISABLED,
    });

    const context = createMockContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('blocks access when user is not a platform admin in DB', async () => {
    const token = await jwtService.signAsync({
      sub: 'user-1',
      role: UserRole.PLATFORM_ADMIN,
      typ: AuthTokenType.PLATFORM_ADMIN,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
    });

    const context = createMockContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('blocks access when admin does not exist in DB', async () => {
    const token = await jwtService.signAsync({
      sub: 'admin-999',
      role: UserRole.PLATFORM_ADMIN,
      typ: AuthTokenType.PLATFORM_ADMIN,
    });

    mockPrisma.user.findUnique.mockResolvedValue(null);

    const context = createMockContext({ authorization: `Bearer ${token}` });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
