import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RestaurantStatus } from '../generated/prisma/enums.js';
import { AuditService } from '../audit/audit.service.js';
import { UpdateRestaurantStatusDto } from './dto/update-status.dto.js';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getPendingRestaurants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.restaurant.count({
        where: { status: RestaurantStatus.PENDING },
      }),
      this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              status: true,
            },
          },
          _count: {
            select: {
              items: { where: { isActive: true } },
              deliveryAreas: { where: { isActive: true } },
              hours: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getRestaurantDetail(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
          },
        },
        deliveryAreas: {
          include: {
            area: true,
          },
        },
        hours: true,
        _count: {
          select: {
            items: { where: { isActive: true } },
            categories: { where: { isActive: true } },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async updateRestaurantStatus(
    restaurantId: string,
    dto: UpdateRestaurantStatusDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
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

    // Rule: DEACTIVATED is terminal through normal workflows
    if (restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ConflictException('Deactivated restaurants cannot be modified or reactivated');
    }

    if (
      (dto.status === RestaurantStatus.SUSPENDED || dto.status === RestaurantStatus.DEACTIVATED) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException('A reason is required when suspending or deactivating a restaurant');
    }

    const oldStatus = restaurant.status;
    const newStatus = dto.status;
    const now = new Date();

    // APPROVAL WORKFLOW: PENDING -> ACTIVE
    if (newStatus === RestaurantStatus.ACTIVE && oldStatus === RestaurantStatus.PENDING) {
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
        missingPrerequisites.push('At least one active delivery area is required');
      }

      if (missingPrerequisites.length > 0) {
        throw new UnprocessableEntityException({
          code: 'APPROVAL_PREREQUISITES_NOT_MET',
          message: 'Cannot approve restaurant: prerequisites not satisfied',
          details: missingPrerequisites,
        });
      }

      // Starts 30-day trial
      const subscriptionEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updated = await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          status: RestaurantStatus.ACTIVE,
          statusReason: dto.reason ?? null,
          statusChangedAt: now,
          trialStartedAt: now,
          subscriptionEndsAt,
        },
      });

      await this.auditService.log({
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

    // REACTIVATION: SUSPENDED -> ACTIVE
    if (newStatus === RestaurantStatus.ACTIVE && oldStatus === RestaurantStatus.SUSPENDED) {
      // Rule: Reactivating never alters subscription dates.
      const updated = await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          status: RestaurantStatus.ACTIVE,
          statusReason: dto.reason ?? null,
          statusChangedAt: now,
        },
      });

      await this.auditService.log({
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

    // SUSPEND OR DEACTIVATE
    const updated = await this.prisma.restaurant.update({
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

    await this.auditService.log({
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
}
