import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import {
  RestaurantStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';

export async function handleGetMe(
  prisma: PrismaService,
  userId: string,
  tokenVersion?: number,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      tokenVersion: true,
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          trialStartedAt: true,
          subscriptionEndsAt: true,
          whatsappNumber: true,
          contactPhone: true,
          manualStatus: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (
    tokenVersion !== undefined &&
    user.tokenVersion !== undefined &&
    tokenVersion !== user.tokenVersion
  ) {
    throw new UnauthorizedException(
      'Session expired due to password change or logout. Please log in again.',
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenException(
      'Your account has been disabled. Contact support.',
    );
  }

  if (user.role === UserRole.RESTAURANT_OWNER) {
    if (!user.restaurant) {
      throw new UnauthorizedException(
        'User is not associated with any restaurant',
      );
    }
    if (user.restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ForbiddenException('This restaurant has been deactivated.');
    }
  }

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    restaurant: user.restaurant,
  };
}
