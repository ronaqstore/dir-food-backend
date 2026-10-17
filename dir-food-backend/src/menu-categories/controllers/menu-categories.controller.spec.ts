import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MenuCategoriesController } from './menu-categories.controller.js';
import { MenuCategoriesService } from '../services/menu-categories.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('MenuCategoriesController (unit)', () => {
  let controller: MenuCategoriesController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getCategories: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      reorderCategories: vi.fn(),
    };

    controller = new MenuCategoriesController(
      mockService as MenuCategoriesService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getCategories with user.restaurantId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    mockService.getCategories.mockResolvedValue([]);

    const res = await controller.getCategories(mockUser);
    expect(mockService.getCategories).toHaveBeenCalledWith('rest-1');
    expect(res).toEqual([]);
  });

  it('delegates createCategory with user.restaurantId and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { name: 'Karahi' };
    mockService.createCategory.mockResolvedValue({ id: 'cat-1', ...dto });

    const res = await controller.createCategory(mockUser, dto);
    expect(mockService.createCategory).toHaveBeenCalledWith('rest-1', dto);
    expect(res.id).toBe('cat-1');
  });

  it('delegates updateCategory with user.restaurantId, id, and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { name: 'Handi' };
    mockService.updateCategory.mockResolvedValue({ id: 'cat-1', ...dto });

    const res = await controller.updateCategory(mockUser, 'cat-1', dto);
    expect(mockService.updateCategory).toHaveBeenCalledWith('rest-1', 'cat-1', dto);
    expect(res.name).toBe('Handi');
  });

  it('delegates reorderCategories with user.restaurantId and ids', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { ids: ['cat-2', 'cat-1'] };
    mockService.reorderCategories.mockResolvedValue([]);

    const res = await controller.reorderCategories(mockUser, dto);
    expect(mockService.reorderCategories).toHaveBeenCalledWith('rest-1', ['cat-2', 'cat-1']);
    expect(res).toEqual([]);
  });
});
