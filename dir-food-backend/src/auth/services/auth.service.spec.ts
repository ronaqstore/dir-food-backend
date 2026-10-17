import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { RestaurantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../common/utils/token.helper.js';

describe('AuthService (unit)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockConfig = {
      jwtSecret: 'test-super-secret-jwt-key-min-16',
      appBaseUrl: 'http://localhost:3000',
      passwordSetupTokenTtlMinutes: 1440,
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    const mockJwtService = {
      signAsync: vi.fn().mockResolvedValue('jwt-mock-token-xyz'),
    };

    authService = new AuthService(
      mockPrisma,
      mockJwtService as any,
      mockConfig,
      mockAudit,
    );
  });

  describe('registerRestaurant', () => {
    it('should successfully register a restaurant with PENDING status and owner account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      const createdRestaurant = {
        id: '0192aaaa-0000-7000-8000-000000000001',
        name: 'Dir Tikka',
        slug: 'dir-tikka',
        status: RestaurantStatus.PENDING,
      };

      const createdUser = {
        id: '0192bbbb-0000-7000-8000-000000000002',
        name: 'Khan',
        phone: '923001234567',
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
        restaurantId: createdRestaurant.id,
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb(mockPrisma);
      });

      mockPrisma.restaurant.create.mockResolvedValue(createdRestaurant);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await authService.registerRestaurant({
        restaurantName: 'Dir Tikka',
        ownerName: 'Khan',
        phone: '03001234567',
        password: 'Password123!',
      });

      expect(result.restaurant.status).toBe(RestaurantStatus.PENDING);
      expect(result.user.role).toBe(UserRole.RESTAURANT_OWNER);
      expect((result.user as any).passwordHash).toBeUndefined();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_SELF_REGISTERED',
        }),
      );
    });

    it('should reject invalid phone numbers', async () => {
      await expect(
        authService.registerRestaurant({
          restaurantName: 'Dir Tikka',
          ownerName: 'Khan',
          phone: '12345',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject registration if phone number already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.registerRestaurant({
          restaurantName: 'Dir Tikka',
          ownerName: 'Khan',
          phone: '03001234567',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('restaurantOwnerLogin', () => {
    it('should login owner successfully with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        name: 'Khan',
        phone: '923001234567',
        passwordHash,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
        restaurantId: 'rest-1',
        restaurant: {
          id: 'rest-1',
          name: 'Dir Tikka',
          slug: 'dir-tikka',
          status: RestaurantStatus.PENDING,
          subscriptionEndsAt: null,
        },
      });

      const result = await authService.restaurantOwnerLogin({
        phone: '03001234567',
        password: 'Secret123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.name).toBe('Khan');
      expect(result.restaurantId).toBe('rest-1');
    });

    it('should lock account after 5 failed attempts', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        phone: '923001234567',
        passwordHash,
        failedLoginCount: 4,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
        role: UserRole.RESTAURANT_OWNER,
      });

      await expect(
        authService.restaurantOwnerLogin({
          phone: '03001234567',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(HttpException);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          failedLoginCount: 5,
          lockedUntil: expect.any(Date),
        },
      });
    });
  });

  describe('platformAdminLogin', () => {
    it('should login platform admin successfully', async () => {
      const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'admin-1',
        name: 'Super Admin',
        phone: '923009999999',
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
      });

      const result = await authService.platformAdminLogin({
        phone: '03009999999',
        password: 'AdminSecret123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.admin.role).toBe(UserRole.PLATFORM_ADMIN);
      expect((result as any).restaurantId).toBeUndefined();
    });

    it('should reject wrong admin password', async () => {
      const passwordHash = await bcrypt.hash('AdminSecret123!', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'admin-1',
        phone: '923009999999',
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
      });

      await expect(
        authService.platformAdminLogin({
          phone: '03009999999',
          password: 'WrongAdminPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('password setup & change', () => {
    it('issues a password setup link for an existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Khan',
        phone: '923001234567',
        setupTokenHash: null,
        setupExpiresAt: null,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.issuePasswordSetupLink('user-1');

      expect(result.setupUrl).toContain('http://localhost:3000/setup-password?token=');
      expect(result.replacedPreviousLink).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            setupTokenHash: expect.any(String),
            setupExpiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('successfully consumes setup token to set initial password', async () => {
      const token = generateOpaqueToken();
      const tokenHash = hashOpaqueToken(token);
      const futureDate = new Date(Date.now() + 60000);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        setupTokenHash: tokenHash,
        setupExpiresAt: futureDate,
      });

      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await authService.setupPassword({
        token,
        password: 'NewBrandPassword123!',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          setupTokenHash: tokenHash,
          setupExpiresAt: { gt: expect.any(Date) },
        },
        data: {
          passwordHash: expect.any(String),
          setupTokenHash: null,
          setupExpiresAt: null,
        },
      });
    });

    it('changes password when current password matches', async () => {
      const passwordHash = await bcrypt.hash('OldSecret123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.changePassword('user-1', {
        currentPassword: 'OldSecret123!',
        newPassword: 'BrandNewSecret123!',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: expect.any(String) },
      });
    });

    it('rejects password change if current password is wrong', async () => {
      const passwordHash = await bcrypt.hash('OldSecret123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
      });

      await expect(
        authService.changePassword('user-1', {
          currentPassword: 'WrongOldPassword',
          newPassword: 'BrandNewSecret123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('returns current user with restaurant info', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Khan',
        phone: '923001234567',
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
        restaurant: {
          id: 'rest-1',
          name: 'Dir Tikka',
        },
      });

      const result = await authService.getMe('user-1');
      expect(result.name).toBe('Khan');
      expect(result.restaurant.name).toBe('Dir Tikka');
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getMe('non-existent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
