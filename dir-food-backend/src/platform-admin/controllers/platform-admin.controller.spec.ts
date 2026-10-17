import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminController } from './platform-admin.controller.js';
import { PlatformAdminService } from '../services/platform-admin.service.js';
import { RestaurantStatus, UserRole } from '../../generated/prisma/enums.js';

describe('PlatformAdminController (unit)', () => {
  let controller: PlatformAdminController;
  let mockAdminService: any;

  beforeEach(() => {
    mockAdminService = {
      listRestaurants: vi.fn(),
      createRestaurant: vi.fn(),
      getPendingRestaurants: vi.fn(),
      getRestaurantDetail: vi.fn(),
      updateRestaurant: vi.fn(),
      updateRestaurantStatus: vi.fn(),
      extendSubscription: vi.fn(),
      shortenSubscription: vi.fn(),
      changeSlug: vi.fn(),
      issueSetupLink: vi.fn(),
    };

    controller = new PlatformAdminController(mockAdminService as PlatformAdminService);
  });

  const mockAdminUser = {
    userId: 'admin-1',
    role: UserRole.PLATFORM_ADMIN,
    restaurantId: null,
  };

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates listRestaurants to adminService', async () => {
    const query = { page: 1, limit: 10, q: 'Al-Noor' };
    const mockRes = { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    mockAdminService.listRestaurants.mockResolvedValue(mockRes);

    const result = await controller.listRestaurants(query);
    expect(mockAdminService.listRestaurants).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockRes);
  });

  it('delegates createRestaurant to adminService', async () => {
    const dto = {
      name: 'New Rest',
      contactPhone: '03001234567',
      owner: { name: 'Owner', phone: '03007654321' },
    };
    const mockCreated = { restaurant: { id: 'r1' } };
    mockAdminService.createRestaurant.mockResolvedValue(mockCreated);

    const result = await controller.createRestaurant(dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.createRestaurant).toHaveBeenCalledWith(dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockCreated);
  });

  it('delegates getPendingRestaurants with default pagination', async () => {
    const mockPending = { data: [], meta: { total: 0, page: 1, limit: 20 } };
    mockAdminService.getPendingRestaurants.mockResolvedValue(mockPending);

    const result = await controller.getPendingRestaurants();
    expect(mockAdminService.getPendingRestaurants).toHaveBeenCalledWith(1, 20);
    expect(result).toEqual(mockPending);
  });

  it('delegates getPendingRestaurants with parsed pagination', async () => {
    mockAdminService.getPendingRestaurants.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 10 } });

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

  it('delegates updateRestaurant to adminService', async () => {
    const dto = { name: 'Updated Name', adminNotes: 'VIP partner' };
    const mockRes = { id: 'rest-1', name: 'Updated Name' };
    mockAdminService.updateRestaurant.mockResolvedValue(mockRes);

    const result = await controller.updateRestaurant('rest-1', dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.updateRestaurant).toHaveBeenCalledWith('rest-1', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockRes);
  });

  it('delegates updateStatus to adminService', async () => {
    const dto = { status: RestaurantStatus.ACTIVE };
    const mockUpdated = { id: 'rest-1', status: RestaurantStatus.ACTIVE };
    mockAdminService.updateRestaurantStatus.mockResolvedValue(mockUpdated);

    const result = await controller.updateStatus('rest-1', dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.updateRestaurantStatus).toHaveBeenCalledWith(
      'rest-1',
      dto,
      'admin-1',
      '127.0.0.1',
    );
    expect(result).toEqual(mockUpdated);
  });

  it('delegates extendSubscription to adminService', async () => {
    const dto = { addDays: 30 };
    const mockRes = { restaurantId: 'rest-1', subscriptionEndsAt: new Date() };
    mockAdminService.extendSubscription.mockResolvedValue(mockRes);

    const result = await controller.extendSubscription('rest-1', dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.extendSubscription).toHaveBeenCalledWith('rest-1', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockRes);
  });

  it('delegates shortenSubscription to adminService', async () => {
    const dto = { subscriptionEndsAt: new Date().toISOString(), reason: 'Refund', confirm: true };
    const mockRes = { restaurantId: 'rest-1', subscriptionEndsAt: new Date() };
    mockAdminService.shortenSubscription.mockResolvedValue(mockRes);

    const result = await controller.shortenSubscription('rest-1', dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.shortenSubscription).toHaveBeenCalledWith('rest-1', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockRes);
  });

  it('delegates changeSlug to adminService', async () => {
    const dto = { slug: 'new-valid-slug' };
    const mockRes = { id: 'rest-1', slug: 'new-valid-slug' };
    mockAdminService.changeSlug.mockResolvedValue(mockRes);

    const result = await controller.changeSlug('rest-1', dto, mockAdminUser, '127.0.0.1');
    expect(mockAdminService.changeSlug).toHaveBeenCalledWith('rest-1', dto, 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockRes);
  });

  it('delegates issueSetupLink to adminService', async () => {
    const mockRes = { setupUrl: 'https://example.com/setup?token=123' };
    mockAdminService.issueSetupLink.mockResolvedValue(mockRes);

    const result = await controller.issueSetupLink('rest-1', mockAdminUser, '127.0.0.1');
    expect(mockAdminService.issueSetupLink).toHaveBeenCalledWith('rest-1', 'admin-1', '127.0.0.1');
    expect(result).toEqual(mockRes);
  });
});
