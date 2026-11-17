import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublicCuisinesService } from './public-cuisines.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicCuisinesService (unit)', () => {
  let service: PublicCuisinesService;
  let mockPrisma: {
    cuisine: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      cuisine: {
        findMany: vi.fn(),
        count: vi.fn().mockResolvedValue(18),
        createMany: vi.fn().mockResolvedValue({ count: 18 }),
      },
    };
    service = new PublicCuisinesService(mockPrisma as unknown as PrismaService);
  });

  it('returns active cuisines ordered by sortOrder and name', async () => {
    const mockCuisines = [
      {
        id: 'c-1',
        name: 'Fast Food',
        slug: 'fast-food',
        icon: null,
        sortOrder: 1,
      },
      {
        id: 'c-2',
        name: 'Karahi',
        slug: 'karahi',
        icon: null,
        sortOrder: 2,
      },
    ];
    mockPrisma.cuisine.findMany.mockResolvedValue(mockCuisines);

    const result = await service.getCuisines();

    expect(mockPrisma.cuisine.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        sortOrder: true,
      },
    });
    expect(result).toEqual(mockCuisines);
  });

  it('runs ensureDefaultCuisines onModuleInit', async () => {
    mockPrisma.cuisine.count.mockResolvedValue(0);

    await service.onModuleInit();

    expect(mockPrisma.cuisine.count).toHaveBeenCalled();
    expect(mockPrisma.cuisine.createMany).toHaveBeenCalled();
  });

  it('falls back to default cuisines when database is completely empty', async () => {
    mockPrisma.cuisine.findMany.mockResolvedValue([]);
    mockPrisma.cuisine.count.mockResolvedValue(0);

    const result = await service.getCuisines();

    expect(result.length).toBeGreaterThanOrEqual(30);
    expect(result[0].name).toBe('Pakistani');
  });
});
