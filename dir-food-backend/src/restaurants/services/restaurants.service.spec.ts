import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service.js';
import { ManualStatus, RestaurantStatus } from '../../generated/prisma/enums.js';

describe('RestaurantsService (unit)', () => {
  let service: RestaurantsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockR2: any;
  let mockImageProcessor: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockR2 = {
      put: vi.fn(),
      deleteByUrl: vi.fn().mockResolvedValue(undefined),
    };

    mockImageProcessor = {
      process: vi.fn(),
    };

    service = new RestaurantsService(
      mockPrisma,
      mockAudit,
      mockR2,
      mockImageProcessor,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws ForbiddenException when restaurantId is missing', async () => {
    await expect(service.getMyRestaurant(null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when restaurant is not found', async () => {
    mockPrisma.restaurant.findUnique.mockResolvedValue(null);

    await expect(
      service.getMyRestaurant('0192aaaa-0000-7000-8000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns restaurant data when found', async () => {
    const mockRestaurant = {
      id: '0192aaaa-0000-7000-8000-000000000001',
      name: 'Test Kitchen',
      hours: [],
      deliveryAreas: [],
      _count: { items: 5, categories: 2 },
    };
    mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

    const result = await service.getMyRestaurant('0192aaaa-0000-7000-8000-000000000001');
    expect(result).toEqual(mockRestaurant);
  });

  describe('updateProfile', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('res-1', { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates profile and logs audit event when WhatsApp number changes', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        whatsappNumber: '923001111111',
      });
      mockPrisma.restaurant.update.mockResolvedValue({
        id: 'res-1',
        name: 'New Name',
        whatsappNumber: '923002222222',
      });

      const res = await service.updateProfile(
        'res-1',
        { name: 'New Name', whatsappNumber: '03002222222' },
        'user-1',
        '127.0.0.1',
      );

      expect(res.name).toBe('New Name');
      expect(mockAudit.log).toHaveBeenCalledWith({
        actorUserId: 'user-1',
        restaurantId: 'res-1',
        action: 'RESTAURANT_WHATSAPP_CHANGED',
        entityType: 'restaurant',
        entityId: 'res-1',
        details: {
          oldWhatsapp: '923001111111',
          newWhatsapp: '923002222222',
        },
        ipAddress: '127.0.0.1',
      });
    });

    it('updates profile without audit log if WhatsApp number does not change', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        whatsappNumber: '923001111111',
      });
      mockPrisma.restaurant.update.mockResolvedValue({
        id: 'res-1',
        name: 'Updated Name',
        whatsappNumber: '923001111111',
      });

      await service.updateProfile('res-1', { name: 'Updated Name' });

      expect(mockAudit.log).not.toHaveBeenCalled();
    });
  });

  describe('updateAvailability', () => {
    it('updates manual status and unavailable note', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.restaurant.update.mockResolvedValue({
        id: 'res-1',
        manualStatus: ManualStatus.CLOSED,
        unavailableNote: 'Renovating kitchen',
      });

      const res = await service.updateAvailability('res-1', {
        manualStatus: ManualStatus.CLOSED,
        unavailableNote: 'Renovating kitchen',
      });

      expect(res.manualStatus).toBe(ManualStatus.CLOSED);
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          manualStatus: ManualStatus.CLOSED,
          unavailableNote: 'Renovating kitchen',
        },
      });
    });
  });

  describe('uploadRestaurantImage', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadRestaurantImage('res-1', 'logo', {
          buffer: Buffer.from('test'),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('processes image, uploads to R2, updates database, and cleans up old image', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        logoUrl: 'https://images.dirfood.test/old-logo.jpg',
      });
      mockImageProcessor.process.mockResolvedValue({
        buffer: Buffer.from('processed'),
        ext: 'jpg',
        contentType: 'image/jpeg',
      });
      mockR2.put.mockResolvedValue(
        'https://images.dirfood.test/restaurants/res-1/profile/logo-new.jpg',
      );
      mockPrisma.restaurant.update.mockResolvedValue({
        id: 'res-1',
        logoUrl:
          'https://images.dirfood.test/restaurants/res-1/profile/logo-new.jpg',
      });

      const res = await service.uploadRestaurantImage('res-1', 'logo', {
        buffer: Buffer.from('raw'),
      });

      expect(res.logoUrl).toContain('logo-new.jpg');
      expect(mockR2.put).toHaveBeenCalled();
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: {
          logoUrl:
            'https://images.dirfood.test/restaurants/res-1/profile/logo-new.jpg',
        },
      });
      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/old-logo.jpg',
        'res-1',
      );
    });

    it('cleans up newly uploaded R2 object if database update fails', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        logoUrl: null,
      });
      mockImageProcessor.process.mockResolvedValue({
        buffer: Buffer.from('processed'),
        ext: 'jpg',
        contentType: 'image/jpeg',
      });
      mockR2.put.mockResolvedValue(
        'https://images.dirfood.test/restaurants/res-1/profile/logo-new.jpg',
      );
      mockPrisma.restaurant.update.mockRejectedValue(
        new Error('Database disk full'),
      );

      await expect(
        service.uploadRestaurantImage('res-1', 'logo', {
          buffer: Buffer.from('raw'),
        }),
      ).rejects.toThrow('Database disk full');

      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/restaurants/res-1/profile/logo-new.jpg',
        'res-1',
      );
    });
  });

  describe('deleteRestaurantImage', () => {
    it('sets image column to null and deletes object from R2', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        coverUrl: 'https://images.dirfood.test/restaurants/res-1/profile/cover-123.jpg',
      });
      mockPrisma.restaurant.update.mockResolvedValue({
        id: 'res-1',
        coverUrl: null,
      });

      const res = await service.deleteRestaurantImage('res-1', 'cover');

      expect(res.coverUrl).toBeNull();
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { coverUrl: null },
      });
      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/restaurants/res-1/profile/cover-123.jpg',
        'res-1',
      );
    });
  });

  describe('getPublishReadiness', () => {
    it('throws ForbiddenException when restaurantId is missing', async () => {
      await expect(service.getPublishReadiness(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when restaurant is not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      await expect(
        service.getPublishReadiness('res-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns isReadyToPublish: false with missing prerequisites when incomplete', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        whatsappNumber: null,
        hours: [],
        _count: { items: 0, deliveryAreas: 0 },
      });

      const result = await service.getPublishReadiness('res-1');
      expect(result.isReadyToPublish).toBe(false);
      expect(result.missingPrerequisites).toHaveLength(4);
      expect(result.missingPrerequisites).toContain(
        'A valid WhatsApp contact number is required',
      );
      expect(result.missingPrerequisites).toContain(
        'Configured opening hours are required',
      );
      expect(result.missingPrerequisites).toContain(
        'At least one active menu item is required',
      );
      expect(result.missingPrerequisites).toContain(
        'At least one active delivery area is required',
      );
    });

    it('returns isReadyToPublish: true when all 4 prerequisites are met', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        whatsappNumber: '923001234567',
        hours: [{ id: 'hour-1' }],
        _count: { items: 3, deliveryAreas: 1 },
      });

      const result = await service.getPublishReadiness('res-1');
      expect(result.isReadyToPublish).toBe(true);
      expect(result.missingPrerequisites).toEqual([]);
    });
  });

  describe('publishRestaurant', () => {
    it('throws ForbiddenException when restaurantId is missing', async () => {
      await expect(service.publishRestaurant(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when restaurant is not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);
      await expect(
        service.publishRestaurant('res-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when restaurant is already active', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        status: RestaurantStatus.ACTIVE,
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      });

      await expect(
        service.publishRestaurant('res-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ForbiddenException when restaurant is suspended or deactivated', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        status: RestaurantStatus.SUSPENDED,
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      });

      await expect(
        service.publishRestaurant('res-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws UnprocessableEntityException when prerequisites are missing', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-1',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [],
        items: [],
        deliveryAreas: [],
      });

      await expect(
        service.publishRestaurant('res-1'),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('successfully publishes restaurant, initializes 30-day trial, and writes audit log', async () => {
      const mockRestaurant = {
        id: 'res-1',
        name: 'Khyber Shinwari',
        slug: 'khyber-shinwari',
        status: RestaurantStatus.PENDING,
        whatsappNumber: '923001234567',
        hours: [{ id: 'hour-1' }],
        items: [{ id: 'item-1' }],
        deliveryAreas: [{ id: 'area-1' }],
      };
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      const mockUpdated = {
        ...mockRestaurant,
        status: RestaurantStatus.ACTIVE,
        statusChangedAt: new Date(),
        trialStartedAt: new Date(),
        subscriptionEndsAt: new Date(Date.now() + 30 * 86400000),
      };
      mockPrisma.restaurant.update.mockResolvedValue(mockUpdated);

      const result = await service.publishRestaurant(
        'res-1',
        'user-owner-1',
        '127.0.0.1',
      );

      expect(result.status).toBe(RestaurantStatus.ACTIVE);
      expect(result.trialStartedAt).toBeDefined();
      expect(result.subscriptionEndsAt).toBeDefined();
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: expect.objectContaining({
            status: RestaurantStatus.ACTIVE,
          }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESTAURANT_SELF_PUBLISHED',
          actorUserId: 'user-owner-1',
          restaurantId: 'res-1',
          entityType: 'restaurant',
          entityId: 'res-1',
        }),
      );
    });
  });
});
