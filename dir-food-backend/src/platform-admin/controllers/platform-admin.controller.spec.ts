import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminController } from './platform-admin.controller.js';
import { PlatformAdminService } from '../services/platform-admin.service.js';
import { RestaurantStatus, UserRole } from '../../generated/prisma/enums.js';

describe('PlatformAdminController (unit)', () => {
  let controller: PlatformAdminController;
  let mockAdminService: any;

  beforeEach(() => {
    mockAdminService = {
      getPendingRestaurants: vi.fn(),
      getRestaurantDetail: vi.fn(),
      updateRestaurantStatus: vi.fn(),
    };

    controller = new PlatformAdminController(mockAdminService as PlatformAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getPendingRestaurants with default pagination', async () => {
    const mockPending = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    mockAdminService.getPendingRestaurants.mockResolvedValue(mockPending);

    const result = await controller.getPendingRestaurants();
    expect(mockAdminService.getPendingRestaurants).toHaveBeenCalledWith(1, 20);
    expect(result).toEqual(mockPending);
  });

  it('delegates getPendingRestaurants with parsed pagination', async () => {
    mockAdminService.getPendingRestaurants.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });

    await controller.getPendingRestaurants('2', '10');
    expect(mockAdminService.getPendingRestaurants).toHaveBeenCalledWith(2, 10);
  });

  it('delegates getRestaurantDetail with id', async () => {
    const mockDetail = { id: 'rest-1', name: 'Hotel Taj' };
    mockAdminService.getRestaurantDetail.mockResolvedValue(mockDetail);

    const result = await controller.getRestaurantDetail('rest-1');
    expect(mockAdminService.getRestaurantDetail).toHaveBeenCalledWith('rest-1');
    expect(result).toEqual(mockDetail);
  });

  it('delegates updateStatus to adminService', async () => {
    const mockUser = {
      userId: 'admin-1',
      role: UserRole.PLATFORM_ADMIN,
      restaurantId: null,
    };
    const dto = { status: RestaurantStatus.ACTIVE };
    const mockUpdated = { id: 'rest-1', status: RestaurantStatus.ACTIVE };
    mockAdminService.updateRestaurantStatus.mockResolvedValue(mockUpdated);

    const result = await controller.updateStatus('rest-1', dto, mockUser, '127.0.0.1');
    expect(mockAdminService.updateRestaurantStatus).toHaveBeenCalledWith(
      'rest-1',
      dto,
      'admin-1',
      '127.0.0.1',
    );
    expect(result).toEqual(mockUpdated);
  });
});
