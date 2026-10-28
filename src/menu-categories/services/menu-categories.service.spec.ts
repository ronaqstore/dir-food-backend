import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MenuCategoriesService } from './menu-categories.service.js';

describe('MenuCategoriesService (unit)', () => {
  let service: MenuCategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      menuCategory: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation(async (promises) => Promise.all(promises)),
    };

    service = new MenuCategoriesService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCategories', () => {
    it('throws NotFoundException if restaurant does not exist', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getCategories('res-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns categories ordered by sortOrder', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Karahi', sortOrder: 0 },
      ]);

      const res = await service.getCategories('res-1');
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Karahi');
    });
  });

  describe('createCategory', () => {
    it('creates category with incremental sortOrder', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.findFirst.mockResolvedValue({ sortOrder: 3 });
      mockPrisma.menuCategory.create.mockResolvedValue({
        id: 'cat-new',
        name: 'BBQ',
        sortOrder: 4,
      });

      const res = await service.createCategory('res-1', { name: 'BBQ' });
      expect(mockPrisma.menuCategory.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'res-1',
          name: 'BBQ',
          sortOrder: 4,
        },
      });
      expect(res.sortOrder).toBe(4);
    });
  });

  describe('updateCategory', () => {
    it('throws NotFoundException if category not found under this restaurant', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory('res-1', 'cat-other', { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates category name and active status', async () => {
      mockPrisma.menuCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        restaurantId: 'res-1',
      });
      mockPrisma.menuCategory.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Updated Karahi',
      });

      const res = await service.updateCategory('res-1', 'cat-1', {
        name: 'Updated Karahi',
      });
      expect(res.name).toBe('Updated Karahi');
    });
  });

  describe('reorderCategories', () => {
    it('throws BadRequestException if any category ID does not belong to restaurant', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.count.mockResolvedValue(1); // expected 2

      await expect(
        service.reorderCategories('res-1', ['cat-1', 'cat-2']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates sortOrder for all categories in order', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
      mockPrisma.menuCategory.count.mockResolvedValue(2);
      mockPrisma.menuCategory.findMany.mockResolvedValue([]);

      await service.reorderCategories('res-1', ['cat-2', 'cat-1']);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
