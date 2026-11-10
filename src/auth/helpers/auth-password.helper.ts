import { BadRequestException, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import type { PasswordSetupLinkResponseDto } from '../dto/password-setup-link-response.dto.js';
import type { SetupPasswordDto } from '../dto/setup-password.dto.js';
import type { ChangePasswordDto } from '../dto/change-password.dto.js';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  isWellFormedToken,
} from '../../common/utils/token.helper.js';

export const SETUP_PASSWORD_PATH = '/setup-password';

export async function handleBuildSetupLink(
  prisma: PrismaService | Prisma.TransactionClient,
  configService: AppConfigurationService,
  userId: string,
): Promise<{ setupUrl: string; expiresAt: Date }> {
  const token = generateOpaqueToken();
  const setupTokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(
    Date.now() + configService.passwordSetupTokenTtlMinutes * 60_000,
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      setupTokenHash,
      setupExpiresAt: expiresAt,
    },
  });

  const setupUrl = `${configService.appBaseUrl}${SETUP_PASSWORD_PATH}?token=${token}`;
  return { setupUrl, expiresAt };
}

export async function handleIssuePasswordSetupLink(
  prisma: PrismaService,
  configService: AppConfigurationService,
  userId: string,
): Promise<PasswordSetupLinkResponseDto> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  const replacedPreviousLink = Boolean(
    user.setupTokenHash &&
    user.setupExpiresAt &&
    user.setupExpiresAt.getTime() > Date.now(),
  );

  const link = await handleBuildSetupLink(prisma, configService, user.id);

  return {
    userId: user.id,
    userName: user.name,
    userPhone: user.phone,
    expiresAt: link.expiresAt,
    setupUrl: link.setupUrl,
    setupLink: link.setupUrl,
    replacedPreviousLink,
  };
}

export async function handleSetupPassword(
  prisma: PrismaService,
  dto: SetupPasswordDto,
  saltRounds: number,
) {
  if (!isWellFormedToken(dto.token)) {
    throw new BadRequestException('Invalid or expired setup token');
  }

  const tokenHash = hashOpaqueToken(dto.token);

  const user = await prisma.user.findFirst({
    where: { setupTokenHash: tokenHash },
  });

  if (!user || !user.setupExpiresAt) {
    throw new BadRequestException('Invalid or expired setup token');
  }

  if (user.setupExpiresAt.getTime() <= Date.now()) {
    throw new BadRequestException('Invalid or expired setup token');
  }

  const passwordHash = await bcrypt.hash(dto.password, saltRounds);

  const consumed = await prisma.user.updateMany({
    where: {
      id: user.id,
      setupTokenHash: tokenHash,
      setupExpiresAt: { gt: new Date() },
    },
    data: {
      passwordHash,
      setupTokenHash: null,
      setupExpiresAt: null,
    },
  });

  if (consumed.count !== 1) {
    throw new BadRequestException('Invalid or expired setup token');
  }

  return { success: true, message: 'Password set successfully' };
}

export async function handleChangePassword(
  prisma: PrismaService,
  userId: string,
  dto: ChangePasswordDto,
  saltRounds: number,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.passwordHash) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  const passwordMatches = await bcrypt.compare(
    dto.currentPassword,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new BadRequestException('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true, message: 'Password changed successfully' };
}
