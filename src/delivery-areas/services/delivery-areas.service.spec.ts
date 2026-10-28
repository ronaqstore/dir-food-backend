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
      city: {
        findFirst: vi.fn(),
      },
      area: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      restaurantDeliveryArea: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      areaAlias: {
        findUnique: vi.fn().mockResolvedValue(null),
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
        { id: 'area-1', name: 'Timergara', slug: 'timergara', isActive: true, isVerified: true },
        { id: 'area-2', name: 'Balambat', slug: 'balambat', isActive: true, isVerified: true },
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
        isVerified: true,
        deliveryFee: 10000,
        minOrderAmount: null,
      });
      expect(res[1]).toEqual({
        areaId: 'area-2',
        name: 'Balambat',
        slug: 'balambat',
        isServed: false,
        isVerified: true,
        deliveryFee: null,
        minOrderAmount: null,
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
          minOrderAmount: null,
          isActive: true,
        },
        update: {
          deliveryFee: 8000n,
          minOrderAmount: null,
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

  describe('createCustomArea', () => {
    it('creates new custom area in restaurant city and activates it for delivery', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1', cityId: 'city-1' });
      mockPrisma.area.findMany.mockResolvedValue([]);
      mockPrisma.area.create.mockResolvedValue({
        id: 'new-area-id',
        cityId: 'city-1',
        name: 'Qambar',
        slug: 'qambar',
        isActive: true,
        isVerified: false,
      });
      mockPrisma.restaurantDeliveryArea.upsert.mockResolvedValue({
        restaurantId: 'res-1',
        areaId: 'new-area-id',
        deliveryFee: 15000n,
        minOrderAmount: 50000n,
        isActive: true,
      });

      const res = await service.createCustomArea('res-1', {
        name: 'Qambar',
        deliveryFee: 15000,
        minOrderAmount: 50000,
      });

      expect(mockPrisma.area.create).toHaveBeenCalledWith({
        data: {
          cityId: 'city-1',
          name: 'Qambar',
          slug: 'qambar',
          isActive: true,
          isVerified: false,
          isCustomCreated: true,
        },
      });
      expect(mockPrisma.restaurantDeliveryArea.upsert).toHaveBeenCalledWith({
        where: {
          restaurantId_areaId: {
            restaurantId: 'res-1',
            areaId: 'new-area-id',
          },
        },
        create: {
          restaurantId: 'res-1',
          areaId: 'new-area-id',
          deliveryFee: 15000n,
          minOrderAmount: 50000n,
          isActive: true,
        },
        update: {
          deliveryFee: 15000n,
          minOrderAmount: 50000n,
          isActive: true,
        },
      });
      expect(res).toEqual({
        areaId: 'new-area-id',
        name: 'Qambar',
        slug: 'qambar',
        isServed: true,
        isVerified: false,
        deliveryFee: 15000,
        minOrderAmount: 50000,
      });
    });

    it('re-uses existing area if already exists in this city', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1', cityId: 'city-1' });
      mockPrisma.area.findMany.mockResolvedValue([
        {
          id: 'existing-area-id',
          cityId: 'city-1',
          name: 'Qambar',
          slug: 'qambar',
          isActive: true,
          isVerified: true,
        },
      ]);
      mockPrisma.restaurantDeliveryArea.upsert.mockResolvedValue({
        restaurantId: 'res-1',
        areaId: 'existing-area-id',
        deliveryFee: null,
        minOrderAmount: null,
        isActive: true,
      });

      const res = await service.createCustomArea('res-1', {
        name: 'Qambar',
      });

      expect(mockPrisma.area.create).not.toHaveBeenCalled();
      expect(res.areaId).toBe('existing-area-id');
      expect(res.isVerified).toBe(true);
      expect(res.deliveryFee).toBeNull();
    });

    it('re-uses existing area if spaces or hyphens differ (fuzzy match)', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1', cityId: 'city-1' });
      mockPrisma.area.findMany.mockResolvedValue([
        {
          id: 'existing-fizagat-id',
          cityId: 'city-1',
          name: 'Fizagat',
          slug: 'fizagat',
          isActive: true,
          isVerified: true,
        },
      ]);
      mockPrisma.restaurantDeliveryArea.upsert.mockResolvedValue({
        restaurantId: 'res-1',
        areaId: 'existing-fizagat-id',
        deliveryFee: null,
        minOrderAmount: null,
        isActive: true,
      });

      const res = await service.createCustomArea('res-1', {
        name: 'fiza gat',
      });

      expect(mockPrisma.area.create).not.toHaveBeenCalled();
      expect(res.areaId).toBe('existing-fizagat-id');
      expect(res.isVerified).toBe(true);
      expect(res.deliveryFee).toBeNull();
    });

    it('throws BadRequestException if name is empty', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1', cityId: 'city-1' });
      await expect(service.createCustomArea('res-1', { name: '   ' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
