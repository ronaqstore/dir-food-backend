import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformAdminOperationsService } from './platform-admin-operations.service.js';

describe('PlatformAdminOperationsService (unit)', () => {
  let service: PlatformAdminOperationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      orderIntent: {
        count: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      restaurant: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new PlatformAdminOperationsService(mockPrisma);
  });

  describe('searchOrderIntents', () => {
    it('searches order intents by ref or keyword', async () => {
      mockPrisma.orderIntent.count.mockResolvedValue(1);
      mockPrisma.orderIntent.findMany.mockResolvedValue([
        {
          id: 'oi1',
          reference: 'TM-7K4P9Q',
          customerName: 'Ahmad',
          restaurant: { id: 'r1', name: 'Al-Noor' },
          items: [],
        },
      ]);

      const res = await service.searchOrderIntents({ ref: 'TM-7K4P9Q', page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.data[0].reference).toBe('TM-7K4P9Q');
    });
  });

  describe('getActivitySummary', () => {
    it('aggregates platform stats for 7d', async () => {
      mockPrisma.restaurant.count.mockResolvedValue(10);
      mockPrisma.orderIntent.count
        .mockResolvedValueOnce(50) // intents created
        .mockResolvedValueOnce(35); // intents whatsapp opened
      mockPrisma.orderIntent.groupBy.mockResolvedValue([
        { restaurantId: 'r1', _count: { id: 25 } },
      ]);
      mockPrisma.restaurant.findMany.mockResolvedValue([
        { id: 'r1', name: 'Al-Noor', slug: 'al-noor' },
      ]);

      const res = await service.getActivitySummary('7d');
      expect(res.range).toBe('7d');
      expect(res.orderIntents.requestsCreated).toBe(50);
      expect(res.orderIntents.whatsappOpened).toBe(35);
      expect(res.orderIntents.whatsappOpenRatePercent).toBe(70);
      expect(res.topActiveRestaurants).toHaveLength(1);
      expect(res.topActiveRestaurants[0].name).toBe('Al-Noor');
    });
  });

  describe('getAuditLogs', () => {
    it('returns filtered and paginated audit logs', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log1',
          action: 'RESTAURANT_APPROVED',
          actor: { id: 'a1', name: 'Admin' },
          restaurant: { id: 'r1', name: 'Al-Noor' },
        },
      ]);

      const res = await service.getAuditLogs({ restaurantId: 'r1', page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
      expect(res.data[0].action).toBe('RESTAURANT_APPROVED');
    });
  });
});

