import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { QueryAreasDto } from '../dto/query-areas.dto.js';

export async function handleListAreas(
  prisma: PrismaService,
  query?: QueryAreasDto | string,
) {
  const isDto = query && typeof query === 'object';
  const cityId = isDto
    ? query.cityId
    : typeof query === 'string'
      ? query
      : undefined;
  const q = isDto ? query.q?.trim() : undefined;
  const needsReview = isDto ? query.needsReview : undefined;
  const isPaginated =
    isDto && (query.page !== undefined || query.limit !== undefined);

  const andConditions: Prisma.AreaWhereInput[] = [];

  if (cityId) {
    andConditions.push({ cityId });
  }

  if (needsReview === true) {
    andConditions.push({ isVerified: false });
  }

  if (q) {
    andConditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.AreaWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  let sortField = isDto ? query.sortBy : undefined;
  let sortDirection: 'asc' | 'desc' =
    isDto && query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';

  if (isDto && query.sort) {
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

  let orderBy:
    | Prisma.AreaOrderByWithRelationInput
    | Prisma.AreaOrderByWithRelationInput[] = [
    { sortOrder: 'asc' },
    { name: 'asc' },
  ];
  if (sortField) {
    switch (sortField) {
      case 'name':
        orderBy = { name: sortDirection };
        break;
      case 'sortOrder':
        orderBy = { sortOrder: sortDirection };
        break;
      case 'isActive':
        orderBy = { isActive: sortDirection };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortDirection };
        break;
      case 'slug':
        orderBy = { slug: sortDirection };
        break;
    }
  }

  const page = isDto && query.page ? Math.max(1, query.page) : 1;
  const limit =
    isDto && query.limit ? Math.min(500, Math.max(1, query.limit)) : 20;
  const skip = (page - 1) * limit;

  if (isPaginated) {
    const [total, areas] = await Promise.all([
      prisma.area.count({ where }),
      prisma.area.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          city: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              restaurantAreas: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = areas.map((area) => ({
      id: area.id,
      cityId: area.cityId,
      cityName: area.city.name,
      citySlug: area.city.slug,
      name: area.name,
      slug: area.slug,
      sortOrder: area.sortOrder,
      isActive: area.isActive,
      isVerified: area.isVerified,
      isCustomCreated: area.isCustomCreated,
      activeRestaurantsCount: area._count.restaurantAreas,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    }));

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const areas = await prisma.area.findMany({
    where,
    orderBy,
    include: {
      city: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          restaurantAreas: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
  });

  return areas.map((area) => ({
    id: area.id,
    cityId: area.cityId,
    cityName: area.city.name,
    citySlug: area.city.slug,
    name: area.name,
    slug: area.slug,
    sortOrder: area.sortOrder,
    isActive: area.isActive,
    isVerified: area.isVerified,
    isCustomCreated: area.isCustomCreated,
    activeRestaurantsCount: area._count.restaurantAreas,
    createdAt: area.createdAt,
    updatedAt: area.updatedAt,
  }));
}
