import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import { QueryAdminOrdersDto } from '../dto/query-admin-orders.dto.js';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto.js';

@Injectable()
export class PlatformAdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search order intents by reference code or customer details for support.
   */
  async searchOrderIntents(query: QueryAdminOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.ref?.trim()) {
      where.reference = {
        contains: query.ref.trim(),
        mode: 'insensitive',
      };
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
        { landmark: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.orderIntent.count({ where }),
      this.prisma.orderIntent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              contactPhone: true,
              whatsappNumber: true,
            },
          },
          items: true,
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Platform-wide 7-day or 30-day activity summary.
   */
  async getActivitySummary(range = '7d') {
    const days = range === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalRestaurants,
      pendingCount,
      activeCount,
      suspendedCount,
      deactivatedCount,
      intentsCreated,
      intentsWhatsappOpened,
      topRestaurants,
    ] = await Promise.all([
      this.prisma.restaurant.count(),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.PENDING } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.ACTIVE } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.SUSPENDED } }),
      this.prisma.restaurant.count({ where: { status: RestaurantStatus.DEACTIVATED } }),
      this.prisma.orderIntent.count({ where: { createdAt: { gte: since } } }),
      this.prisma.orderIntent.count({
        where: { createdAt: { gte: since }, whatsappOpenedAt: { not: null } },
      }),
      this.prisma.orderIntent.groupBy({
        by: ['restaurantId'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    const restaurantIds = topRestaurants.map((r) => r.restaurantId);
    const restaurants = await this.prisma.restaurant.findMany({
      where: { id: { in: restaurantIds } },
      select: { id: true, name: true, slug: true },
    });
    const restMap = new Map(restaurants.map((r) => [r.id, r]));

    const rankedRestaurants = topRestaurants.map((tr) => ({
      restaurantId: tr.restaurantId,
      name: restMap.get(tr.restaurantId)?.name ?? 'Unknown',
      slug: restMap.get(tr.restaurantId)?.slug ?? '',
      requestsCreated: tr._count.id,
    }));

    const openRate =
      intentsCreated > 0
        ? Math.round((intentsWhatsappOpened / intentsCreated) * 10000) / 100
        : 0;

    return {
      range,
      since,
      restaurants: {
        total: totalRestaurants,
        pending: pendingCount,
        active: activeCount,
        suspended: suspendedCount,
        deactivated: deactivatedCount,
      },
      orderIntents: {
        requestsCreated: intentsCreated,
        whatsappOpened: intentsWhatsappOpened,
        whatsappOpenRatePercent: openRate,
      },
      topActiveRestaurants: rankedRestaurants,
    };
  }

  /**
   * Audit logs viewer.
   */
  async getAuditLogs(query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.restaurantId) {
      where.restaurantId = query.restaurantId;
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.action) {
      where.action = query.action;
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
            },
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
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
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

