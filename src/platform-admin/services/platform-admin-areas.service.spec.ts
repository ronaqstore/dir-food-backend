import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformAdminAreasService } from './platform-admin-areas.service.js';

describe('PlatformAdminAreasService (unit)', () => {
  let service: PlatformAdminAreasService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      city: {
        findFirst: vi.fn().mockResolvedValue({ id: 'city-1', name: 'Lower Dir', slug: 'lower-dir' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'city-1', name: 'Lower Dir', slug: 'lower-dir' }),
      },
      area: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      orderIntent: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      restaurantDeliveryArea: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      areaAlias: {
        upsert: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn().mockImplementation((args: any) => typeof args === 'function' ? args(mockPrisma) : Promise.all(args)),
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PlatformAdminAreasService(mockPrisma, mockAudit);
  });

  describe('listAreas', () => {
    it('returns all areas with active restaurant counts', async () => {
      mockPrisma.area.findMany.mockResolvedValue([
        {
          id: 'a1',
          cityId: 'city-1',
          name: 'Timergara',
          slug: 'timergara',
          sortOrder: 1,
          isActive: true,
          isCustomCreated: false,
          city: { id: 'city-1', name: 'Lower Dir', slug: 'lower-dir' },
          _count: { restaurantAreas: 5 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.listAreas();
      expect(res).toHaveLength(1);
      expect(res[0].activeRestaurantsCount).toBe(5);
    });
  });

  describe('createArea', () => {
    it('creates area and records audit log', async () => {
      mockPrisma.area.findUnique.mockResolvedValue(null);
      mockPrisma.area.create.mockResolvedValue({
        id: 'a1',
        name: 'Balambat',
        slug: 'balambat',
        sortOrder: 2,
        isActive: true,
      });

      const res = await service.createArea({ name: 'Balambat', sortOrder: 2 }, 'admin-1', '127.0.0.1');
      expect(res.name).toBe('Balambat');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AREA_CREATED' }),
      );
    });

    it('rejects if name already exists', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.createArea({ name: 'Timergara' }, 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('rejects if name is empty', async () => {
      await expect(service.createArea({ name: '   ' }, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateArea', () => {
    it('updates area fields and records audit log', async () => {
      mockPrisma.area.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id) return { id: 'a1', name: 'Timergara', slug: 'timergara', isActive: true };
        return null;
      });
      mockPrisma.area.update.mockResolvedValue({
        id: 'a1',
        name: 'Timergara City',
        slug: 'timergara-city',
        isActive: true,
      });

      const res = await service.updateArea('a1', { name: 'Timergara City' }, 'admin-1');
      expect(res.name).toBe('Timergara City');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AREA_UPDATED' }),
      );
    });

    it('throws 404 if area not found', async () => {
      mockPrisma.area.findUnique.mockResolvedValue(null);
      await expect(service.updateArea('unknown', { name: 'Test' }, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteArea', () => {
    it('deletes area and its restaurant links when no orders exist', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'a1', name: 'Duplicate Fizagat', slug: 'duplicate-fizagat', cityId: 'city-1' });
      mockPrisma.orderIntent.count.mockResolvedValue(0);

      const res = await service.deleteArea('a1', 'admin-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.restaurantDeliveryArea.deleteMany).toHaveBeenCalledWith({ where: { areaId: 'a1' } });
      expect(mockPrisma.area.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AREA_DELETED' }));
    });

    it('throws BadRequestException if area has customer orders', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'a1', name: 'Timergara', slug: 'timergara', cityId: 'city-1' });
      mockPrisma.orderIntent.count.mockResolvedValue(3);

      await expect(service.deleteArea('a1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveArea', () => {
    it('approves area and marks isVerified true', async () => {
      mockPrisma.area.findUnique.mockResolvedValue({ id: 'a1', name: 'Fizagat', slug: 'fizagat', cityId: 'city-1' });
      mockPrisma.area.update.mockResolvedValue({ id: 'a1', name: 'Fizagat', slug: 'fizagat', cityId: 'city-1', isVerified: true });

      const res = await service.approveArea('a1', undefined, 'admin-1');
      expect(res.isVerified).toBe(true);
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AREA_APPROVED' }));
    });
  });

  describe('mergeArea', () => {
    it('merges source area into target area and creates alias', async () => {
      const source = {
        id: 'source-1',
        name: 'fiza gat',
        slug: 'fiza-gat',
        cityId: 'city-1',
        restaurantAreas: [{ restaurantId: 'r1', areaId: 'source-1', deliveryFee: 5000n, minOrderAmount: null, isActive: true }],
      };
      const target = {
        id: 'target-1',
        name: 'Fizagat',
        slug: 'fizagat',
        cityId: 'city-1',
      };

      mockPrisma.area.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id === 'source-1') return source;
        if (where.id === 'target-1') return target;
        return null;
      });

      const res = await service.mergeArea('source-1', 'target-1', 'admin-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.areaAlias.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cityId_normalized: { cityId: 'city-1', normalized: 'fizagat' } },
        }),
      );
      expect(mockPrisma.area.delete).toHaveBeenCalledWith({ where: { id: 'source-1' } });
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AREA_MERGED' }));
    });
  });
});

