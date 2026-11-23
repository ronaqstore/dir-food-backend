import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  isRestaurantOpenNow,
  getCurrentKarachiTime,
  dateTimeToTimeString,
  parseTimeToMinutes,
} from '../../restaurant-hours/utils/opening-hours.util.js';
import type { QueryPublicRestaurantsDto } from '../dto/query-public-restaurants.dto.js';
import {
  filterRestaurantsByCuisine,
  buildRestaurantCard,
  sortRestaurantCards,
  transformPublicMenuCategories,
} from '../helpers/public-catalog.helper.js';

export interface PublicRestaurantCard {
  slug: string;
  name: string;
  cuisines: string[];
  logoUrl: string | null;
  minOrderAmount: bigint | null;
  isOpenNow: boolean;
  availabilityText: string;
  nextOpenAt: string | null;
  hasDeals?: boolean;
}

export interface PublicRestaurantProfile {
  slug: string;
  name: string;
  description: string | null;
  cuisines: string[];
  logoUrl: string | null;
  coverUrl: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  addressText: string | null;
  minOrderAmount: bigint | null;
  isOpenNow: boolean;
  manualStatus: string;
  unavailableNote: string | null;
  availabilityText: string;
  nextOpenAt: string | null;
  todayHours: Array<{ openTime: string; closeTime: string }>;
  deliveryAreas: Array<{
    areaId: string;
    name: string;
    deliveryFee: bigint | null;
    minOrderAmount: bigint | null;
  }>;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: bigint | null;
  basePrice?: bigint | null;
  originalPrice: bigint | null;
  isDeal: boolean;
  isAvailable: boolean;
  variants: Array<{
    id: string;
    name: string;
    price: bigint;
  }>;
  addons: Array<{
    id: string;
    name: string;
    price: bigint;
  }>;
}

export interface PublicMenuCategory {
  id: string;
  name: string;
  items: PublicMenuItem[];
}

@Injectable()
export class PublicRestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurants(query: QueryPublicRestaurantsDto) {
    const now = new Date();
    const andConditions: Prisma.RestaurantWhereInput[] = [
      {
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: {
          gt: now,
        },
      },
    ];

    if (query.areaId) {
      andConditions.push({
        deliveryAreas: {
          some: {
            areaId: query.areaId,
            isActive: true,
            area: {
              isActive: true,
            },
          },
        },
      });
    } else if (query.cityId) {
      andConditions.push({
        OR: [
          { cityId: query.cityId },
          {
            deliveryAreas: {
              some: {
                isActive: true,
                area: {
                  cityId: query.cityId,
                  isActive: true,
                },
              },
            },
          },
        ],
      });
    }

    if (query.q) {
      const trimmedQ = query.q.trim();
      andConditions.push({
        OR: [
          { name: { contains: trimmedQ, mode: 'insensitive' } },
          { description: { contains: trimmedQ, mode: 'insensitive' } },
          {
            categories: {
              some: {
                isActive: true,
                name: { contains: trimmedQ, mode: 'insensitive' },
              },
            },
          },
          {
            items: {
              some: {
                isActive: true,
                name: { contains: trimmedQ, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    const where: Prisma.RestaurantWhereInput = {
      AND: andConditions,
    };

    const restaurants = await this.prisma.restaurant.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        cuisines: true,
        logoUrl: true,
        minOrderAmount: true,
        manualStatus: true,
        unavailableNote: true,
        hours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
        categories: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { sortOrder: 'asc' },
        },
        items: {
          where: { isActive: true },
          select: { name: true, isDeal: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const filteredList = filterRestaurantsByCuisine(restaurants, query.cuisine);

    const evaluated: PublicRestaurantCard[] = filteredList.map((r) =>
      buildRestaurantCard(r, now),
    );

    const dealsFiltered = query.hasDeals
      ? evaluated.filter((r) => r.hasDeals)
      : evaluated;

    const openFiltered = query.openNow
      ? dealsFiltered.filter((r) => r.isOpenNow)
      : dealsFiltered;

    const finalFiltered = sortRestaurantCards(openFiltered, query.sortBy);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const total = finalFiltered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const paginated = finalFiltered.slice(startIndex, startIndex + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getRestaurantBySlug(slug: string): Promise<PublicRestaurantProfile> {
    const now = new Date();
    const normalizedSlug = slug.trim().toLowerCase();
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        cuisines: true,
        logoUrl: true,
        coverUrl: true,
        contactPhone: true,
        whatsappNumber: true,
        addressText: true,
        minOrderAmount: true,
        status: true,
        subscriptionEndsAt: true,
        manualStatus: true,
        unavailableNote: true,
        hours: {
          select: {
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        },
        deliveryAreas: {
          where: {
            isActive: true,
            area: {
              isActive: true,
            },
          },
          select: {
            deliveryFee: true,
            minOrderAmount: true,
            area: {
              select: {
                id: true,
                name: true,
                slug: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    }

    if (
      restaurant.status !== RestaurantStatus.ACTIVE ||
      !restaurant.subscriptionEndsAt ||
      restaurant.subscriptionEndsAt <= now
    ) {
      throw new NotFoundException({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    }

    const openStatus = isRestaurantOpenNow(
      restaurant.hours,
      restaurant.manualStatus,
      restaurant.unavailableNote,
      now,
    );

    const { dayOfWeek: currentDay } = getCurrentKarachiTime(now);
    const todayRanges = restaurant.hours
      .filter((h) => h.dayOfWeek === currentDay)
      .sort((a, b) => {
        const aMin = parseTimeToMinutes(dateTimeToTimeString(a.openTime));
        const bMin = parseTimeToMinutes(dateTimeToTimeString(b.openTime));
        return aMin - bMin;
      })
      .map((h) => ({
        openTime: dateTimeToTimeString(h.openTime),
        closeTime: dateTimeToTimeString(h.closeTime),
      }));

    const deliveryAreas = restaurant.deliveryAreas
      .sort((a, b) => a.area.sortOrder - b.area.sortOrder)
      .map((da) => ({
        areaId: da.area.id,
        name: da.area.name,
        deliveryFee: da.deliveryFee,
        minOrderAmount: da.minOrderAmount,
      }));

    return {
      slug: restaurant.slug,
      name: restaurant.name,
      description: restaurant.description,
      cuisines: restaurant.cuisines,
      logoUrl: restaurant.logoUrl,
      coverUrl: restaurant.coverUrl,
      contactPhone: restaurant.contactPhone,
      whatsappNumber: restaurant.whatsappNumber,
      addressText: restaurant.addressText,
      minOrderAmount: restaurant.minOrderAmount,
      isOpenNow: openStatus.isOpenNow,
      manualStatus: restaurant.manualStatus,
      unavailableNote: restaurant.unavailableNote,
      availabilityText: openStatus.availabilityText,
      nextOpenAt: openStatus.nextOpenAt,
      todayHours: todayRanges,
      deliveryAreas,
    };
  }

  async getRestaurantMenu(
    slug: string,
  ): Promise<{ categories: PublicMenuCategory[] }> {
    const now = new Date();
    const normalizedSlug = slug.trim().toLowerCase();
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        status: true,
        subscriptionEndsAt: true,
        categories: {
          where: {
            isActive: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
          select: {
            id: true,
            name: true,
            items: {
              where: {
                isActive: true,
              },
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                basePrice: true,
                originalPrice: true,
                isDeal: true,
                isAvailable: true,
                variants: {
                  where: {
                    isActive: true,
                  },
                  orderBy: {
                    sortOrder: 'asc',
                  },
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
                addons: {
                  where: {
                    isActive: true,
                  },
                  orderBy: {
                    sortOrder: 'asc',
                  },
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    }

    if (
      restaurant.status !== RestaurantStatus.ACTIVE ||
      !restaurant.subscriptionEndsAt ||
      restaurant.subscriptionEndsAt <= now
    ) {
      throw new NotFoundException({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    }

    return {
      categories: transformPublicMenuCategories(restaurant.categories),
    };
  }
}
