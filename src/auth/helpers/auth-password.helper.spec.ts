import { describe, it, expect, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  handleIssuePasswordSetupLink,
  handleSetupPassword,
  handleChangePassword,
  assertNotLockedOut,
  handleFailedLoginAttempt,
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

  it('throws HttpException if account is currently locked', () => {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 10 * 60_000);
    expect(() => assertNotLockedOut(lockedUntil, now)).toThrow();
  });

  it('allows access if lockedUntil is in the past', () => {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() - 10 * 60_000);
    expect(() => assertNotLockedOut(lockedUntil, now)).not.toThrow();
  });

  it('handles failed login and locks after reaching max attempts', async () => {
    const mockPrisma = {
      user: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaService;

    const now = new Date();
    await expect(
      handleFailedLoginAttempt(mockPrisma, 'u-1', 4, now, 5, 15),
    ).rejects.toThrow();

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u-1' },
        data: expect.objectContaining({ failedLoginCount: 5 }),
      }),
    );
  });
});
