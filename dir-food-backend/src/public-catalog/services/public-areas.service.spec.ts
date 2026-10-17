import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicAreasService } from './public-areas.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicAreasService', () => {
  let service: PublicAreasService;
  let mockPrisma: {
    area: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      area: {
        findMany: vi.fn(),
      },
    };
    service = new PublicAreasService(mockPrisma as unknown as PrismaService);
  });

  it('returns active areas ordered by sortOrder and name with only public fields', async () => {
    const mockAreas = [
      { id: 'area-1', name: 'Timergara City', slug: 'timergara-city' },
      { id: 'area-2', name: 'Balambat', slug: 'balambat' },
    ];
    mockPrisma.area.findMany.mockResolvedValue(mockAreas);

    const result = await service.getAreas();

    expect(mockPrisma.area.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    expect(result).toEqual(mockAreas);
  });
});

