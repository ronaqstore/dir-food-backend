import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_CITIES, ensureDefaultCities } from './city-defaults.js';

describe('city-defaults utility (unit)', () => {
  it('exports comprehensive default KP districts and cities', () => {
    expect(DEFAULT_CITIES.length).toBe(41);
    const lowerDir = DEFAULT_CITIES.find((c) => c.slug === 'lower-dir');
    expect(lowerDir).toBeDefined();
    expect(lowerDir?.name).toBe('Lower Dir');

    const swat = DEFAULT_CITIES.find((c) => c.slug === 'swat');
    expect(swat).toBeDefined();

    const peshawar = DEFAULT_CITIES.find((c) => c.slug === 'peshawar');
    expect(peshawar).toBeDefined();
  });

  it('inserts missing default cities when database does not have all of them', async () => {
    const mockPrisma: any = {
      city: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ slug: 'lower-dir' }, { slug: 'upper-dir' }]),
        createMany: vi.fn().mockResolvedValue({ count: 39 }),
      },
    };

    await ensureDefaultCities(mockPrisma);

    expect(mockPrisma.city.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.city.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Central Dir', slug: 'central-dir' }),
        expect.objectContaining({ name: 'Swat', slug: 'swat' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('skips insertion when all default cities already exist', async () => {
    const mockPrisma: any = {
      city: {
        findMany: vi
          .fn()
          .mockResolvedValue(DEFAULT_CITIES.map((c) => ({ slug: c.slug }))),
        createMany: vi.fn(),
      },
    };

    await ensureDefaultCities(mockPrisma);

    expect(mockPrisma.city.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.city.createMany).not.toHaveBeenCalled();
  });
});
