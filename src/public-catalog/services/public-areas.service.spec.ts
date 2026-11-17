import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicAreasService } from './public-areas.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicAreasService', () => {
  let service: PublicAreasService;
  let mockPrisma: {
    city: {
      findMany: ReturnType<typeof vi.fn>;
    };
    area: {
      findMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      city: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      area: {
        findMany: vi.fn(),
        createMany: vi.fn().mockResolvedValue({ count: 10 }),
      },
    };
    service = new PublicAreasService(mockPrisma as unknown as PrismaService);
  });

  it('returns active areas ordered by sortOrder and name with only public fields', async () => {
    const mockAreas = [
      {
        id: 'area-1',
        cityId: 'city-1',
        name: 'Timergara City',
        slug: 'timergara-city',
      },
      { id: 'area-2', cityId: 'city-1', name: 'Balambat', slug: 'balambat' },
    ];
    mockPrisma.area.findMany.mockResolvedValue(mockAreas);

    const result = await service.getAreas('city-1');

    expect(mockPrisma.area.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        isVerified: true,
        cityId: 'city-1',
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        cityId: true,
        name: true,
        slug: true,
      },
    });
    expect(result).toEqual(mockAreas);
  });

  it('runs onModuleInit to ensure default areas', async () => {
    await service.onModuleInit();
    expect(mockPrisma.city.findMany).toHaveBeenCalled();
  });
});
