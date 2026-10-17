import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  RestaurantStatus,
  OrderIntentStatus,
  DeliveryFeeStatus,
} from '../../generated/prisma/enums.js';
import { isRestaurantOpenNow } from '../../restaurant-hours/utils/opening-hours.util.js';
import { isValidPakistaniMobile } from '../../common/utils/phone.js';
import { generateReferenceCode } from '../utils/reference-code.util.js';
import { WhatsappMessageService } from './whatsapp-message.service.js';
import { OrderIntentRateLimiterService } from './rate-limiter.service.js';
import type { CreateOrderIntentDto } from '../dto/create-order-intent.dto.js';
import type { QueryOrderIntentsDto } from '../dto/query-order-intents.dto.js';

@Injectable()
export class OrderIntentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappMessageService: WhatsappMessageService,
    private readonly rateLimiter: OrderIntentRateLimiterService,
  ) {}

  /**
   * Creates an order intent and builds the WhatsApp handoff payload.
   * Atomic snapshot into order_intents and order_intent_items.
   */
  async createOrderIntent(dto: CreateOrderIntentDto, ipAddress: string) {
    // 1. Idempotency check: if clientRequestId already processed, return existing intent
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

    // 2. Fetch and gate restaurant eligibility
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

    // 3. Rate limiting check
    this.rateLimiter.checkAndRecord(ipAddress, restaurant.id, dto.customer?.phone);

    // 4. Validate customer phone if provided
    if (dto.customer?.phone && dto.customer.phone.trim()) {
      if (!isValidPakistaniMobile(dto.customer.phone)) {
        throw new UnprocessableEntityException(
          'Please enter a valid Pakistani mobile number',
        );
      }
    }

    // 5. Operating hours check
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

    // 6. Delivery area check (composite relationship)
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

    if (!deliveryArea || !deliveryArea.isActive || !deliveryArea.area.isActive) {
      throw new UnprocessableEntityException(
        'Selected delivery area is not served by this restaurant',
      );
    }

    // 7. Load and validate menu items & variants
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
    const validatedLines: Array<{
      menuItemId: string;
      variantId?: string | null;
      itemNameSnapshot: string;
      variantNameSnapshot?: string | null;
      unitPrice: bigint;
      quantity: number;
      lineTotal: bigint;
      lineNo: number;
    }> = [];

    const priceChangeDetails: Array<{
      menuItemId: string;
      variantId?: string | null;
      name: string;
      unitPrice: bigint;
      quantity: number;
      lineTotal: bigint;
    }> = [];

    let lineCounter = 1;
    for (const reqItem of dto.items) {
      const dbItem = itemMap.get(reqItem.menuItemId);
      if (!dbItem) {
        throw new UnprocessableEntityException(
          `Item '${reqItem.menuItemId}' is not found or inactive`,
        );
      }

      if (!dbItem.isAvailable) {
        throw new UnprocessableEntityException({
          code: 'ITEMS_UNAVAILABLE',
          message: `Item '${dbItem.name}' is currently unavailable`,
          details: [dbItem.id],
        });
      }

      let unitPrice = 0n;
      let variantName: string | null = null;

      if (dbItem.variants.length > 0) {
        if (!reqItem.variantId) {
          throw new UnprocessableEntityException(
            `Variant is required for item '${dbItem.name}'`,
          );
        }

        const variant = dbItem.variants.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          throw new UnprocessableEntityException(
            `Variant '${reqItem.variantId}' is invalid or inactive for '${dbItem.name}'`,
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

    // 8. PRICE CHANGE DETECTION (409 Conflict)
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

    // 9. Minimum order amount validation
    if (
      restaurant.minOrderAmount !== null &&
      calculatedSubtotal < restaurant.minOrderAmount
    ) {
      throw new UnprocessableEntityException({
        code: 'BELOW_MINIMUM_ORDER',
        message: `Order subtotal does not meet restaurant minimum order amount`,
        details: {
          minOrderAmount: restaurant.minOrderAmount,
          subtotal: calculatedSubtotal,
        },
      });
    }

    // 10. Database transaction: insert order_intents + order_intent_items
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
          restaurantWhatsappSnapshot: restaurant.whatsappNumber!,
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
          variantId: line.variantId ?? null,
          itemNameSnapshot: line.itemNameSnapshot,
          variantNameSnapshot: line.variantNameSnapshot ?? null,
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

  /**
   * Tracks customer pressing the "Open WhatsApp" handoff button.
   */
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

  /**
   * Re-shows the result screen ("Open WhatsApp again") while unexpired.
   */
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

  /**
   * Owner dashboard list of incoming order intents (last 30 days default).
   */
  async getOwnerOrderIntents(restaurantId: string, query: QueryOrderIntentsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: any = {
      restaurantId,
      createdAt: { gte: thirtyDaysAgo },
    };

    if (query.q && query.q.trim()) {
      where.publicRef = {
        contains: query.q.trim().toUpperCase(),
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.orderIntent.count({ where }),
      this.prisma.orderIntent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            orderBy: { lineNo: 'asc' },
          },
        },
      }),
    ]);

    const formatted = items.map((item) => ({
      id: item.id,
      reference: item.publicRef,
      status: item.status,
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      deliveryArea: item.deliveryAreaNameSnapshot,
      landmark: item.landmark,
      directions: item.directions,
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
      notConfirmed: true, // System workflow rule: Phase A has no confirmation
    }));

    return {
      data: formatted,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Detail of a single order intent for restaurant owner.
   */
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

  /**
   * Owner dashboard aggregate stats (7d or 30d).
   */
  async getOwnerStats(restaurantId: string, range = '7d') {
    const days = range === '30d' ? 30 : 7;
    const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const intents = await this.prisma.orderIntent.findMany({
      where: {
        restaurantId,
        createdAt: { gte: windowStart },
      },
      include: {
        items: true,
      },
    });

    const requestsCreated = intents.length;
    const whatsappOpened = intents.filter((i) => i.whatsappOpenedAt !== null).length;
    const whatsappOpenRate =
      requestsCreated === 0
        ? 0
        : Number(((whatsappOpened / requestsCreated) * 100).toFixed(2));

    // Aggregate top items
    const itemCounts = new Map<string, number>();
    for (const intent of intents) {
      for (const item of intent.items) {
        const key = item.variantNameSnapshot
          ? `${item.itemNameSnapshot} (${item.variantNameSnapshot})`
          : item.itemNameSnapshot;
        itemCounts.set(key, (itemCounts.get(key) || 0) + item.quantity);
      }
    }

    const topItems = Array.from(itemCounts.entries())
      .map(([name, requestedQuantity]) => ({ name, requestedQuantity }))
      .sort((a, b) => b.requestedQuantity - a.requestedQuantity)
      .slice(0, 10);

    return {
      range: `${days}d`,
      requestsCreated,
      whatsappOpened,
      whatsappOpenRate,
      topItems,
    };
  }

  /**
   * Helper to format public order intent response including generated WhatsApp URL.
   */
  private formatIntentResponse(intent: any, items: any[]) {
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
