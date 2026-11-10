import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RestaurantStatus, UserRole } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import type { AuthService } from '../../auth/services/auth.service.js';
import type { UpdateRestaurantStatusDto } from '../dto/update-status.dto.js';

export async function handleUpdateRestaurantStatus(
  prisma: PrismaService,
  auditService: AuditService,
  restaurantId: string,
  dto: UpdateRestaurantStatusDto,
  adminUserId: string,
  ipAddress?: string,
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      hours: true,
      items: { where: { isActive: true } },
      deliveryAreas: { where: { isActive: true } },
    },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  if (restaurant.status === RestaurantStatus.DEACTIVATED) {
    throw new ConflictException(
      'Deactivated restaurants cannot be modified or reactivated',
    );
  }

  if (
    (dto.status === RestaurantStatus.SUSPENDED ||
      dto.status === RestaurantStatus.DEACTIVATED) &&
    !dto.reason?.trim()
  ) {
    throw new BadRequestException(
      'A reason is required when suspending or deactivating a restaurant',
    );
  }

  const oldStatus = restaurant.status;
  const newStatus = dto.status;
  const now = new Date();

  if (
    newStatus === RestaurantStatus.ACTIVE &&
    oldStatus === RestaurantStatus.PENDING
  ) {
    const missingPrerequisites: string[] = [];

    if (!restaurant.whatsappNumber) {
      missingPrerequisites.push('A valid WhatsApp contact number is required');
    }
    if (restaurant.hours.length === 0) {
      missingPrerequisites.push('Configured opening hours are required');
    }
    if (restaurant.items.length === 0) {
      missingPrerequisites.push('At least one active menu item is required');
    }
    if (restaurant.deliveryAreas.length === 0) {
      missingPrerequisites.push(
        'At least one active delivery area is required',
      );
    }

    if (missingPrerequisites.length > 0) {
      throw new UnprocessableEntityException({
        code: 'APPROVAL_PREREQUISITES_NOT_MET',
        message: 'Cannot approve restaurant: prerequisites not satisfied',
        details: missingPrerequisites,
      });
    }

    const subscriptionEndsAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: RestaurantStatus.ACTIVE,
        statusReason: dto.reason ?? null,
        statusChangedAt: now,
        trialStartedAt: now,
        subscriptionEndsAt,
      },
    });

    await auditService.log({
      actorUserId: adminUserId,
      restaurantId: restaurant.id,
      action: 'RESTAURANT_APPROVED',
      entityType: 'restaurant',
      entityId: restaurant.id,
      details: {
        oldStatus,
        newStatus,
        trialStartedAt: now,
        subscriptionEndsAt,
      },
      ipAddress,
    });

    return updated;
  }

  if (
    newStatus === RestaurantStatus.ACTIVE &&
    oldStatus === RestaurantStatus.SUSPENDED
  ) {
    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: RestaurantStatus.ACTIVE,
        statusReason: dto.reason ?? null,
        statusChangedAt: now,
      },
    });

    await auditService.log({
      actorUserId: adminUserId,
      restaurantId: restaurant.id,
      action: 'RESTAURANT_REACTIVATED',
      entityType: 'restaurant',
      entityId: restaurant.id,
      details: {
        oldStatus,
        newStatus,
        reason: dto.reason,
      },
      ipAddress,
    });

    return updated;
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      status: newStatus,
      statusReason: dto.reason ?? null,
      statusChangedAt: now,
    },
  });

  const action =
    newStatus === RestaurantStatus.SUSPENDED
      ? 'RESTAURANT_SUSPENDED'
      : 'RESTAURANT_DEACTIVATED';

  await auditService.log({
    actorUserId: adminUserId,
    restaurantId: restaurant.id,
    action,
    entityType: 'restaurant',
    entityId: restaurant.id,
    details: {
      oldStatus,
      newStatus,
      reason: dto.reason,
    },
    ipAddress,
  });

  return updated;
}

export async function handleIssueSetupLink(
  prisma: PrismaService,
  authService: AuthService,
  auditService: AuditService,
  restaurantId: string,
  adminUserId: string,
  ipAddress?: string,
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      users: {
        where: { role: UserRole.RESTAURANT_OWNER },
      },
    },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  const owner = restaurant.users[0];
  if (!owner) {
    throw new NotFoundException('No owner user found for this restaurant');
  }

  const res = await authService.issuePasswordSetupLink(owner.id);

  await auditService.log({
    actorUserId: adminUserId,
    restaurantId,
    action: 'PASSWORD_SETUP_LINK_ISSUED',
    entityType: 'user',
    entityId: owner.id,
    details: {
      userId: owner.id,
      userPhone: owner.phone,
      replacedPreviousLink: res.replacedPreviousLink,
    },
    ipAddress,
  });

  return res;
}
