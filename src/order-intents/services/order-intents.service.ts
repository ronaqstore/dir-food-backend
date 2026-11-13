import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  RestaurantStatus,
  OrderIntentStatus,
  DeliveryFeeStatus,
} from '../../generated/prisma/enums.js';
import { isRestaurantOpenNow } from '../../restaurant-hours/utils/opening-hours.util.js';
import {
  isValidPakistaniMobile,
  isReservedPhoneNumber,
} from '../../common/utils/phone.js';
import { generateReferenceCode } from '../utils/reference-code.util.js';
import { WhatsappMessageService } from './whatsapp-message.service.js';
import { OrderIntentRateLimiterService } from './rate-limiter.service.js';
import type { CreateOrderIntentDto } from '../dto/create-order-intent.dto.js';
import type { QueryOrderIntentsDto } from '../dto/query-order-intents.dto.js';
import {
  handleGetOwnerOrderIntents,
  handleGetOwnerStats,
} from '../helpers/order-intents-owner.helper.js';

export interface IntentFormattedItem {
  itemNameSnapshot: string;
  variantNameSnapshot?: string | null;
  unitPrice: bigint;
  quantity: number;
  lineTotal: bigint;
}

export interface IntentFormattedPayload {
  publicRef: string;
  status: OrderIntentStatus;
  restaurantNameSnapshot: string;
  restaurantWhatsappSnapshot: string;
  subtotal: bigint;
  deliveryFee: bigint | null;
  deliveryFeeStatus: DeliveryFeeStatus;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAreaNameSnapshot: string;
  landmark: string;
  directions?: string | null;
  mapLat?: number | Prisma.Decimal | null;
  mapLng?: number | Prisma.Decimal | null;
  expiresAt: Date;
}

@Injectable()
export class OrderIntentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappMessageService: WhatsappMessageService,
    private readonly rateLimiter: OrderIntentRateLimiterService,
  ) {}

  async createOrderIntent(dto: CreateOrderIntentDto, ipAddress: string) {
    const existing = await this.prisma.orderIntent.findUnique({
      where: { clientRequestId: dto.clientRequestId },
      include: {
        items: {
          orderBy: { lineNo: 'asc' },
        },
      },
    });

    if (existing) {
      return this.formatIntentResponse(existing, existing.items);
    }

    const now = new Date();

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug: dto.restaurantSlug },
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

    if (!restaurant.whatsappNumber) {
      throw new UnprocessableEntityException(
        'Restaurant does not have a WhatsApp contact number configured',
      );
    }

    this.rateLimiter.checkAndRecord(
      ipAddress,
      restaurant.id,
      dto.customer?.phone,
    );

    if (dto.customer?.phone && dto.customer.phone.trim()) {
      if (!isValidPakistaniMobile(dto.customer.phone)) {
        throw new UnprocessableEntityException(
          'Please enter a valid Pakistani mobile number',
        );
      }
      if (isReservedPhoneNumber(dto.customer.phone)) {
        throw new ConflictException('This phone number is already in use');
      }
    }

    const status = isRestaurantOpenNow(
      restaurant.hours,
      restaurant.manualStatus,
      restaurant.unavailableNote,
      now,
    );

    if (!status.isOpenNow) {
      throw new ConflictException({
        code: 'RESTAURANT_CLOSED',
        message: `${restaurant.name} is currently closed.`,
        nextOpenAt: status.nextOpenAt,
      });
    }

    const deliveryArea = await this.prisma.restaurantDeliveryArea.findUnique({
      where: {
        restaurantId_areaId: {
          restaurantId: restaurant.id,
          areaId: dto.delivery.areaId,
        },
      },
      include: {
        area: true,
      },
    });

    if (
      !deliveryArea ||
      !deliveryArea.isActive ||
      !deliveryArea.area.isActive
    ) {
      throw new UnprocessableEntityException(
        'Selected delivery area is not served by this restaurant',
      );
    }

    const itemIds = [...new Set(dto.items.map((i) => i.menuItemId))];
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

    let calculatedSubtotal = 0n;
    const validatedLines: {
      menuItemId: string;
      variantId: string | null;
      itemNameSnapshot: string;
      variantNameSnapshot: string | null;
      unitPrice: bigint;
      quantity: number;
      lineTotal: bigint;
      lineNo: number;
    }[] = [];

    const priceChangeDetails: {
      menuItemId: string;
      variantId: string | null;
      name: string;
      unitPrice: bigint;
      quantity: number;
      lineTotal: bigint;
    }[] = [];

    let lineCounter = 1;

    for (const reqItem of dto.items) {
      const dbItem = itemMap.get(reqItem.menuItemId);
      if (!dbItem) {
        throw new UnprocessableEntityException(
          `Item with ID '${reqItem.menuItemId}' is not available at this restaurant`,
        );
      }

      if (!dbItem.isAvailable) {
        throw new UnprocessableEntityException(
          `'${dbItem.name}' is currently unavailable (sold out)`,
        );
      }

      let unitPrice: bigint;
      let variantName: string | null = null;

      if (dbItem.variants.length > 0) {
        if (!reqItem.variantId) {
          throw new UnprocessableEntityException(
            `Please select a variant for '${dbItem.name}'`,
          );
        }

        const variant = dbItem.variants.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          throw new UnprocessableEntityException(
            `Invalid variant selected for '${dbItem.name}'`,
          );
        }

        unitPrice = variant.price;
        variantName = variant.name;
      } else {
        if (reqItem.variantId) {
          throw new UnprocessableEntityException(
            `Item '${dbItem.name}' does not support variants`,
          );
        }

        if (dbItem.basePrice === null || dbItem.basePrice === undefined) {
          throw new UnprocessableEntityException(
            `Item '${dbItem.name}' has no price configured`,
          );
        }

        unitPrice = dbItem.basePrice;
      }

      const lineTotal = unitPrice * BigInt(reqItem.quantity);
      calculatedSubtotal += lineTotal;

      validatedLines.push({
        menuItemId: dbItem.id,
        variantId: reqItem.variantId ?? null,
        itemNameSnapshot: dbItem.name,
        variantNameSnapshot: variantName,
        unitPrice,
        quantity: reqItem.quantity,
        lineTotal,
        lineNo: lineCounter++,
      });

      priceChangeDetails.push({
        menuItemId: dbItem.id,
        variantId: reqItem.variantId ?? null,
        name: dbItem.name,
        unitPrice,
        quantity: reqItem.quantity,
        lineTotal,
      });
    }

    if (BigInt(dto.expectedSubtotal) !== calculatedSubtotal) {
      throw new ConflictException({
        code: 'PRICE_CHANGED',
        message: 'Prices have changed. Please review your cart.',
        details: {
          subtotal: calculatedSubtotal,
          lines: priceChangeDetails,
        },
      });
    }

    const effectiveMinOrder =
      deliveryArea.minOrderAmount ?? restaurant.minOrderAmount;
    if (effectiveMinOrder !== null && calculatedSubtotal < effectiveMinOrder) {
      throw new UnprocessableEntityException({
        code: 'BELOW_MINIMUM_ORDER',
        message: `Order subtotal does not meet minimum order amount for selected delivery area`,
        details: {
          minOrderAmount: effectiveMinOrder,
          subtotal: calculatedSubtotal,
        },
      });
    }

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const feeStatus =
      deliveryArea.deliveryFee !== null
        ? DeliveryFeeStatus.KNOWN
        : DeliveryFeeStatus.TO_BE_CONFIRMED;

    let publicRef = generateReferenceCode();
    let attempts = 0;
    while (attempts < 5) {
      const clash = await this.prisma.orderIntent.findUnique({
        where: { publicRef },
        select: { id: true },
      });
      if (!clash) break;
      publicRef = generateReferenceCode();
      attempts++;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const intent = await tx.orderIntent.create({
        data: {
          clientRequestId: dto.clientRequestId,
          publicRef,
          restaurantId: restaurant.id,
          status: OrderIntentStatus.WHATSAPP_HANDOFF_READY,
          restaurantNameSnapshot: restaurant.name,
          restaurantWhatsappSnapshot: restaurant.whatsappNumber ?? '',
          customerName: dto.customer?.name?.trim() ?? null,
          customerPhone: dto.customer?.phone?.trim() ?? null,
          deliveryAreaId: deliveryArea.areaId,
          deliveryAreaNameSnapshot: deliveryArea.area.name,
          landmark: dto.delivery.landmark.trim(),
          directions: dto.delivery.directions?.trim() ?? null,
          mapLat: dto.delivery.mapPin?.lat ?? null,
          mapLng: dto.delivery.mapPin?.lng ?? null,
          subtotal: calculatedSubtotal,
          deliveryFee: deliveryArea.deliveryFee,
          deliveryFeeStatus: feeStatus,
          expiresAt,
        },
      });

      await tx.orderIntentItem.createMany({
        data: validatedLines.map((line) => ({
          orderIntentId: intent.id,
          restaurantId: restaurant.id,
          menuItemId: line.menuItemId,
          variantId: line.variantId,
          itemNameSnapshot: line.itemNameSnapshot,
          variantNameSnapshot: line.variantNameSnapshot,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          lineNo: line.lineNo,
        })),
      });

      return intent;
    });

    return this.formatIntentResponse(created, validatedLines);
  }

  async recordWhatsAppOpened(ref: string) {
    const normalizedRef = ref.trim().toUpperCase();
    const intent = await this.prisma.orderIntent.findUnique({
      where: { publicRef: normalizedRef },
    });

    if (!intent) {
      throw new NotFoundException('Order intent not found');
    }

    if (intent.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'INTENT_EXPIRED',
        message: 'This WhatsApp order request has expired.',
      });
    }

    if (intent.whatsappOpenedAt === null) {
      await this.prisma.orderIntent.update({
        where: { id: intent.id },
        data: {
          status: OrderIntentStatus.WHATSAPP_OPENED,
          whatsappOpenedAt: new Date(),
        },
      });
    }

    return {
      status: OrderIntentStatus.WHATSAPP_OPENED,
    };
  }

  async getPublicOrderIntent(ref: string) {
    const normalizedRef = ref.trim().toUpperCase();
    const intent = await this.prisma.orderIntent.findUnique({
      where: { publicRef: normalizedRef },
      include: {
        items: {
          orderBy: { lineNo: 'asc' },
        },
      },
    });

    if (!intent) {
      throw new NotFoundException('Order intent not found');
    }

    if (intent.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException({
        code: 'INTENT_EXPIRED',
        message: 'This WhatsApp order request has expired.',
      });
    }

    return this.formatIntentResponse(intent, intent.items);
  }

  async getOwnerOrderIntents(
    restaurantId: string,
    query: QueryOrderIntentsDto,
  ) {
    return handleGetOwnerOrderIntents(this.prisma, restaurantId, query);
  }

  async getOwnerOrderIntentDetail(restaurantId: string, id: string) {
    const item = await this.prisma.orderIntent.findUnique({
      where: {
        id_restaurantId: {
          id,
          restaurantId,
        },
      },
      include: {
        items: {
          orderBy: { lineNo: 'asc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Order intent not found');
    }

    return {
      id: item.id,
      reference: item.publicRef,
      status: item.status,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      deliveryArea: item.deliveryAreaNameSnapshot,
      landmark: item.landmark,
      directions: item.directions,
      mapLat: item.mapLat,
      mapLng: item.mapLng,
      subtotal: item.subtotal,
      deliveryFee: item.deliveryFee,
      deliveryFeeStatus: item.deliveryFeeStatus,
      items: item.items.map((i) => ({
        name: i.itemNameSnapshot,
        variant: i.variantNameSnapshot,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      isExpired: item.expiresAt.getTime() <= Date.now(),
      whatsappOpenedAt: item.whatsappOpenedAt,
      notConfirmed: true,
    };
  }

  async getOwnerStats(restaurantId: string, range = '7d') {
    return handleGetOwnerStats(this.prisma, restaurantId, range);
  }

  private formatIntentResponse(
    intent: IntentFormattedPayload,
    items: IntentFormattedItem[],
  ) {
    const messageLines = items.map((i) => ({
      name: i.itemNameSnapshot,
      variant: i.variantNameSnapshot,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    }));

    const message = this.whatsappMessageService.buildMessage({
      restaurantName: intent.restaurantNameSnapshot,
      restaurantWhatsapp: intent.restaurantWhatsappSnapshot,
      reference: intent.publicRef,
      items: messageLines,
      subtotal: intent.subtotal,
      deliveryFee: intent.deliveryFee,
      customerName: intent.customerName,
      customerPhone: intent.customerPhone,
      areaName: intent.deliveryAreaNameSnapshot,
      landmark: intent.landmark,
      directions: intent.directions,
      mapLat: intent.mapLat ? Number(intent.mapLat) : null,
      mapLng: intent.mapLng ? Number(intent.mapLng) : null,
    });

    const whatsappUrl = this.whatsappMessageService.buildWhatsAppUrl(
      intent.restaurantWhatsappSnapshot,
      message,
    );

    return {
      reference: intent.publicRef,
      status: intent.status,
      restaurant: {
        name: intent.restaurantNameSnapshot,
      },
      items: messageLines,
      subtotal: intent.subtotal,
      delivery: {
        status: intent.deliveryFeeStatus,
        fee: intent.deliveryFee,
        areaName: intent.deliveryAreaNameSnapshot,
        landmark: intent.landmark,
      },
      message,
      whatsappUrl,
      expiresAt: intent.expiresAt,
      notice: 'Your message is not sent until you press Send in WhatsApp.',
    };
  }
}
