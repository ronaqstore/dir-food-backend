import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicRestaurantsController } from './public-restaurants.controller.js';
import type { PublicRestaurantsService } from '../services/public-restaurants.service.js';
import type { QueryPublicRestaurantsDto } from '../dto/query-public-restaurants.dto.js';

describe('PublicRestaurantsController', () => {
  let controller: PublicRestaurantsController;
  let mockService: {
    getRestaurants: ReturnType<typeof vi.fn>;
    getRestaurantBySlug: ReturnType<typeof vi.fn>;
    getRestaurantMenu: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockService = {
      getRestaurants: vi.fn(),
      getRestaurantBySlug: vi.fn(),
      getRestaurantMenu: vi.fn(),
    };
    controller = new PublicRestaurantsController(
      mockService as unknown as PublicRestaurantsService,
    );
  });

  it('delegates getRestaurants to PublicRestaurantsService with query', async () => {
    const query: QueryPublicRestaurantsDto = { q: 'Al-Noor', page: 1, limit: 10 };
    const mockResponse = { data: [], meta: { page: 1, limit: 10, total: 0 } };
    mockService.getRestaurants.mockResolvedValue(mockResponse);

    const result = await controller.getRestaurants(query);

    expect(mockService.getRestaurants).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockResponse);
  });

  it('delegates getRestaurantBySlug to PublicRestaurantsService', async () => {
    const mockProfile = {
      slug: 'hotel-al-noor',
      name: 'Hotel Al-Noor',
    };
    mockService.getRestaurantBySlug.mockResolvedValue(mockProfile);

    const result = await controller.getRestaurantBySlug('hotel-al-noor');

    expect(mockService.getRestaurantBySlug).toHaveBeenCalledWith('hotel-al-noor');
    expect(result).toEqual(mockProfile);
  });

  it('delegates getRestaurantMenu to PublicRestaurantsService', async () => {
    const mockMenu = { categories: [] };
    mockService.getRestaurantMenu.mockResolvedValue(mockMenu);

    const result = await controller.getRestaurantMenu('hotel-al-noor');

    expect(mockService.getRestaurantMenu).toHaveBeenCalledWith('hotel-al-noor');
    expect(result).toEqual(mockMenu);
  });
});

