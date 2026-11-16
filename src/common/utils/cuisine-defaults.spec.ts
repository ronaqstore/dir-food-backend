import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_MASTER_CUISINES,
  ensureDefaultCuisines,
} from './cuisine-defaults.js';

describe('cuisine-defaults utility (unit)', () => {
  it('exports comprehensive default master cuisines', () => {
    expect(DEFAULT_MASTER_CUISINES.length).toBeGreaterThanOrEqual(18);
    const fastFood = DEFAULT_MASTER_CUISINES.find(
      (c) => c.slug === 'fast-food',
    );
    expect(fastFood).toBeDefined();
    expect(fastFood?.name).toBe('Fast Food');
  });

  it('inserts default cuisines when database count is less than defaults', async () => {
    const mockPrisma: any = {
      cuisine: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: 18 }),
      },
    };

    await ensureDefaultCuisines(mockPrisma);

    expect(mockPrisma.cuisine.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cuisine.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Fast Food', slug: 'fast-food' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('skips insertion when database count is already sufficient', async () => {
    const mockPrisma: any = {
      cuisine: {
        count: vi.fn().mockResolvedValue(18),
        createMany: vi.fn(),
      },
    };

    await ensureDefaultCuisines(mockPrisma);

    expect(mockPrisma.cuisine.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cuisine.createMany).not.toHaveBeenCalled();
  });
});
