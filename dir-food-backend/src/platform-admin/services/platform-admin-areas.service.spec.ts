import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformAdminAreasService } from './platform-admin-areas.service.js';

describe('PlatformAdminAreasService (unit)', () => {
  let service: PlatformAdminAreasService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      area: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
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
          name: 'Timergara',
          slug: 'timergara',
          sortOrder: 1,
          isActive: true,
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
});

