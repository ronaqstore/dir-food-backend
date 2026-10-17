import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, UnauthorizedException, HttpException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { RestaurantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';

describe('AuthService (unit)', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockConfig = {
      jwtSecret: 'test-super-secret-jwt-key-min-16',
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(mockPrisma, mockConfig, mockAudit);
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
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'RESTAURANT_SELF_REGISTERED',
      }));
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

    it('should roll back if database transaction throws', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockRejectedValue(new Error('DB transaction error'));

      await expect(
        authService.registerRestaurant({
          restaurantName: 'Dir Tikka',
          ownerName: 'Khan',
          phone: '03001234567',
          password: 'Password123!',
        }),
      ).rejects.toThrow('DB transaction error');
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials and return token and safe profile', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
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

      const result = await authService.login({
        phone: '03001234567',
        password: 'Secret123!',
      });

      expect(result.token).toBeDefined();
      expect(result.user.name).toBe('Khan');
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject wrong password and increment failedLoginCount', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '923001234567',
        passwordHash,
        failedLoginCount: 1,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
      });

      await expect(
        authService.login({
          phone: '03001234567',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          failedLoginCount: 2,
          lockedUntil: null,
        },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '923001234567',
        passwordHash,
        failedLoginCount: 4,
        lockedUntil: null,
        status: UserStatus.ACTIVE,
      });

      await expect(
        authService.login({
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

    it('should allow login for restaurant owner with expired subscription', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago

      mockPrisma.user.findUnique.mockResolvedValue({
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
          status: RestaurantStatus.ACTIVE,
          subscriptionEndsAt: expiredDate,
        },
      });

      const result = await authService.login({
        phone: '03001234567',
        password: 'Secret123!',
      });

      expect(result.token).toBeDefined();
      expect(result.restaurant?.subscriptionStatus).toBe('EXPIRED');
    });
  });
});
