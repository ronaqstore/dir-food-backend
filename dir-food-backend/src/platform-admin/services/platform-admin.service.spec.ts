import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnprocessableEntityException, ConflictException } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service.js';
import { RestaurantStatus } from '../../generated/prisma/enums.js';

describe('PlatformAdminService (unit)', () => {
  let adminService: PlatformAdminService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    adminService = new PlatformAdminService(mockPrisma, mockAudit);
  });

  describe('updateRestaurantStatus (approval)', () => {
    it('should approve restaurant and start 30-day trial when all 4 prerequisites are met', async () => {
      const pendingRestaurant = {
        id: 'rest-1',
        name: 'Dir Grill',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [
          {
            id: 'hour-1',
            dayOfWeek: 1,
            openTime: new Date(),
            closeTime: new Date(),
          },
        ],
        items: [{ id: 'item-1', name: 'Karahi', isActive: true }],
        deliveryAreas: [{ id: 'area-1', areaId: 'a-1', isActive: true }],
      };

      mockPrisma.restaurant.findUnique.mockResolvedValue(pendingRestaurant);
      mockPrisma.restaurant.update.mockImplementation(async ({ data }: any) => {
        return { ...pendingRestaurant, ...data };
      });

      const result = await adminService.updateRestaurantStatus(
        'rest-1',
        { status: RestaurantStatus.ACTIVE },
        'admin-user-id',
      );

      expect(result.status).toBe(RestaurantStatus.ACTIVE);
      expect(result.trialStartedAt).toBeInstanceOf(Date);
      expect(result.subscriptionEndsAt).toBeInstanceOf(Date);

      // Verify trial ends roughly 30 days after start
      const diffDays = Math.round(
        (result.subscriptionEndsAt.getTime() -
          result.trialStartedAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(30);

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_APPROVED',
          actorUserId: 'admin-user-id',
          restaurantId: 'rest-1',
        }),
      );
    });

    it('should reject approval if WhatsApp number is missing', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.PENDING,
        whatsappNumber: null,
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject approval if opening hours are not configured', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject approval if no active menu items exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [{ id: 'hour-1' }],
        items: [],
        deliveryAreas: [{ id: 'area-1' }],
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject approval if no active delivery areas are configured', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [],
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should reject reactivation or modification of DEACTIVATED restaurants', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.DEACTIVATED,
        hours: [],
        items: [],
        deliveryAreas: [],
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reactivate a SUSPENDED restaurant without modifying subscription dates', async () => {
      const existingEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const suspendedRestaurant = {
        id: 'rest-1',
        status: RestaurantStatus.SUSPENDED,
        subscriptionEndsAt: existingEnd,
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      };

      mockPrisma.restaurant.findUnique.mockResolvedValue(suspendedRestaurant);
      mockPrisma.restaurant.update.mockImplementation(async ({ data }: any) => {
        return { ...suspendedRestaurant, ...data };
      });

      const result = await adminService.updateRestaurantStatus(
        'rest-1',
        { status: RestaurantStatus.ACTIVE, reason: 'Issue resolved' },
        'admin-id',
      );

      expect(result.status).toBe(RestaurantStatus.ACTIVE);
      expect(result.subscriptionEndsAt).toBe(existingEnd); // dates remain untouched!
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_REACTIVATED',
        }),
      );
    });
  });
});
