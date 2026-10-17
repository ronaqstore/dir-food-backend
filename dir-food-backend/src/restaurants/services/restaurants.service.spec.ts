import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service.js';

describe('RestaurantsService (unit)', () => {
  let service: RestaurantsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
    };

    service = new RestaurantsService(mockPrisma);
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
});
