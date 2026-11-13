import type { Prisma } from '../../generated/prisma/client.js';
import { RestaurantStatus, UserRole } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { QueryRestaurantsDto } from '../dto/query-restaurants.dto.js';

export async function handleListRestaurants(
  prisma: PrismaService,
  query: QueryRestaurantsDto,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const andConditions: Prisma.RestaurantWhereInput[] = [];

  if (query.status) {
    andConditions.push({ status: query.status });
  }
  if (query.cityId) {
    andConditions.push({ cityId: query.cityId });
  }
  if (query.q?.trim()) {
    const q = query.q.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
        { whatsappNumber: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  if (query.subStatus) {
    switch (query.subStatus.toUpperCase()) {
      case 'ACTIVE':
        andConditions.push({ subscriptionEndsAt: { gt: now } });
        break;
      case 'EXPIRING':
        andConditions.push({ subscriptionEndsAt: { gt: now, lte: in7Days } });
        break;
      case 'EXPIRED':
        andConditions.push({
          OR: [
            { subscriptionEndsAt: { lte: now } },
            { trialStartedAt: { not: null }, subscriptionEndsAt: null },
          ],
        });
        break;
      case 'TRIAL':
        andConditions.push({
          trialStartedAt: { not: null },
          subscriptionEndsAt: { gt: now },
          status: RestaurantStatus.ACTIVE,
        });
        break;
    }
  }

  const where: Prisma.RestaurantWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  let sortField = query.sortBy;
  let sortDirection: 'asc' | 'desc' =
    query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (query.sort) {
    const parts = query.sort.split('.');
    if (parts[0]) {
      sortField = parts[0];
    }
    if (
      parts[1]?.toLowerCase() === 'asc' ||
      parts[1]?.toLowerCase() === 'desc'
    ) {
      sortDirection = parts[1].toLowerCase() as 'asc' | 'desc';
    }
  }

  let orderBy: Prisma.RestaurantOrderByWithRelationInput = {
    createdAt: 'desc',
  };
  if (sortField) {
    switch (sortField) {
      case 'name':
        orderBy = { name: sortDirection };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortDirection };
        break;
      case 'status':
        orderBy = { status: sortDirection };
        break;
      case 'subscriptionEndsAt':
        orderBy = { subscriptionEndsAt: sortDirection };
        break;
      case 'slug':
        orderBy = { slug: sortDirection };
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }
  }

  const [total, items, totalActive, totalExpiring, totalExpired, totalTrial] =
    await Promise.all([
      prisma.restaurant.count({ where }),
      prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          users: {
            where: { role: UserRole.RESTAURANT_OWNER },
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
      prisma.restaurant.count({
        where: { subscriptionEndsAt: { gt: now } },
      }),
      prisma.restaurant.count({
        where: { subscriptionEndsAt: { gt: now, lte: in7Days } },
      }),
      prisma.restaurant.count({
        where: {
          OR: [
            { subscriptionEndsAt: { lte: now } },
            { trialStartedAt: { not: null }, subscriptionEndsAt: null },
          ],
        },
      }),
      prisma.restaurant.count({
        where: {
          trialStartedAt: { not: null },
          subscriptionEndsAt: { gt: now },
          status: RestaurantStatus.ACTIVE,
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
      subCounts: {
        active: totalActive,
        expiring: totalExpiring,
        expired: totalExpired,
        trial: totalTrial,
      },
    },
  };
}
