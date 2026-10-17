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
      restaurantOwnerLogin: vi.fn(),
      platformAdminLogin: vi.fn(),
      setupPassword: vi.fn(),
      changePassword: vi.fn(),
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

  it('delegates owner login to AuthService and sets cookie', async () => {
    const dto = {
      phone: '03001234567',
      password: 'Password123!',
    };
    const loginResult = {
      accessToken: 'jwt-token-xyz',
      tokenType: 'Bearer',
      expiresIn: '12h',
      user: { id: 'u-1', name: 'Owner Khan', phone: '923001234567', role: UserRole.RESTAURANT_OWNER },
      restaurantId: 'r-1',
      restaurant: { id: 'r-1', name: 'Test Diner', slug: 'test-diner', status: RestaurantStatus.ACTIVE, subscriptionStatus: 'VALID' },
    };
    mockAuthService.restaurantOwnerLogin.mockResolvedValue(loginResult);

    const result = await controller.ownerLogin(dto, mockResponse, '127.0.0.1');
    expect(mockAuthService.restaurantOwnerLogin).toHaveBeenCalledWith(dto, '127.0.0.1');
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'dir_food_token',
      'jwt-token-xyz',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(result.accessToken).toBe('jwt-token-xyz');
    expect(result.restaurantId).toBe('r-1');
  });

  it('delegates platform admin login to AuthService and sets cookie', async () => {
    const dto = {
      phone: '03009999999',
      password: 'AdminPassword123!',
    };
    const adminLoginResult = {
      accessToken: 'admin-jwt-token',
      tokenType: 'Bearer',
      expiresIn: '12h',
      admin: { id: 'a-1', name: 'Super Admin', phone: '923009999999', role: UserRole.PLATFORM_ADMIN },
    };
    mockAuthService.platformAdminLogin.mockResolvedValue(adminLoginResult);

    const result = await controller.platformAdminLogin(dto, mockResponse, '127.0.0.1');
    expect(mockAuthService.platformAdminLogin).toHaveBeenCalledWith(dto, '127.0.0.1');
    expect(mockResponse.cookie).toHaveBeenCalledWith(
      'dir_food_token',
      'admin-jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(result.accessToken).toBe('admin-jwt-token');
    expect(result.admin.role).toBe(UserRole.PLATFORM_ADMIN);
  });

  it('delegates setupPassword to AuthService', async () => {
    const dto = {
      token: 'valid-token',
      password: 'NewPassword123!',
    };
    const setupResult = { success: true, message: 'Password set successfully' };
    mockAuthService.setupPassword.mockResolvedValue(setupResult);

    const result = await controller.setupPassword(dto);
    expect(mockAuthService.setupPassword).toHaveBeenCalledWith(dto);
    expect(result).toEqual(setupResult);
  });

  it('delegates changePassword to AuthService', async () => {
    const mockUser = {
      userId: 'u-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'r-1',
    };
    const dto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };
    const changeResult = { success: true, message: 'Password changed successfully' };
    mockAuthService.changePassword.mockResolvedValue(changeResult);

    const result = await controller.changePassword(mockUser, dto);
    expect(mockAuthService.changePassword).toHaveBeenCalledWith('u-1', dto);
    expect(result).toEqual(changeResult);
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
