import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RestaurantMeController } from './restaurant-me.controller.js';
import { RestaurantsService } from '../services/restaurants.service.js';
import { ManualStatus, UserRole } from '../../generated/prisma/enums.js';

describe('RestaurantMeController (unit)', () => {
  let controller: RestaurantMeController;
  let mockRestaurantsService: any;

  beforeEach(() => {
    mockRestaurantsService = {
      getMyRestaurant: vi.fn(),
      getPublishReadiness: vi.fn(),
      publishRestaurant: vi.fn(),
      updateProfile: vi.fn(),
      updateAvailability: vi.fn(),
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

  it('delegates getPublishReadiness to RestaurantsService with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const mockResult = { isReadyToPublish: true, missingPrerequisites: [] };
    mockRestaurantsService.getPublishReadiness.mockResolvedValue(mockResult);

    const result = await controller.getPublishReadiness(mockUser);
    expect(mockRestaurantsService.getPublishReadiness).toHaveBeenCalledWith('rest-123');
    expect(result).toEqual(mockResult);
  });

  it('delegates publishRestaurant to RestaurantsService with user details and IP', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const mockResult = {
      id: 'rest-123',
      name: 'Timergara Delight',
      status: 'ACTIVE',
    };
    mockRestaurantsService.publishRestaurant.mockResolvedValue(mockResult);

    const result = await controller.publishRestaurant(mockUser, '127.0.0.1');
    expect(mockRestaurantsService.publishRestaurant).toHaveBeenCalledWith(
      'rest-123',
      'user-1',
      '127.0.0.1',
    );
    expect(result).toEqual(mockResult);
  });

  it('delegates updateProfile to RestaurantsService with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const dto = { name: 'Updated Name', contactPhone: '03001234567' };
    const mockResult = { id: 'rest-123', name: 'Updated Name' };
    mockRestaurantsService.updateProfile.mockResolvedValue(mockResult);

    const result = await controller.updateProfile(mockUser, dto, '127.0.0.1');
    expect(mockRestaurantsService.updateProfile).toHaveBeenCalledWith(
      'rest-123',
      dto,
      'user-1',
      '127.0.0.1',
    );
    expect(result).toEqual(mockResult);
  });

  it('delegates updateAvailability to RestaurantsService with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const dto = { manualStatus: ManualStatus.CLOSED, unavailableNote: 'Closed today' };
    const mockResult = { id: 'rest-123', manualStatus: ManualStatus.CLOSED };
    mockRestaurantsService.updateAvailability.mockResolvedValue(mockResult);

    const result = await controller.updateAvailability(mockUser, dto);
    expect(mockRestaurantsService.updateAvailability).toHaveBeenCalledWith('rest-123', dto);
    expect(result).toEqual(mockResult);
  });

  it('delegates uploadImage with validated kind to RestaurantsService', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    const mockFile = { buffer: Buffer.from('img'), size: 100, mimetype: 'image/jpeg' };
    mockRestaurantsService.uploadRestaurantImage = vi.fn().mockResolvedValue({ logoUrl: 'https://images.dirfood.test/logo.jpg' });

    const result = await controller.uploadImage(mockUser, 'logo', mockFile as any);
    expect(mockRestaurantsService.uploadRestaurantImage).toHaveBeenCalledWith('rest-123', 'logo', mockFile);
    expect(result).toEqual({ logoUrl: 'https://images.dirfood.test/logo.jpg' });
  });

  it('rejects uploadImage with invalid kind', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    await expect(controller.uploadImage(mockUser, 'banner', {} as any)).rejects.toThrow('Invalid image kind');
  });

  it('delegates deleteImage to RestaurantsService', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-123',
    };
    mockRestaurantsService.deleteRestaurantImage = vi.fn().mockResolvedValue({ coverUrl: null });

    const result = await controller.deleteImage(mockUser, 'cover');
    expect(mockRestaurantsService.deleteRestaurantImage).toHaveBeenCalledWith('rest-123', 'cover');
    expect(result).toEqual({ coverUrl: null });
  });
});
