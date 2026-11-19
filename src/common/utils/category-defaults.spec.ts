import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_MENU_CATEGORIES,
  isCategoryCovered,
  ensureDefaultCategories,
} from './category-defaults.js';

describe('category-defaults utility (unit)', () => {
  it('exports comprehensive default menu categories', () => {
    expect(DEFAULT_MENU_CATEGORIES.length).toBeGreaterThanOrEqual(16);
    const karahi = DEFAULT_MENU_CATEGORIES.find((c) =>
      c.name.includes('Karahi'),
    );
    expect(karahi).toBeDefined();
  });

  it('correctly matches covered categories', () => {
    expect(isCategoryCovered('Fast Food & Burgers', ['Fast Food'])).toBe(true);
    expect(isCategoryCovered('Karahi & Handi', ['Karahi'])).toBe(true);
    expect(isCategoryCovered('Deals', ['Special Deals'])).toBe(true);
    expect(isCategoryCovered('Pizza', ['Burgers'])).toBe(false);
  });

  it('inserts missing default categories when restaurant has none', async () => {
    const mockPrisma: any = {
      menuCategory: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 16 }),
      },
    };

    await ensureDefaultCategories(mockPrisma, 'rest-123');

    expect(mockPrisma.menuCategory.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 'rest-123' },
      select: { name: true, sortOrder: true },
    });
    expect(mockPrisma.menuCategory.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          restaurantId: 'rest-123',
          name: 'Karahi & Handi',
          isActive: true,
        }),
      ]),
    });
  });

  it('skips already covered categories and only inserts missing ones', async () => {
    const mockPrisma: any = {
      menuCategory: {
        findMany: vi.fn().mockResolvedValue([
          { name: 'Fast Food', sortOrder: 1 },
          { name: 'Karahi', sortOrder: 2 },
          { name: 'Deals', sortOrder: 3 },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 13 }),
      },
    };

    await ensureDefaultCategories(mockPrisma, 'rest-123');

    expect(mockPrisma.menuCategory.createMany).toHaveBeenCalledTimes(1);
    const createCallArgs = mockPrisma.menuCategory.createMany.mock.calls[0][0];
    const createdNames = createCallArgs.data.map((d: any) => d.name);
    expect(createdNames).not.toContain('Fast Food & Burgers');
    expect(createdNames).not.toContain('Karahi & Handi');
    expect(createdNames).not.toContain('Deals');
    expect(createdNames).toContain('Pizza');
    expect(createdNames).toContain('BBQ & Grills');
  });

  it('skips insertion when all categories are covered', async () => {
    const mockPrisma: any = {
      menuCategory: {
        findMany: vi.fn().mockResolvedValue(
          DEFAULT_MENU_CATEGORIES.map((c) => ({
            name: c.name,
            sortOrder: c.sortOrder,
          })),
        ),
        createMany: vi.fn(),
      },
    };

    await ensureDefaultCategories(mockPrisma, 'rest-123');

    expect(mockPrisma.menuCategory.createMany).not.toHaveBeenCalled();
  });
});
