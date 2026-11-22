import { describe, it, expect, vi } from 'vitest';
import {
  handleGetOwnerOrderIntents,
  handleGetOwnerStats,
  handleGetOwnerOrderIntentDetail,
} from './order-intents-owner.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('order-intents-owner.helper', () => {
  it('formats owner order intents correctly', async () => {
    const mockPrisma = {
      orderIntent: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'oi-1',
            publicRef: 'TM-7K4P9Q',
            status: 'WHATSAPP_HANDOFF_READY',
            customerName: 'Ahmad',
            customerPhone: '03001234567',
            deliveryAreaNameSnapshot: 'Timergara',
            landmark: 'College Gate',
            directions: null,
            subtotal: 100000n,
            deliveryFee: 10000n,
            deliveryFeeStatus: 'CONFIRMED',
            items: [],
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
            whatsappOpenedAt: null,
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await handleGetOwnerOrderIntents(mockPrisma, 'rest-1', {
      page: 1,
      limit: 10,
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].reference).toBe('TM-7K4P9Q');
    expect(result.meta.total).toBe(1);
  });

  it('aggregates owner stats correctly', async () => {
    const mockPrisma = {
      orderIntent: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'oi-1',
            whatsappOpenedAt: new Date(),
            items: [
              {
                itemNameSnapshot: 'Biryani',
                variantNameSnapshot: null,
                quantity: 2,
              },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;

    const result = await handleGetOwnerStats(mockPrisma, 'rest-1', '7d');
    expect(result.requestsCreated).toBe(1);
    expect(result.whatsappOpened).toBe(1);
    expect(result.whatsappOpenRate).toBe(100);
    expect(result.topItems).toHaveLength(1);
  });

  it('retrieves and formats order intent detail with addons', async () => {
    const mockPrisma = {
      orderIntent: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'oi-1',
          publicRef: 'TM-7K4P9Q',
          status: 'WHATSAPP_HANDOFF_READY',
          customerName: 'Ahmad',
          customerPhone: '03001234567',
          deliveryAreaNameSnapshot: 'Timergara',
          landmark: 'College Gate',
          directions: null,
          mapLat: null,
          mapLng: null,
          subtotal: 100000n,
          deliveryFee: 10000n,
          deliveryFeeStatus: 'KNOWN',
          items: [
            {
              itemNameSnapshot: 'Burger',
              variantNameSnapshot: null,
              addonsSnapshot: [{ id: 'a-1', name: 'Extra Cheese', price: 50 }],
              quantity: 1,
              unitPrice: 100000n,
              lineTotal: 100000n,
            },
          ],
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
          whatsappOpenedAt: null,
        }),
      },
    } as unknown as PrismaService;

    const result = await handleGetOwnerOrderIntentDetail(
      mockPrisma,
      'rest-1',
      'oi-1',
    );
    expect(result.id).toBe('oi-1');
    expect(result.items[0].addons).toHaveLength(1);
    expect(result.items[0].addons?.[0].name).toBe('Extra Cheese');
  });
});
