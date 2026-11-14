import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { handleReplaceAddons } from './menu-item-addons.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('menu-item-addons.helper', () => {
  it('throws NotFoundException when menu item is not found', async () => {
    const mockPrisma = {
      menuItem: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    await expect(
      handleReplaceAddons(mockPrisma, 'res-1', 'item-1', { addons: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deactivates omitted addons and upserts submitted addons', async () => {
    const mockTx = {
      menuItemAddon: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'addon-1' }),
        create: vi.fn().mockResolvedValue({ id: 'addon-2' }),
      },
    };

    const mockPrisma = {
      menuItem: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'item-1', restaurantId: 'res-1' }),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      menuItemAddon: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'addon-1', name: 'Extra Cheese', price: 5000n },
          { id: 'addon-2', name: 'Dip Sauce', price: 3000n },
        ]),
      },
    } as unknown as PrismaService;

    const res = await handleReplaceAddons(mockPrisma, 'res-1', 'item-1', {
      addons: [
        { id: 'addon-1', name: 'Extra Cheese', price: 5000 },
        { name: 'Dip Sauce', price: 3000 },
      ],
    });

    expect(mockTx.menuItemAddon.updateMany).toHaveBeenCalledWith({
      where: {
        restaurantId: 'res-1',
        menuItemId: 'item-1',
        id: { notIn: ['addon-1'] },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(mockTx.menuItemAddon.update).toHaveBeenCalled();
    expect(mockTx.menuItemAddon.create).toHaveBeenCalled();
    expect(res).toHaveLength(2);
  });
});
