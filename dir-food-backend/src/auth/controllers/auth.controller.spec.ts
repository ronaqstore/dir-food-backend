import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { UserRole, UserStatus, RestaurantStatus } from '../../generated/prisma/enums.js';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockResponse: any;

  beforeEach(() => {
    mockAuthService = {
      registerRestaurant: vi.fn(),
      login: vi.fn(),
      getMe: vi.fn(),
    };

    mockResponse = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    };

    controller = new AuthController(mockAuthService as AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates register to AuthService', async () => {
    const dto = {
      restaurantName: 'Test Diner',
      ownerName: 'Owner Khan',
      phone: '03001234567',
      password: 'Password123!',
    };
    const mockCreated = {
      user: {
        id: 'u-1',
        name: 'Owner Khan',
        phone: '923001234567',
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
      },
      restaurant: {
        id: 'r-1',
        name: 'Test Diner',
        slug: 'test-diner',
        status: RestaurantStatus.PENDING,
      },
    };
    mockAuthService.registerRestaurant.mockResolvedValue(mockCreated);

    const result = await controller.register(dto, '127.0.0.1');
    expect(mockAuthService.registerRestaurant).toHaveBeenCalledWith(dto, '127.0.0.1');
    expect(result).toEqual(mockCreated);
  });

  it('delegates login to AuthService and sets cookie', async () => {
    const dto = {
      phone: '03001234567',
      password: 'Password123!',
    };
    const loginResult = {
      token: 'jwt-token-xyz',
      user: { id: 'u-1', name: 'Owner Khan' },
      restaurant: { id: 'r-1', name: 'Test Diner' },
    };
    mockAuthService.login.mockResolvedValue(loginResult);

    const result = await controller.login(dto, mockResponse, '127.0.0.1');
    expect(mockAuthService.login).toHaveBeenCalledWith(dto, '127.0.0.1');
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'dir_food_token',
      'jwt-token-xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(result).toEqual({
      token: 'jwt-token-xyz',
      user: loginResult.user,
      restaurant: loginResult.restaurant,
    });
  });

  it('delegates logout and clears cookie', async () => {
    const result = await controller.logout(mockResponse);
    expect(mockResponse.clearCookie).toHaveBeenCalledWith('dir_food_token');
    expect(result).toEqual({ success: true, message: 'Logged out successfully' });
  });

  it('delegates me to AuthService', async () => {
    const mockUser = {
      userId: 'u-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'r-1',
    };
    const profile = { id: 'u-1', name: 'Owner Khan' };
    mockAuthService.getMe.mockResolvedValue(profile);

    const result = await controller.me(mockUser);
    expect(mockAuthService.getMe).toHaveBeenCalledWith('u-1');
    expect(result).toEqual(profile);
  });
});
