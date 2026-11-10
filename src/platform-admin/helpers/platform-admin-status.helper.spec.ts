import { describe, it, expect, vi } from 'vitest';
import {
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import {
  handleUpdateRestaurantStatus,
  handleIssueSetupLink,
} from './platform-admin-status.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { AuthService } from '../../auth/services/auth.service.js';

describe('platform-admin-status.helper', () => {
  it('throws NotFoundException if restaurant does not exist', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as PrismaService;

    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleUpdateRestaurantStatus(
        mockPrisma,
        mockAudit,
        'r-1',
        { status: RestaurantStatus.ACTIVE },
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
    } as PrismaService;

    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleUpdateRestaurantStatus(
        mockPrisma,
        mockAudit,
        'r-1',
        { status: RestaurantStatus.ACTIVE },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('throws UnprocessableEntityException if approval prerequisites are not met', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'r-1',
          status: RestaurantStatus.PENDING,
          whatsappNumber: null,
          hours: [],
          items: [],
          deliveryAreas: [],
        }),
      },
    } as PrismaService;

    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleUpdateRestaurantStatus(
        mockPrisma,
        mockAudit,
        'r-1',
        { status: RestaurantStatus.ACTIVE },
        'admin-1',
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('throws NotFoundException in handleIssueSetupLink if restaurant not found', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as PrismaService;
    const mockAuth = {} as AuthService;
    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleIssueSetupLink(mockPrisma, mockAuth, mockAudit, 'r-1', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
