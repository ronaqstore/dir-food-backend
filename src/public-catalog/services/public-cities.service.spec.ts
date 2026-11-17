import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCitiesService } from './public-cities.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicCitiesService (unit)', () => {
  let service: PublicCitiesService;
  let mockPrisma: {
    city: {
      findMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      city: {
        findMany: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 41 }),
      },
    };
    service = new PublicCitiesService(mockPrisma as unknown as PrismaService);
  });

  it('returns active cities ordered by sortOrder and name', async () => {
    const mockCities = [
      { id: 'city-1', name: 'Lower Dir', slug: 'lower-dir', sortOrder: 1 },
      { id: 'city-2', name: 'Swat', slug: 'swat', sortOrder: 2 },
    ];
    mockPrisma.city.findMany
      .mockResolvedValueOnce([{ slug: 'lower-dir' }])
      .mockResolvedValueOnce(mockCities);

    const result = await service.getCities();

    expect(result).toEqual(mockCities);
  });

  it('runs ensureDefaultCities onModuleInit', async () => {
    mockPrisma.city.findMany.mockResolvedValue([]);

    await service.onModuleInit();

    expect(mockPrisma.city.findMany).toHaveBeenCalled();
    expect(mockPrisma.city.createMany).toHaveBeenCalled();
  });

  it('falls back to default cities when database is completely empty', async () => {
    mockPrisma.city.findMany.mockResolvedValue([]);

    const result = await service.getCities();

    expect(result.length).toBe(41);
    expect(result[0].name).toBe('Lower Dir');
    expect(result.find((c) => c.slug === 'swat')).toBeDefined();
  });
});
