import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import {
  handleExtendSubscription,
  handleShortenSubscription,
} from './platform-admin-subscriptions.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';

describe('platform-admin-subscriptions.helper', () => {
  it('throws NotFoundException if restaurant does not exist', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const mockAudit = { log: vi.fn() } as unknown as AuditService;

    await expect(
      handleExtendSubscription(
        mockPrisma,
        mockAudit,
        'r-1',
        { addDays: 10 },
        'admin-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException if restaurant is deactivated', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r-1',
          status: RestaurantStatus.DEACTIVATED,
        }),
      },
    } as unknown as PrismaService;

    const mockAudit = { log: vi.fn() } as unknown as AuditService;

    await expect(
      handleExtendSubscription(
        mockPrisma,
        mockAudit,
        'r-1',
        { addDays: 10 },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('shortens subscription correctly when valid', async () => {
    const trialStartedAt = new Date(Date.now() - 10 * 86400000);
    const currentEndsAt = new Date(Date.now() + 20 * 86400000);
    const targetEndsAt = new Date(Date.now() + 5 * 86400000);

    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r-1',
          status: RestaurantStatus.ACTIVE,
          trialStartedAt,
          subscriptionEndsAt: currentEndsAt,
        }),
        update: vi.fn().mockResolvedValue({
          id: 'r-1',
          subscriptionEndsAt: targetEndsAt,
        }),
      },
    } as unknown as PrismaService;

    const mockAudit = { log: vi.fn() } as unknown as AuditService;

    const result = await handleShortenSubscription(
      mockPrisma,
      mockAudit,
      'r-1',
      {
        subscriptionEndsAt: targetEndsAt.toISOString(),
        confirm: true,
        reason: 'Refund requested',
      },
      'admin-1',
    );

    expect(result.subscriptionEndsAt).toEqual(targetEndsAt);
    expect(mockAudit.log).toHaveBeenCalled();
  });
});
