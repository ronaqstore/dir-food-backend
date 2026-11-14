import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { handleReplaceVariants } from './menu-item-variants.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('menu-item-variants.helper', () => {
  it('throws NotFoundException when menu item is not found', async () => {
    const mockPrisma = {
      menuItem: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    await expect(
      handleReplaceVariants(mockPrisma, 'res-1', 'item-1', { variants: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deactivates omitted variants and upserts submitted variants', async () => {
    const mockTx = {
      menuItemVariant: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'v-1' }),
        create: vi.fn().mockResolvedValue({ id: 'v-2' }),
      },
    };

    const mockPrisma = {
      menuItem: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'item-1', restaurantId: 'res-1' }),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
      menuItemVariant: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'v-1', name: 'Half', price: 60000n },
          { id: 'v-2', name: 'Full', price: 120000n },
        ]),
      },
    } as unknown as PrismaService;

    const res = await handleReplaceVariants(mockPrisma, 'res-1', 'item-1', {
      variants: [
        { id: 'v-1', name: 'Half', price: 60000 },
        { name: 'Full', price: 120000 },
      ],
    });

    expect(mockTx.menuItemVariant.updateMany).toHaveBeenCalledWith({
      where: {
        restaurantId: 'res-1',
        menuItemId: 'item-1',
        id: { notIn: ['v-1'] },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    expect(res).toHaveLength(2);
  });
});
