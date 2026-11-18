import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_MASTER_CUISINES,
  ensureDefaultCuisines,
} from './cuisine-defaults.js';

describe('cuisine-defaults utility (unit)', () => {
  it('exports comprehensive default master cuisines', () => {
    expect(DEFAULT_MASTER_CUISINES.length).toBeGreaterThanOrEqual(30);
    const pakistani = DEFAULT_MASTER_CUISINES.find(
      (c) => c.slug === 'pakistani',
    );
    expect(pakistani).toBeDefined();
    expect(pakistani?.name).toBe('Pakistani');
  });

  it('inserts default cuisines when database count is less than defaults', async () => {
    const mockPrisma: any = {
      cuisine: {
        count: vi.fn().mockResolvedValue(0),
        createMany: vi.fn().mockResolvedValue({ count: 30 }),
      },
    };

    await ensureDefaultCuisines(mockPrisma);

    expect(mockPrisma.cuisine.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cuisine.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Pakistani', slug: 'pakistani' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('skips insertion when database count is already sufficient', async () => {
    const mockPrisma: any = {
      cuisine: {
        count: vi.fn().mockResolvedValue(DEFAULT_MASTER_CUISINES.length),
        createMany: vi.fn(),
      },
    };

    await ensureDefaultCuisines(mockPrisma);

    expect(mockPrisma.cuisine.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cuisine.createMany).not.toHaveBeenCalled();
  });
});
