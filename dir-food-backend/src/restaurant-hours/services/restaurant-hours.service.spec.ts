import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RestaurantHoursService } from './restaurant-hours.service.js';

describe('RestaurantHoursService (unit)', () => {
  let service: RestaurantHoursService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      restaurantHours: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
    };

    service = new RestaurantHoursService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHours', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getHours('res-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns grouped schedule for all 7 days', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.restaurantHours.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          openTime: new Date('1970-01-01T10:00:00.000Z'),
          closeTime: new Date('1970-01-01T22:00:00.000Z'),
        },
      ]);

      const res = await service.getHours('res-1');
      expect(res).toHaveLength(7);
      const monday = res.find((d) => d.dayOfWeek === 1);
      expect(monday?.ranges).toEqual([{ openTime: '10:00', closeTime: '22:00' }]);
    });
  });

  describe('updateHours', () => {
    it('throws NotFoundException if restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateHours('res-1', { days: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('replaces weekly hours transactionally', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.restaurantHours.findMany.mockResolvedValue([]);

      const dto = {
        days: [
          {
            dayOfWeek: 0,
            ranges: [{ openTime: '09:00', closeTime: '21:00' }],
          },
        ],
      };

      await service.updateHours('res-1', dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.restaurantHours.deleteMany).toHaveBeenCalledWith({
        where: { restaurantId: 'res-1' },
      });
      expect(mockPrisma.restaurantHours.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            restaurantId: 'res-1',
            dayOfWeek: 0,
          }),
        ],
      });
    });
  });
});
