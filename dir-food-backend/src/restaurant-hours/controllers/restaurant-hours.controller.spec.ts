import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestaurantHoursController } from './restaurant-hours.controller.js';
import { RestaurantHoursService } from '../services/restaurant-hours.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('RestaurantHoursController (unit)', () => {
  let controller: RestaurantHoursController;
  let mockHoursService: any;

  beforeEach(() => {
    mockHoursService = {
      getHours: vi.fn(),
      updateHours: vi.fn(),
    };

    controller = new RestaurantHoursController(
      mockHoursService as RestaurantHoursService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getHours to service with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const mockSchedule = [{ dayOfWeek: 0, ranges: [] }];
    mockHoursService.getHours.mockResolvedValue(mockSchedule);

    const res = await controller.getHours(mockUser);
    expect(mockHoursService.getHours).toHaveBeenCalledWith('rest-1');
    expect(res).toEqual(mockSchedule);
  });

  it('delegates updateHours to service with user.restaurantId and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { days: [{ dayOfWeek: 1, ranges: [] }] };
    mockHoursService.updateHours.mockResolvedValue(dto.days);

    const res = await controller.updateHours(mockUser, dto);
    expect(mockHoursService.updateHours).toHaveBeenCalledWith('rest-1', dto);
    expect(res).toEqual(dto.days);
  });
});
