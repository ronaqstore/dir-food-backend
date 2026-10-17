import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UnprocessableEntityException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service.js';
import { RestaurantStatus } from '../../generated/prisma/enums.js';

describe('PlatformAdminService (unit)', () => {
  let adminService: PlatformAdminService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockAuth: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    mockAuth = {
      buildSetupLink: vi.fn().mockResolvedValue({
        setupUrl: 'https://example.com/setup?token=xyz',
        expiresAt: new Date(),
      }),
      issuePasswordSetupLink: vi.fn().mockResolvedValue({
        setupUrl: 'https://example.com/setup?token=xyz',
        expiresAt: new Date(),
        replacedPreviousLink: false,
      }),
    };

    adminService = new PlatformAdminService(mockPrisma, mockAudit, mockAuth);
  });

  describe('listRestaurants', () => {
    it('returns paginated restaurants matching query filters', async () => {
      mockPrisma.restaurant.count.mockResolvedValue(1);
      mockPrisma.restaurant.findMany.mockResolvedValue([
        {
          id: 'r1',
          name: 'Hotel Al-Noor',
          users: [{ id: 'u1', name: 'Owner' }],
          _count: { items: 5, deliveryAreas: 2, hours: 7 },
        },
      ]);

      const res = await adminService.listRestaurants({ page: 1, limit: 10, status: RestaurantStatus.ACTIVE, q: 'Al-Noor' });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.meta.totalPages).toBe(1);
    });
  });

  describe('createRestaurant', () => {
    it('creates restaurant and owner atomically, generates setup link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // Slug check
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      mockPrisma.restaurant.create.mockResolvedValue({ id: 'r1', name: 'Al-Noor', slug: 'al-noor' });
      mockPrisma.user.create.mockResolvedValue({ id: 'u1', name: 'Ahmad', phone: '923001234567' });

      const dto = {
        name: 'Al-Noor',
        contactPhone: '03001234567',
        whatsappNumber: '03007654321',
        owner: { name: 'Ahmad', phone: '03001234567' },
      };

      const res = await adminService.createRestaurant(dto, 'admin-1', '127.0.0.1');
      expect(res.restaurant.id).toBe('r1');
      expect(res.owner.name).toBe('Ahmad');
      expect(res.setupLink).toBeDefined();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTAURANT_CREATED_BY_ADMIN' }),
      );
    });

    it('rejects if owner phone is invalid', async () => {
      const dto = {
        name: 'Al-Noor',
        contactPhone: '03001234567',
        owner: { name: 'Ahmad', phone: '12345' },
      };
      await expect(adminService.createRestaurant(dto, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects if owner phone already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      const dto = {
        name: 'Al-Noor',
        contactPhone: '03001234567',
        owner: { name: 'Ahmad', phone: '03001234567' },
      };
      await expect(adminService.createRestaurant(dto, 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getRestaurantDetail', () => {
    it('returns detail and completeness checklist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Al-Noor',
        whatsappNumber: '923001234567',
        hours: [{ id: 'h1' }],
        deliveryAreas: [],
        _count: { items: 2, categories: 1, deliveryAreas: 0, hours: 1 },
      });

      const res = await adminService.getRestaurantDetail('r1');
      expect(res.completeness.isReadyForApproval).toBe(false);
      expect(res.completeness.missingPrerequisites).toContain('At least one active delivery area is required');
    });

    it('throws 404 if restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      await expect(adminService.getRestaurantDetail('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRestaurant', () => {
    it('updates restaurant support fields and logs audit', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        name: 'Al-Noor',
        contactPhone: '923001234567',
        whatsappNumber: '923007654321',
      });
      mockPrisma.restaurant.update.mockResolvedValue({ id: 'r1', name: 'Al-Noor Updated' });

      const res = await adminService.updateRestaurant('r1', { name: 'Al-Noor Updated', adminNotes: 'Good' }, 'admin-1');
      expect(res.id).toBe('r1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTAURANT_UPDATED_BY_ADMIN' }),
      );
    });
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

    it('should reject reactivation on DEACTIVATED restaurant', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'rest-1',
        status: RestaurantStatus.DEACTIVATED,
      });

      await expect(
        adminService.updateRestaurantStatus(
          'rest-1',
          { status: RestaurantStatus.ACTIVE },
          'admin-id',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('extendSubscription', () => {
    it('extends subscription by addDays from current subscription end', async () => {
      const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureEnd,
      });
      mockPrisma.restaurant.update.mockImplementation(async ({ data }: any) => ({
        id: 'r1',
        ...data,
      }));

      const res = await adminService.extendSubscription('r1', { addDays: 30 }, 'admin-1');
      expect(res.subscriptionEndsAt.getTime()).toBeGreaterThan(futureEnd.getTime());
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTAURANT_SUBSCRIPTION_EXTENDED' }),
      );
    });

    it('rejects if restaurant has never been approved', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        status: RestaurantStatus.PENDING,
        trialStartedAt: null,
      });

      await expect(
        adminService.extendSubscription('r1', { addDays: 30 }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects if restaurant is deactivated', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        status: RestaurantStatus.DEACTIVATED,
        trialStartedAt: new Date(),
      });

      await expect(
        adminService.extendSubscription('r1', { addDays: 30 }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('shortenSubscription', () => {
    it('shortens subscription date with reason and confirm=true', async () => {
      const trialStart = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      const currentEnd = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
      const newEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: trialStart,
        subscriptionEndsAt: currentEnd,
      });
      mockPrisma.restaurant.update.mockImplementation(async ({ data }: any) => ({
        id: 'r1',
        ...data,
      }));

      const res = await adminService.shortenSubscription(
        'r1',
        { subscriptionEndsAt: newEnd.toISOString(), reason: 'Mistake on duration', confirm: true },
        'admin-1',
      );

      expect(res.subscriptionEndsAt.toISOString()).toBe(newEnd.toISOString());
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTAURANT_SUBSCRIPTION_SHORTENED' }),
      );
    });

    it('rejects if confirm is false or reason missing', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: new Date(Date.now() + 100000),
      });

      await expect(
        adminService.shortenSubscription(
          'r1',
          { subscriptionEndsAt: new Date().toISOString(), reason: '', confirm: false },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeSlug', () => {
    it('changes slug if unique and valid', async () => {
      mockPrisma.restaurant.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id) return { id: 'r1', slug: 'old-slug' };
        if (where.slug === 'new-slug') return null;
        return null;
      });
      mockPrisma.restaurant.update.mockResolvedValue({ id: 'r1', slug: 'new-slug' });

      const res = await adminService.changeSlug('r1', { slug: 'new-slug' }, 'admin-1');
      expect(res.slug).toBe('new-slug');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTAURANT_SLUG_CHANGED' }),
      );
    });

    it('rejects reserved slugs', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'r1', slug: 'old-slug' });
      await expect(adminService.changeSlug('r1', { slug: 'admin' }, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects slug already taken by another restaurant', async () => {
      mockPrisma.restaurant.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id) return { id: 'r1', slug: 'old-slug' };
        if (where.slug === 'taken-slug') return { id: 'r2', slug: 'taken-slug' };
        return null;
      });

      await expect(adminService.changeSlug('r1', { slug: 'taken-slug' }, 'admin-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('issueSetupLink', () => {
    it('issues setup link for owner user', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'r1',
        users: [{ id: 'u1', phone: '923001234567' }],
      });

      const res = await adminService.issueSetupLink('r1', 'admin-1');
      expect(res.setupUrl).toBeDefined();
      expect(mockAuth.issuePasswordSetupLink).toHaveBeenCalledWith('u1');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PASSWORD_SETUP_LINK_ISSUED' }),
      );
    });
  });
});
