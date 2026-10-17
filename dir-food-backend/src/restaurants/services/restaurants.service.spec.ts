import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service.js';
import { ManualStatus } from '../../generated/prisma/enums.js';

describe('RestaurantsService (unit)', () => {
  let service: RestaurantsService;
  let mockPrisma: any;
  let mockAudit: any;

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

    service = new RestaurantsService(mockPrisma, mockAudit);
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
});
