import { describe, it, expect, vi } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { handleChangeSlug } from './platform-admin-slug.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';

describe('platform-admin-slug.helper', () => {
  it('throws NotFoundException if restaurant does not exist', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as PrismaService;
    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleChangeSlug(
        mockPrisma,
        mockAudit,
        'r-1',
        { slug: 'new-slug' },
        'admin-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if slug is too short', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi.fn().mockResolvedValue({ id: 'r-1', slug: 'old-slug' }),
      },
    } as PrismaService;
    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleChangeSlug(mockPrisma, mockAudit, 'r-1', { slug: 'a' }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws ConflictException if slug is already used by another restaurant', async () => {
    const mockPrisma = {
      restaurant: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: 'r-1', slug: 'old-slug' })
          .mockResolvedValueOnce({ id: 'r-2', slug: 'taken-slug' }),
      },
    } as PrismaService;
    const mockAudit = { log: vi.fn() } as AuditService;

    await expect(
      handleChangeSlug(
        mockPrisma,
        mockAudit,
        'r-1',
        { slug: 'taken-slug' },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });
});
