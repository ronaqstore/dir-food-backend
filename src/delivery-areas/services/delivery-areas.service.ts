import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { slugify } from '../../common/utils/phone.js';
import type { UpdateDeliveryAreasDto } from '../dto/update-delivery-areas.dto.js';
import type { CreateCustomDeliveryAreaDto } from '../dto/create-custom-delivery-area.dto.js';

@Injectable()
export class DeliveryAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeliveryAreas(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        cityId: true,
        city: { select: { id: true, name: true } },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const restaurantAreas = await this.prisma.restaurantDeliveryArea.findMany({
      where: { restaurantId },
    });
    const servedAreaIds = restaurantAreas.map((ra) => ra.areaId);

    const areaWhere: any = {
      isActive: true,
      OR: [{ isVerified: true }, { id: { in: servedAreaIds } }],
    };
    if (restaurant.cityId) {
      areaWhere.cityId = restaurant.cityId;
    }

    const allAreas = await this.prisma.area.findMany({
      where: areaWhere,
      orderBy: { sortOrder: 'asc' },
    });

    const rMap = new Map<string, { deliveryFee: bigint | null; minOrderAmount: bigint | null; isActive: boolean }>();
    for (const ra of restaurantAreas) {
      rMap.set(ra.areaId, { deliveryFee: ra.deliveryFee, minOrderAmount: ra.minOrderAmount, isActive: ra.isActive });
    }

    return allAreas.map((area) => {
      const config = rMap.get(area.id);
      return {
        areaId: area.id,
        name: area.name,
        slug: area.slug,
        isServed: config?.isActive ?? false,
        isVerified: area.isVerified,
        deliveryFee:
          config?.deliveryFee !== null && config?.deliveryFee !== undefined
            ? Number(config.deliveryFee)
            : null,
        minOrderAmount:
          config?.minOrderAmount !== null && config?.minOrderAmount !== undefined
            ? Number(config.minOrderAmount)
            : null,
      };
    });
  }

  async updateDeliveryAreas(
    restaurantId: string,
    dto: UpdateDeliveryAreasDto,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const targetAreaIds = dto.areas.map((a) => a.areaId);

    // Validate all target areas exist and are active
    if (targetAreaIds.length > 0) {
      const validAreas = await this.prisma.area.findMany({
        where: {
          id: { in: targetAreaIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (validAreas.length !== targetAreaIds.length) {
        const validSet = new Set(validAreas.map((a) => a.id));
        const invalidIds = targetAreaIds.filter((id) => !validSet.has(id));
        throw new BadRequestException(
          `Invalid or inactive delivery areas: ${invalidIds.join(', ')}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert or activate chosen areas
      for (const item of dto.areas) {
        const fee =
          item.deliveryFee !== null && item.deliveryFee !== undefined
            ? BigInt(item.deliveryFee)
            : null;
        const minOrder =
          item.minOrderAmount !== null && item.minOrderAmount !== undefined
            ? BigInt(item.minOrderAmount)
            : null;

        await tx.restaurantDeliveryArea.upsert({
          where: {
            restaurantId_areaId: {
              restaurantId,
              areaId: item.areaId,
            },
          },
          create: {
            restaurantId,
            areaId: item.areaId,
            deliveryFee: fee,
            minOrderAmount: minOrder,
            isActive: true,
          },
          update: {
            deliveryFee: fee,
            minOrderAmount: minOrder,
            isActive: true,
          },
        });
      }

      // 2. Deactivate areas not included in the payload
      if (targetAreaIds.length > 0) {
        await tx.restaurantDeliveryArea.updateMany({
          where: {
            restaurantId,
            areaId: { notIn: targetAreaIds },
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      } else {
        await tx.restaurantDeliveryArea.updateMany({
          where: {
            restaurantId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }
    });

    return this.getDeliveryAreas(restaurantId);
  }

  async createCustomArea(
    restaurantId: string,
    dto: CreateCustomDeliveryAreaDto,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, cityId: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let cityId = restaurant.cityId;
    if (!cityId) {
      const defaultCity = await this.prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (!defaultCity) {
        throw new BadRequestException('No active city configured on platform');
      }
      cityId = defaultCity.id;
    }

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Area name cannot be empty');
    }

    const slug = slugify(name);
    if (!slug) {
      throw new BadRequestException('Invalid area name');
    }

    const cleanInput = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Check if an alias matches this input in this city
    const matchedAlias = await this.prisma.areaAlias.findUnique({
      where: { cityId_normalized: { cityId, normalized: cleanInput } },
      include: { area: true },
    });

    let area = matchedAlias?.area;

    // 2. If no alias, check if an area with this name, slug, or normalized spelling already exists
    if (!area) {
      const existingAreas =
        (await this.prisma.area.findMany({
          where: { cityId },
        })) || [];

      area = existingAreas.find((a) => {
        const cleanExistingName = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanExistingSlug = a.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          cleanExistingName === cleanInput ||
          cleanExistingSlug === cleanInput ||
          a.slug === slug ||
          a.name.toLowerCase() === name.toLowerCase()
        );
      });
    }

    if (!area) {
      area = await this.prisma.area.create({
        data: {
          cityId,
          name,
          slug,
          isActive: true,
          isVerified: false,
          isCustomCreated: true,
        },
      });
    }

    const fee =
      dto.deliveryFee !== null && dto.deliveryFee !== undefined
        ? BigInt(dto.deliveryFee)
        : null;
    const minOrder =
      dto.minOrderAmount !== null && dto.minOrderAmount !== undefined
        ? BigInt(dto.minOrderAmount)
        : null;

    const rda = await this.prisma.restaurantDeliveryArea.upsert({
      where: {
        restaurantId_areaId: {
          restaurantId,
          areaId: area.id,
        },
      },
      create: {
        restaurantId,
        areaId: area.id,
        deliveryFee: fee,
        minOrderAmount: minOrder,
        isActive: true,
      },
      update: {
        deliveryFee: fee,
        minOrderAmount: minOrder,
        isActive: true,
      },
    });

    return {
      areaId: area.id,
      name: area.name,
      slug: area.slug,
      isServed: rda.isActive,
      isVerified: area.isVerified,
      deliveryFee: rda.deliveryFee !== null ? Number(rda.deliveryFee) : null,
      minOrderAmount: rda.minOrderAmount !== null ? Number(rda.minOrderAmount) : null,
    };
  }
}
