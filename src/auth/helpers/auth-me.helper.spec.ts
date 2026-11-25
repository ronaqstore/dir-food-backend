import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { handleGetMe } from './auth-me.helper.js';
import {
  RestaurantStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';

describe('handleGetMe (unit)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
  });

  it('returns active owner profile when tokenVersion and restaurant are valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      tokenVersion: 2,
      restaurant: {
        id: 'rest-1',
        name: 'Dir Cafe',
        slug: 'dir-cafe',
        status: RestaurantStatus.ACTIVE,
      },
    });

    const result = await handleGetMe(mockPrisma, 'user-1', 2);
    expect(result).toEqual({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurant: {
        id: 'rest-1',
        name: 'Dir Cafe',
        slug: 'dir-cafe',
        status: RestaurantStatus.ACTIVE,
      },
    });
  });

  it('throws UnauthorizedException when tokenVersion mismatches', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      tokenVersion: 3,
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.ACTIVE,
      },
    });

    await expect(handleGetMe(mockPrisma, 'user-1', 1)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when user is disabled', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.DISABLED,
      tokenVersion: 1,
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.ACTIVE,
      },
    });

    await expect(handleGetMe(mockPrisma, 'user-1', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws UnauthorizedException when owner has no restaurant', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      tokenVersion: 1,
      restaurant: null,
    });

    await expect(handleGetMe(mockPrisma, 'user-1', 1)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws ForbiddenException when owner restaurant is deactivated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Owner',
      phone: '923001234567',
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      tokenVersion: 1,
      restaurant: {
        id: 'rest-1',
        status: RestaurantStatus.DEACTIVATED,
      },
    });

    await expect(handleGetMe(mockPrisma, 'user-1', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
