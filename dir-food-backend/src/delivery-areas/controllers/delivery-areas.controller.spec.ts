import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryAreasController } from './delivery-areas.controller.js';
import { DeliveryAreasService } from '../services/delivery-areas.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('DeliveryAreasController (unit)', () => {
  let controller: DeliveryAreasController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getDeliveryAreas: vi.fn(),
      updateDeliveryAreas: vi.fn(),
    };

    controller = new DeliveryAreasController(
      mockService as DeliveryAreasService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getDeliveryAreas with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const mockAreas = [{ areaId: 'area-1', name: 'Timergara', isServed: true }];
    mockService.getDeliveryAreas.mockResolvedValue(mockAreas);

    const res = await controller.getDeliveryAreas(mockUser);
    expect(mockService.getDeliveryAreas).toHaveBeenCalledWith('rest-1');
    expect(res).toEqual(mockAreas);
  });

  it('delegates updateDeliveryAreas with user.restaurantId and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { areas: [{ areaId: 'area-1', deliveryFee: 5000 }] };
    mockService.updateDeliveryAreas.mockResolvedValue([]);

    const res = await controller.updateDeliveryAreas(mockUser, dto);
    expect(mockService.updateDeliveryAreas).toHaveBeenCalledWith('rest-1', dto);
    expect(res).toEqual([]);
  });
});
