import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  handleIssuePasswordSetupLink,
  handleSetupPassword,
  handleChangePassword,
} from './auth-password.helper.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';

describe('auth-password.helper', () => {
  it('throws NotFoundException if user does not exist when issuing link', async () => {
    const mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as PrismaService;

    const mockConfig = {
      passwordSetupTokenTtlMinutes: 1440,
      appBaseUrl: 'http://localhost:3000',
    } as AppConfigurationService;

    await expect(
      handleIssuePasswordSetupLink(mockPrisma, mockConfig, 'u-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException for malformed setup token', async () => {
    const mockPrisma = {} as PrismaService;

    await expect(
      handleSetupPassword(
        mockPrisma,
        { token: 'invalid!', password: 'password123' },
        10,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException if user not found when changing password', async () => {
    const mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as PrismaService;

    await expect(
      handleChangePassword(
        mockPrisma,
        'u-1',
        { currentPassword: 'old', newPassword: 'new' },
        10,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
