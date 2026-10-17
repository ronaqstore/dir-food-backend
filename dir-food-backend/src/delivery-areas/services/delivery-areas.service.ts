import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { UpdateDeliveryAreasDto } from '../dto/update-delivery-areas.dto.js';

@Injectable()
export class DeliveryAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeliveryAreas(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const [allAreas, restaurantAreas] = await Promise.all([
      this.prisma.area.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.restaurantDeliveryArea.findMany({
        where: { restaurantId },
      }),
    ]);

    const rMap = new Map<string, { deliveryFee: bigint | null; isActive: boolean }>();
    for (const ra of restaurantAreas) {
      rMap.set(ra.areaId, { deliveryFee: ra.deliveryFee, isActive: ra.isActive });
    }

    return allAreas.map((area) => {
      const config = rMap.get(area.id);
      return {
        areaId: area.id,
        name: area.name,
        slug: area.slug,
        isServed: config?.isActive ?? false,
        deliveryFee:
          config?.deliveryFee !== null && config?.deliveryFee !== undefined
            ? Number(config.deliveryFee)
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
            isActive: true,
          },
          update: {
            deliveryFee: fee,
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
}
