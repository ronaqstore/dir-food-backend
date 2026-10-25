import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformAdminCitiesService } from './platform-admin-cities.service.js';

describe('PlatformAdminCitiesService (unit)', () => {
  let service: PlatformAdminCitiesService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      city: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PlatformAdminCitiesService(mockPrisma, mockAudit);
  });

  describe('listCities', () => {
    it('returns all cities with counts', async () => {
      mockPrisma.city.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Lower Dir',
          slug: 'lower-dir',
          sortOrder: 1,
          isActive: true,
          _count: { areas: 15, restaurants: 8 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.listCities();
      expect(res).toHaveLength(1);
      expect(res[0].areasCount).toBe(15);
      expect(res[0].restaurantsCount).toBe(8);
    });
  });

  describe('createCity', () => {
    it('creates city and logs audit', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(null);
      mockPrisma.city.create.mockResolvedValue({
        id: 'c2',
        name: 'Swat',
        slug: 'swat',
        sortOrder: 2,
        isActive: true,
      });

      const res = await service.createCity({ name: 'Swat' }, 'admin-1', '127.0.0.1');
      expect(res.name).toBe('Swat');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CITY_CREATED' }),
      );
    });

    it('rejects if name already exists', async () => {
      mockPrisma.city.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.createCity({ name: 'Lower Dir' }, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCity', () => {
    it('updates city and logs audit', async () => {
      mockPrisma.city.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.id) return { id: 'c1', name: 'Swat', slug: 'swat', isActive: true };
        return null;
      });
      mockPrisma.city.update.mockResolvedValue({
        id: 'c1',
        name: 'Swat Valley',
        slug: 'swat-valley',
        isActive: true,
      });

      const res = await service.updateCity('c1', { name: 'Swat Valley' }, 'admin-1');
      expect(res.name).toBe('Swat Valley');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CITY_UPDATED' }),
      );
    });

    it('throws 404 if city not found', async () => {
      mockPrisma.city.findUnique.mockResolvedValue(null);
      await expect(service.updateCity('unknown', { name: 'Test' }, 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
