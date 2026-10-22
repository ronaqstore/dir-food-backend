import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MenuItemsController } from './menu-items.controller.js';
import { MenuItemsService } from '../services/menu-items.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('MenuItemsController (unit)', () => {
  let controller: MenuItemsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      getItems: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      reorderItems: vi.fn(),
      replaceVariants: vi.fn(),
    };

    controller = new MenuItemsController(mockService as MenuItemsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates getItems with pagination and categoryId', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    mockService.getItems.mockResolvedValue({ data: [], meta: { page: 1 } });

    const res = await controller.getItems(mockUser, 'cat-1', undefined, '2', '10');
    expect(mockService.getItems).toHaveBeenCalledWith('rest-1', 'cat-1', 2, 10, undefined);
    expect(res.meta.page).toBe(1);
  });

  it('delegates createItem with user.restaurantId and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { categoryId: 'cat-1', name: 'Karahi', basePrice: 120000 };
    mockService.createItem.mockResolvedValue({ id: 'item-1', ...dto });

    const res = await controller.createItem(mockUser, dto);
    expect(mockService.createItem).toHaveBeenCalledWith('rest-1', dto);
    expect(res.id).toBe('item-1');
  });

  it('delegates updateItem with user.restaurantId, id and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { name: 'New Karahi' };
    mockService.updateItem.mockResolvedValue({ id: 'item-1', name: 'New Karahi' });

    const res = await controller.updateItem(mockUser, 'item-1', dto);
    expect(mockService.updateItem).toHaveBeenCalledWith('rest-1', 'item-1', dto);
    expect(res.name).toBe('New Karahi');
  });

  it('delegates reorderItems with user.restaurantId and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { categoryId: 'cat-1', ids: ['item-2', 'item-1'] };
    mockService.reorderItems.mockResolvedValue([]);

    const res = await controller.reorderItems(mockUser, dto);
    expect(mockService.reorderItems).toHaveBeenCalledWith('rest-1', 'cat-1', ['item-2', 'item-1']);
    expect(res).toEqual([]);
  });

  it('delegates replaceVariants with user.restaurantId, id and dto', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const dto = { variants: [{ name: 'Half', price: 60000 }] };
    mockService.replaceVariants.mockResolvedValue(dto.variants);

    const res = await controller.replaceVariants(mockUser, 'item-1', dto);
    expect(mockService.replaceVariants).toHaveBeenCalledWith('rest-1', 'item-1', dto);
    expect(res).toEqual(dto.variants);
  });

  it('delegates uploadItemImage with user.restaurantId, id, and file', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    const mockFile = { buffer: Buffer.from('img'), size: 100, mimetype: 'image/jpeg' };
    mockService.uploadItemImage = vi.fn().mockResolvedValue({ id: 'item-1', imageUrl: 'https://images.dirfood.test/img.jpg' });

    const res = await controller.uploadItemImage(mockUser, 'item-1', mockFile as any);
    expect(mockService.uploadItemImage).toHaveBeenCalledWith('rest-1', 'item-1', mockFile);
    expect(res.imageUrl).toContain('img.jpg');
  });

  it('delegates deleteItemImage with user.restaurantId and id', async () => {
    const mockUser = {
      userId: 'user-1',
      role: UserRole.RESTAURANT_OWNER,
      restaurantId: 'rest-1',
    };
    mockService.deleteItemImage = vi.fn().mockResolvedValue({ id: 'item-1', imageUrl: null });

    const res = await controller.deleteItemImage(mockUser, 'item-1');
    expect(mockService.deleteItemImage).toHaveBeenCalledWith('rest-1', 'item-1');
    expect(res.imageUrl).toBeNull();
  });
});
