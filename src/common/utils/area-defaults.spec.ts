import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_AREAS_BY_CITY_SLUG,
  ensureDefaultAreas,
  getDefaultAreasForCitySlug,
  loadGazetteerLowerDirSettlements,
  loadGazetteerSettlementsForDistrict,
} from './area-defaults.js';

describe('area-defaults utility (unit)', () => {
  it('exports comprehensive default areas for KP districts', () => {
    expect(
      DEFAULT_AREAS_BY_CITY_SLUG['lower-dir'].length,
    ).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_AREAS_BY_CITY_SLUG['swat'].length).toBeGreaterThanOrEqual(5);
    expect(
      DEFAULT_AREAS_BY_CITY_SLUG['peshawar'].length,
    ).toBeGreaterThanOrEqual(5);

    const timergara = DEFAULT_AREAS_BY_CITY_SLUG['lower-dir'].find(
      (a) => a.slug === 'timergara',
    );
    expect(timergara).toBeDefined();

    const mingora = DEFAULT_AREAS_BY_CITY_SLUG['swat'].find(
      (a) => a.slug === 'mingora',
    );
    expect(mingora).toBeDefined();
  });

  it('inserts missing default areas for a city when some are absent', async () => {
    const mockPrisma: any = {
      city: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'city-lower-dir', slug: 'lower-dir' }]),
      },
      area: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ slug: 'timergara', name: 'Timergara' }]),
        createMany: vi.fn().mockResolvedValue({ count: 16 }),
      },
    };

    await ensureDefaultAreas(mockPrisma, 'city-lower-dir');

    expect(mockPrisma.city.findMany).toHaveBeenCalledWith({
      where: { id: 'city-lower-dir' },
      select: { id: true, slug: true },
    });
    expect(mockPrisma.area.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Balambat', slug: 'balambat' }),
      ]),
      skipDuplicates: true,
    });
  });

  it('skips insertion when all default areas already exist for the city', async () => {
    const mockPrisma: any = {
      city: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'city-central-dir', slug: 'central-dir' }]),
      },
      area: {
        findMany: vi.fn().mockResolvedValue(
          DEFAULT_AREAS_BY_CITY_SLUG['central-dir'].map((a) => ({
            slug: a.slug,
            name: a.name,
          })),
        ),
        createMany: vi.fn(),
      },
    };

    await ensureDefaultAreas(mockPrisma, 'city-central-dir');

    expect(mockPrisma.area.createMany).not.toHaveBeenCalled();
  });

  it('loads settlements from area.json correctly', () => {
    const settlements = loadGazetteerLowerDirSettlements();
    expect(settlements.length).toBeGreaterThan(100);
    expect(settlements.some((s) => s.slug === 'timergara')).toBe(true);
    expect(settlements.some((s) => s.slug === 'balambat')).toBe(true);

    const upperDir = loadGazetteerSettlementsForDistrict('upper-dir');
    expect(upperDir.length).toBeGreaterThan(100);
    expect(upperDir.some((s) => s.slug === 'dir-city')).toBe(true);

    const swat = loadGazetteerSettlementsForDistrict('swat');
    expect(swat.length).toBeGreaterThanOrEqual(15);
    expect(swat.some((s) => s.slug === 'mingora')).toBe(true);

    const defaultUpper = getDefaultAreasForCitySlug('upper-dir');
    expect(defaultUpper.length).toBeGreaterThan(100);
  });
});
