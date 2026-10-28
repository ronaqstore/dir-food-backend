import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCitiesService } from './public-cities.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicCitiesService (unit)', () => {
  let service: PublicCitiesService;
  let mockPrisma: {
    city: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      city: {
        findMany: vi.fn(),
      },
    };
    service = new PublicCitiesService(mockPrisma as unknown as PrismaService);
  });

  it('returns active cities ordered by sortOrder and name', async () => {
    const mockCities = [
      { id: 'city-1', name: 'Lower Dir', slug: 'lower-dir', sortOrder: 1 },
      { id: 'city-2', name: 'Swat', slug: 'swat', sortOrder: 2 },
    ];
    mockPrisma.city.findMany.mockResolvedValue(mockCities);

    const result = await service.getCities();

    expect(mockPrisma.city.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });
    expect(result).toEqual(mockCities);
  });
});

