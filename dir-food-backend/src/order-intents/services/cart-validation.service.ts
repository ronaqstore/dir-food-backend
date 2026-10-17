import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RestaurantStatus, DeliveryFeeStatus } from '../../generated/prisma/enums.js';
import { isRestaurantOpenNow } from '../../restaurant-hours/utils/opening-hours.util.js';
import type { CartItemDto } from '../dto/validate-cart.dto.js';

export interface ValidatedCartLine {
  menuItemId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  unitPrice: bigint;
  quantity: number;
  lineTotal: bigint;
  isAvailable: boolean;
}

export interface ValidatedCartResult {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    whatsappNumber: string | null;
    minOrderAmount: bigint | null;
    isOpenNow: boolean;
    availabilityText: string;
    nextOpenAt: string | null;
  };
  lines: ValidatedCartLine[];
  subtotal: bigint;
  minOrderAmount: bigint | null;
  delivery: {
    areaId: string | null;
    areaName: string | null;
    deliveryFee: bigint | null;
    deliveryFeeStatus: DeliveryFeeStatus;
  } | null;
  problems: string[];
}

@Injectable()
export class CartValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates a cart against live database items, prices, availability, and opening hours.
   */
  async validateCart(
    restaurantSlug: string,
    items: CartItemDto[],
    deliveryAreaId?: string,
  ): Promise<ValidatedCartResult> {
    const now = new Date();

    // 1. Fetch eligible restaurant
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: restaurantSlug },
      include: {
        hours: true,
      },
    });

    if (
      !restaurant ||
      restaurant.status !== RestaurantStatus.ACTIVE ||
      !restaurant.subscriptionEndsAt ||
      restaurant.subscriptionEndsAt.getTime() <= now.getTime()
    ) {
      throw new NotFoundException({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    }

    // 2. Calculate dynamic operating hours status
    const status = isRestaurantOpenNow(
      restaurant.hours,
      restaurant.manualStatus,
      restaurant.unavailableNote,
      now,
    );

    // 3. Load all unique requested menu items belonging to this restaurant
    const itemIds = [...new Set(items.map((i) => i.menuItemId))];
    const dbItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        restaurantId: restaurant.id,
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
    });

    const itemMap = new Map<string, (typeof dbItems)[0]>();
    for (const item of dbItems) {
      itemMap.set(item.id, item);
    }

    const lines: ValidatedCartLine[] = [];
    const problems: string[] = [];
    let subtotal = 0n;

    for (const reqItem of items) {
      const dbItem = itemMap.get(reqItem.menuItemId);
      if (!dbItem) {
        problems.push(`Item '${reqItem.menuItemId}' is not found or inactive`);
        continue;
      }

      if (!dbItem.isAvailable) {
        problems.push(`Item '${dbItem.name}' is currently out of stock`);
      }

      let unitPrice = 0n;
      let variantName: string | null = null;

      if (dbItem.variants.length > 0) {
        if (!reqItem.variantId) {
          problems.push(`Variant is required for '${dbItem.name}'`);
          continue;
        }

        const variant = dbItem.variants.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          problems.push(
            `Variant '${reqItem.variantId}' not found or inactive for '${dbItem.name}'`,
          );
          continue;
        }

        unitPrice = variant.price;
        variantName = variant.name;
      } else {
        if (reqItem.variantId) {
          problems.push(`Item '${dbItem.name}' does not have variants`);
          continue;
        }

        if (dbItem.basePrice === null || dbItem.basePrice === undefined) {
          problems.push(`Item '${dbItem.name}' has no price configured`);
          continue;
        }

        unitPrice = dbItem.basePrice;
      }

      const lineTotal = unitPrice * BigInt(reqItem.quantity);
      subtotal += lineTotal;

      lines.push({
        menuItemId: dbItem.id,
        variantId: reqItem.variantId ?? null,
        name: dbItem.name,
        variantName,
        unitPrice,
        quantity: reqItem.quantity,
        lineTotal,
        isAvailable: dbItem.isAvailable,
      });
    }

    // 4. Validate delivery area if provided
    let deliveryInfo: ValidatedCartResult['delivery'] = null;
    if (deliveryAreaId) {
      const deliveryArea = await this.prisma.restaurantDeliveryArea.findUnique({
        where: {
          restaurantId_areaId: {
            restaurantId: restaurant.id,
            areaId: deliveryAreaId,
          },
        },
        include: {
          area: true,
        },
      });

      if (!deliveryArea || !deliveryArea.isActive || !deliveryArea.area.isActive) {
        problems.push('Selected delivery area is not served by this restaurant');
      } else {
        deliveryInfo = {
          areaId: deliveryArea.areaId,
          areaName: deliveryArea.area.name,
          deliveryFee: deliveryArea.deliveryFee,
          deliveryFeeStatus:
            deliveryArea.deliveryFee !== null
              ? DeliveryFeeStatus.KNOWN
              : DeliveryFeeStatus.TO_BE_CONFIRMED,
        };
      }
    }

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        whatsappNumber: restaurant.whatsappNumber,
        minOrderAmount: restaurant.minOrderAmount,
        isOpenNow: status.isOpenNow,
        availabilityText: status.availabilityText,
        nextOpenAt: status.nextOpenAt,
      },
      lines,
      subtotal,
      minOrderAmount: restaurant.minOrderAmount,
      delivery: deliveryInfo,
      problems,
    };
  }
}
