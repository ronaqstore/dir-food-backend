import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestaurantMeController } from './restaurant-me.controller.js';
import { RestaurantsService } from '../services/restaurants.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('RestaurantMeController (unit)', () => {
  let controller: RestaurantMeController;
  let mockRestaurantsService: any;

  beforeEach(() => {
    mockRestaurantsService = {
      getMyRestaurant: vi.fn(),
    };

    controller = new RestaurantMeController(mockRestaurantsService as RestaurantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getMyRestaurant to RestaurantsService with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const mockResult = { id: 'rest-123', name: 'Timergara Delight' };
    mockRestaurantsService.getMyRestaurant.mockResolvedValue(mockResult);

    const result = await controller.getMyRestaurant(mockUser);
    expect(mockRestaurantsService.getMyRestaurant).toHaveBeenCalledWith('rest-123');
    expect(result).toEqual(mockResult);
  });
});

