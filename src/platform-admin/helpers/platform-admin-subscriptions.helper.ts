import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { ExtendSubscriptionDto } from '../dto/extend-subscription.dto.js';
import type { ShortenSubscriptionDto } from '../dto/shorten-subscription.dto.js';

export async function handleExtendSubscription(
  prisma: PrismaService,
  auditService: AuditService,
  id: string,
  dto: ExtendSubscriptionDto,
  adminUserId: string,
  ipAddress?: string,
) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  if (restaurant.status === RestaurantStatus.DEACTIVATED) {
    throw new ConflictException(
      'Cannot extend subscription of a deactivated restaurant',
    );
  }

  if (!restaurant.trialStartedAt) {
    throw new ConflictException(
      'Cannot extend subscription: restaurant has never been approved',
    );
  }

  const hasEndsAt =
    dto.subscriptionEndsAt !== undefined && dto.subscriptionEndsAt !== null;
  const hasAddDays = dto.addDays !== undefined && dto.addDays !== null;

  if ((hasEndsAt && hasAddDays) || (!hasEndsAt && !hasAddDays)) {
    throw new BadRequestException(
      'Provide exactly one of subscriptionEndsAt or addDays',
    );
  }

  const now = new Date();
  let newEndsAt: Date;

  if (hasAddDays) {
    const currentEnd = restaurant.subscriptionEndsAt
      ? new Date(restaurant.subscriptionEndsAt)
      : now;
    const baseTime =
      currentEnd.getTime() > now.getTime()
        ? currentEnd.getTime()
        : now.getTime();
    newEndsAt = new Date(baseTime + (dto.addDays ?? 0) * 24 * 60 * 60 * 1000);
  } else {
    newEndsAt = new Date(dto.subscriptionEndsAt ?? '');
    if (isNaN(newEndsAt.getTime()) || newEndsAt.getTime() <= now.getTime()) {
      throw new BadRequestException(
        'subscriptionEndsAt must be a valid future ISO timestamp',
      );
    }
    if (
      restaurant.subscriptionEndsAt &&
      newEndsAt.getTime() <= new Date(restaurant.subscriptionEndsAt).getTime()
    ) {
      throw new BadRequestException(
        'subscriptionEndsAt must be later than the current subscription end',
      );
    }
  }

  const oldEndsAt = restaurant.subscriptionEndsAt;

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      subscriptionEndsAt: newEndsAt,
    },
  });

  await auditService.log({
    actorUserId: adminUserId,
    restaurantId: id,
    action: 'RESTAURANT_SUBSCRIPTION_EXTENDED',
    entityType: 'restaurant',
    entityId: id,
    details: {
      oldEndsAt,
      newEndsAt,
      addedDays: dto.addDays ?? null,
    },
    ipAddress,
  });

  return {
    restaurantId: updated.id,
    subscriptionEndsAt: updated.subscriptionEndsAt,
    previousSubscriptionEndsAt: oldEndsAt,
  };
}

export async function handleShortenSubscription(
  prisma: PrismaService,
  auditService: AuditService,
  id: string,
  dto: ShortenSubscriptionDto,
  adminUserId: string,
  ipAddress?: string,
) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  if (restaurant.status === RestaurantStatus.DEACTIVATED) {
    throw new ConflictException(
      'Cannot modify subscription of a deactivated restaurant',
    );
  }

  if (!restaurant.trialStartedAt) {
    throw new ConflictException('Restaurant has never been approved');
  }

  if (dto.confirm !== true) {
    throw new BadRequestException('confirm must be explicitly true');
  }

  if (!dto.reason?.trim()) {
    throw new BadRequestException(
      'A reason is required to shorten a subscription',
    );
  }

  const newEndsAt = new Date(dto.subscriptionEndsAt);
  if (isNaN(newEndsAt.getTime())) {
    throw new BadRequestException('Invalid subscriptionEndsAt timestamp');
  }

  if (newEndsAt.getTime() < new Date(restaurant.trialStartedAt).getTime()) {
    throw new BadRequestException(
      'subscriptionEndsAt cannot be earlier than initial trialStartedAt',
    );
  }

  if (
    !restaurant.subscriptionEndsAt ||
    newEndsAt.getTime() >= new Date(restaurant.subscriptionEndsAt).getTime()
  ) {
    throw new BadRequestException(
      'Corrective shortening requires a timestamp earlier than current subscriptionEndsAt',
    );
  }

  const oldEndsAt = restaurant.subscriptionEndsAt;

  const updated = await prisma.restaurant.update({
    where: { id },
    data: {
      subscriptionEndsAt: newEndsAt,
    },
  });

  await auditService.log({
    actorUserId: adminUserId,
    restaurantId: id,
    action: 'RESTAURANT_SUBSCRIPTION_SHORTENED',
    entityType: 'restaurant',
    entityId: id,
    details: {
      oldEndsAt,
      newEndsAt,
      reason: dto.reason.trim(),
    },
    ipAddress,
  });

  return {
    restaurantId: updated.id,
    subscriptionEndsAt: updated.subscriptionEndsAt,
    previousSubscriptionEndsAt: oldEndsAt,
    reason: dto.reason.trim(),
  };
}
