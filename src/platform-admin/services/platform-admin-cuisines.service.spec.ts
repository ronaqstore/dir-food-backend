import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformAdminCuisinesService } from './platform-admin-cuisines.service.js';

describe('PlatformAdminCuisinesService (unit)', () => {
  let service: PlatformAdminCuisinesService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      cuisine: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 30 }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PlatformAdminCuisinesService(mockPrisma, mockAudit);
  });

  describe('listCuisines', () => {
    it('returns cuisines with pagination metadata', async () => {
      mockPrisma.cuisine.count.mockResolvedValue(1);
      mockPrisma.cuisine.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Fast Food',
          slug: 'fast-food',
          icon: null,
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.listCuisines({ page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.meta.totalPages).toBe(1);
    });

    it('auto-seeds default cuisines when database is empty', async () => {
      mockPrisma.cuisine.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(30);
      mockPrisma.cuisine.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'c1',
            name: 'Pakistani',
            slug: 'pakistani',
            icon: null,
            sortOrder: 1,
            isActive: true,
          },
        ]);

      const res = await service.listCuisines({});
      expect(mockPrisma.cuisine.createMany).toHaveBeenCalled();
      expect(res.meta.total).toBe(30);
    });
  });

  describe('createCuisine', () => {
    it('creates cuisine and logs audit', async () => {
      mockPrisma.cuisine.findUnique.mockResolvedValue(null);
      mockPrisma.cuisine.create.mockResolvedValue({
        id: 'c1',
        name: 'New Cuisine',
        slug: 'new-cuisine',
        icon: null,
        sortOrder: 0,
        isActive: true,
      });

      const res = await service.createCuisine(
        { name: 'New Cuisine' },
        'admin-1',
      );
      expect(res.name).toBe('New Cuisine');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUISINE_CREATED',
          entityType: 'cuisine',
        }),
      );
    });

    it('throws ConflictException on duplicate name', async () => {
      mockPrisma.cuisine.findUnique.mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.createCuisine({ name: 'Fast Food' }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCuisine', () => {
    it('updates cuisine and logs audit', async () => {
      mockPrisma.cuisine.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Fast Food',
        slug: 'fast-food',
        isActive: true,
      });
      mockPrisma.cuisine.update.mockResolvedValue({
        id: 'c1',
        name: 'Fast Food Updated',
        slug: 'fast-food',
        isActive: false,
      });

      const res = await service.updateCuisine(
        'c1',
        { name: 'Fast Food Updated', isActive: false },
        'admin-1',
      );
      expect(res.name).toBe('Fast Food Updated');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUISINE_UPDATED',
        }),
      );
    });

    it('throws NotFoundException if cuisine does not exist', async () => {
      mockPrisma.cuisine.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCuisine('unknown', { name: 'Test' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCuisine', () => {
    it('deletes cuisine and logs audit', async () => {
      mockPrisma.cuisine.findUnique.mockResolvedValue({
        id: 'c1',
        name: 'Fast Food',
        slug: 'fast-food',
      });
      mockPrisma.cuisine.update.mockResolvedValue({
        id: 'c1',
        isActive: false,
      });

      const res = await service.deleteCuisine('c1', 'admin-1');
      expect(res.success).toBe(true);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUISINE_DELETED',
        }),
      );
    });
  });
});
