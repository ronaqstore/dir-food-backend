import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryAreasService } from './delivery-areas.service.js';

describe('DeliveryAreasService (unit)', () => {
  let service: DeliveryAreasService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      area: {
        findMany: vi.fn(),
      },
      restaurantDeliveryArea: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    service = new DeliveryAreasService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDeliveryAreas', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getDeliveryAreas('res-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('merges master areas with restaurant configuration', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.area.findMany.mockResolvedValue([
        { id: 'area-1', name: 'Timergara', slug: 'timergara', isActive: true },
        { id: 'area-2', name: 'Balambat', slug: 'balambat', isActive: true },
      ]);
      mockPrisma.restaurantDeliveryArea.findMany.mockResolvedValue([
        { areaId: 'area-1', deliveryFee: 10000n, isActive: true },
      ]);

      const res = await service.getDeliveryAreas('res-1');
      expect(res).toHaveLength(2);
      expect(res[0]).toEqual({
        areaId: 'area-1',
        name: 'Timergara',
        slug: 'timergara',
        isServed: true,
        deliveryFee: 10000,
      });
      expect(res[1]).toEqual({
        areaId: 'area-2',
        name: 'Balambat',
        slug: 'balambat',
        isServed: false,
        deliveryFee: null,
      });
    });
  });

  describe('updateDeliveryAreas', () => {
    it('throws BadRequestException if any areaId is invalid or inactive', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.area.findMany.mockResolvedValue([{ id: 'area-1' }]);

      const dto = {
        areas: [
          { areaId: 'area-1', deliveryFee: 5000 },
          { areaId: 'area-nonexistent', deliveryFee: null },
        ],
      };

      await expect(
        service.updateDeliveryAreas('res-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts served areas and deactivates omitted areas in transaction', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.area.findMany.mockResolvedValue([{ id: 'area-1' }]);
      mockPrisma.restaurantDeliveryArea.findMany.mockResolvedValue([]);

      const dto = {
        areas: [{ areaId: 'area-1', deliveryFee: 8000 }],
      };

      await service.updateDeliveryAreas('res-1', dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.restaurantDeliveryArea.upsert).toHaveBeenCalledWith({
        where: {
          restaurantId_areaId: {
            restaurantId: 'res-1',
            areaId: 'area-1',
          },
        },
        create: {
          restaurantId: 'res-1',
          areaId: 'area-1',
          deliveryFee: 8000n,
          isActive: true,
        },
        update: {
          deliveryFee: 8000n,
          isActive: true,
        },
      });
      expect(mockPrisma.restaurantDeliveryArea.updateMany).toHaveBeenCalledWith({
        where: {
          restaurantId: 'res-1',
          areaId: { notIn: ['area-1'] },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });
  });
});
