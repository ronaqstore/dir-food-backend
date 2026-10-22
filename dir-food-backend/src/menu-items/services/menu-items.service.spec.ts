import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service.js';

describe('MenuItemsService (unit)', () => {
  let service: MenuItemsService;
  let mockPrisma: any;
  let mockR2: any;
  let mockImageProcessor: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      menuCategory: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        aggregate: vi.fn(),
      },
      menuItem: {
        count: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      menuItemVariant: {
        createMany: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (arg) => {
        if (typeof arg === 'function') {
          return arg(mockPrisma);
        }
        return Promise.all(arg);
      }),
    };

    mockR2 = {
      put: vi.fn(),
      deleteByUrl: vi.fn().mockResolvedValue(undefined),
    };

    mockImageProcessor = {
      process: vi.fn(),
    };

    service = new MenuItemsService(mockPrisma, mockR2, mockImageProcessor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getItems', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getItems('res-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns paginated items with meta', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuItem.count.mockResolvedValue(1);
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Karahi', basePrice: 120000n, variants: [] },
      ]);

      const res = await service.getItems('res-1');
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('filters items by isDeal when specified', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuItem.count.mockResolvedValue(1);
      mockPrisma.menuItem.findMany.mockResolvedValue([
        { id: 'item-deal', name: 'Deal 1', basePrice: 120000n, isDeal: true, variants: [] },
      ]);

      await service.getItems('res-1', undefined, 1, 20, undefined, true);
      expect(mockPrisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: 'res-1',
            isDeal: true,
          }),
        }),
      );
    });
  });

  describe('createItem', () => {
    it('throws BadRequestException if neither basePrice nor variants are provided', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });

      await expect(
        service.createItem('res-1', {
          categoryId: 'cat-1',
          name: 'Naan',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException if originalPrice is less than or equal to basePrice', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });

      await expect(
        service.createItem('res-1', {
          categoryId: 'cat-1',
          name: 'Family Deal',
          basePrice: 150000,
          originalPrice: 150000,
          isDeal: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a deal item with originalPrice and isDeal flag', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });
      mockPrisma.menuItem.findFirst.mockResolvedValue(null);
      mockPrisma.menuItem.create.mockResolvedValue({ id: 'deal-1' });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'deal-1',
        name: 'Family Deal 1',
        basePrice: 150000n,
        originalPrice: 200000n,
        isDeal: true,
        variants: [],
      });

      const res = await service.createItem('res-1', {
        categoryId: 'cat-1',
        name: 'Family Deal 1',
        basePrice: 150000,
        originalPrice: 200000,
        isDeal: true,
      });

      expect(mockPrisma.menuItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Family Deal 1',
          basePrice: 150000n,
          originalPrice: 200000n,
          isDeal: true,
        }),
      });
      expect(res?.isDeal).toBe(true);
    });

    it('automatically assigns deals to Deals & Combos category when categoryId is omitted', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findFirst.mockResolvedValue({ id: 'deals-cat-id', name: 'Deals & Combos' });
      mockPrisma.menuItem.findFirst.mockResolvedValue(null);
      mockPrisma.menuItem.create.mockResolvedValue({ id: 'deal-2' });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'deal-2',
        name: 'Auto Deal',
        basePrice: 100000n,
        isDeal: true,
        variants: [],
      });

      const res = await service.createItem('res-1', {
        name: 'Auto Deal',
        basePrice: 100000,
        isDeal: true,
      });

      expect(mockPrisma.menuItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          categoryId: 'deals-cat-id',
          name: 'Auto Deal',
        }),
      });
      expect(res?.id).toBe('deal-2');
    });

    it('throws NotFoundException if category does not belong to restaurant', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createItem('res-1', {
          categoryId: 'cat-foreign',
          name: 'Naan',
          basePrice: 3000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates item with basePrice in transaction', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });
      mockPrisma.menuItem.findFirst.mockImplementation((args: { where?: { name?: unknown } }) =>
        args?.where?.name ? Promise.resolve(null) : Promise.resolve({ sortOrder: 2 })
      );
      mockPrisma.menuItem.create.mockResolvedValue({ id: 'item-new' });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-new',
        name: 'Roti',
        basePrice: 2000n,
        variants: [],
      });

      const res = await service.createItem('res-1', {
        categoryId: 'cat-1',
        name: 'Roti',
        basePrice: 2000,
      });

      expect(mockPrisma.menuItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          restaurantId: 'res-1',
          categoryId: 'cat-1',
          name: 'Roti',
          basePrice: 2000n,
          sortOrder: 3,
        }),
      });
      expect(res?.id).toBe('item-new');
    });

    it('throws ConflictException if item with same name already exists in category', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });
      mockPrisma.menuItem.findFirst.mockResolvedValue({ id: 'existing-item', name: 'Roti' });

      await expect(
        service.createItem('res-1', {
          categoryId: 'cat-1',
          name: 'Roti',
          basePrice: 2000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates item with variants in transaction', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });
      mockPrisma.menuItem.findFirst.mockResolvedValue(null);
      mockPrisma.menuItem.create.mockResolvedValue({ id: 'item-karahi' });
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-karahi',
        name: 'Karahi',
        variants: [{ name: 'Half', price: 60000n }],
      });

      const res = await service.createItem('res-1', {
        categoryId: 'cat-1',
        name: 'Karahi',
        variants: [
          { name: 'Half', price: 60000 },
          { name: 'Full', price: 120000 },
        ],
      });

      expect(mockPrisma.menuItemVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Half', price: 60000n, sortOrder: 0 }),
      });
      expect(mockPrisma.menuItemVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'Full', price: 120000n, sortOrder: 1 }),
      });
      expect(res?.name).toBe('Karahi');
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException if item does not belong to restaurant', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('res-1', 'item-other', { name: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if update sets originalPrice <= existing basePrice', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        restaurantId: 'res-1',
        categoryId: 'cat-1',
        basePrice: 150000n,
      });

      await expect(
        service.updateItem('res-1', 'item-1', {
          originalPrice: 140000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates item properties', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        restaurantId: 'res-1',
        categoryId: 'cat-1',
      });
      mockPrisma.menuItem.update.mockResolvedValue({
        id: 'item-1',
        name: 'Updated Naan',
      });

      const res = await service.updateItem('res-1', 'item-1', {
        name: 'Updated Naan',
      });
      expect(res.name).toBe('Updated Naan');
    });
  });

  describe('reorderItems', () => {
    it('throws NotFoundException if category does not belong to restaurant', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderItems('res-1', 'cat-other', ['item-1']),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if any item does not belong to category', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({ id: 'cat-1', restaurantId: 'res-1' });
      mockPrisma.menuItem.count.mockResolvedValue(1); // expected 2

      await expect(
        service.reorderItems('res-1', 'cat-1', ['item-1', 'item-2']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('replaceVariants', () => {
    it('deactivates omitted variants and upserts submitted variants', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        restaurantId: 'res-1',
      });
      mockPrisma.menuItemVariant.findMany.mockResolvedValue([
        { id: 'v-1', name: 'Half', price: 70000n },
      ]);

      const res = await service.replaceVariants('res-1', 'item-1', {
        variants: [
          { id: 'v-1', name: 'Half', price: 70000 },
          { name: 'Full', price: 130000 },
        ],
      });

      expect(mockPrisma.menuItemVariant.updateMany).toHaveBeenCalledWith({
        where: {
          restaurantId: 'res-1',
          menuItemId: 'item-1',
          id: { notIn: ['v-1'] },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
      expect(mockPrisma.menuItemVariant.update).toHaveBeenCalled();
      expect(mockPrisma.menuItemVariant.create).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });
  });

  describe('uploadItemImage', () => {
    it('throws NotFoundException if menu item does not belong to restaurant', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadItemImage('res-1', 'item-1', {
          buffer: Buffer.from('test'),
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('uploads image to R2, updates item, and cleans up old image', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        imageUrl: 'https://images.dirfood.test/old-item.jpg',
      });
      mockImageProcessor.process.mockResolvedValue({
        buffer: Buffer.from('processed'),
        ext: 'webp',
        contentType: 'image/webp',
      });
      mockR2.put.mockResolvedValue(
        'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.webp',
      );
      mockPrisma.menuItem.update.mockResolvedValue({
        id: 'item-1',
        imageUrl:
          'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.webp',
      });

      const res = await service.uploadItemImage('res-1', 'item-1', {
        buffer: Buffer.from('raw'),
      });

      expect(res.imageUrl).toContain('img.webp');
      expect(mockR2.put).toHaveBeenCalled();
      expect(mockPrisma.menuItem.update).toHaveBeenCalledWith({
        where: {
          id_restaurantId: {
            id: 'item-1',
            restaurantId: 'res-1',
          },
        },
        data: {
          imageUrl:
            'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.webp',
        },
      });
      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/old-item.jpg',
        'res-1',
      );
    });

    it('cleans up newly uploaded R2 object if DB update fails', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        imageUrl: null,
      });
      mockImageProcessor.process.mockResolvedValue({
        buffer: Buffer.from('processed'),
        ext: 'jpg',
        contentType: 'image/jpeg',
      });
      mockR2.put.mockResolvedValue(
        'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.jpg',
      );
      mockPrisma.menuItem.update.mockRejectedValue(new Error('DB failure'));

      await expect(
        service.uploadItemImage('res-1', 'item-1', {
          buffer: Buffer.from('raw'),
        }),
      ).rejects.toThrow('DB failure');

      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.jpg',
        'res-1',
      );
    });
  });

  describe('deleteItemImage', () => {
    it('sets imageUrl to null and deletes object from R2', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue({
        id: 'item-1',
        imageUrl:
          'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.jpg',
      });
      mockPrisma.menuItem.update.mockResolvedValue({
        id: 'item-1',
        imageUrl: null,
      });

      const res = await service.deleteItemImage('res-1', 'item-1');

      expect(res.imageUrl).toBeNull();
      expect(mockPrisma.menuItem.update).toHaveBeenCalledWith({
        where: {
          id_restaurantId: {
            id: 'item-1',
            restaurantId: 'res-1',
          },
        },
        data: { imageUrl: null },
      });
      expect(mockR2.deleteByUrl).toHaveBeenCalledWith(
        'https://images.dirfood.test/restaurants/res-1/menu-items/item-1/img.jpg',
        'res-1',
      );
    });
  });
});
