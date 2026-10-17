import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderIntentsService } from './order-intents.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WhatsappMessageService } from './whatsapp-message.service.js';
import { OrderIntentRateLimiterService } from './rate-limiter.service.js';
import {
  RestaurantStatus,
  ManualStatus,
  OrderIntentStatus,
  DeliveryFeeStatus,
} from '../../generated/prisma/enums.js';
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('OrderIntentsService', () => {
  let service: OrderIntentsService;
  let prisma: any;
  let whatsappMessageService: WhatsappMessageService;
  let rateLimiter: OrderIntentRateLimiterService;

  beforeEach(() => {
    prisma = {
      orderIntent: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      orderIntentItem: {
        createMany: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
      },
      restaurantDeliveryArea: {
        findUnique: vi.fn(),
      },
      menuItem: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };
    whatsappMessageService = new WhatsappMessageService();
    rateLimiter = new OrderIntentRateLimiterService();
    service = new OrderIntentsService(
      prisma as unknown as PrismaService,
      whatsappMessageService,
      rateLimiter,
    );
  });

  const validRestaurant = {
    id: 'rest-1',
    name: 'Hotel Al-Noor',
    slug: 'hotel-al-noor',
    status: RestaurantStatus.ACTIVE,
    subscriptionEndsAt: new Date(Date.now() + 10 * 86400000),
    whatsappNumber: '03001234567',
    manualStatus: ManualStatus.AUTO,
    unavailableNote: null,
    minOrderAmount: 100000n, // Rs 1000 min order
    hours: [
      {
        dayOfWeek: new Date().getDay(),
        openTime: '00:00',
        closeTime: '23:59',
      },
    ],
  };

  const validDeliveryArea = {
    restaurantId: 'rest-1',
    areaId: 'area-1',
    deliveryFee: 10000n,
    isActive: true,
    area: {
      id: 'area-1',
      name: 'Timergara',
      isActive: true,
    },
  };

  const validItem = {
    id: 'item-1',
    restaurantId: 'rest-1',
    name: 'Chicken Karahi',
    basePrice: 110000n,
    isActive: true,
    isAvailable: true,
    variants: [],
  };

  it('returns existing intent if clientRequestId was already processed (idempotency)', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      clientRequestId: 'req-123',
      publicRef: 'TM-7K4P9Q',
      restaurantNameSnapshot: 'Hotel Al-Noor',
      restaurantWhatsappSnapshot: '03001234567',
      status: OrderIntentStatus.WHATSAPP_HANDOFF_READY,
      subtotal: 110000n,
      deliveryFee: 10000n,
      deliveryFeeStatus: DeliveryFeeStatus.KNOWN,
      deliveryAreaNameSnapshot: 'Timergara',
      landmark: 'Degree College',
      expiresAt: new Date(Date.now() + 86400000),
      items: [
        {
          itemNameSnapshot: 'Chicken Karahi',
          unitPrice: 110000n,
          quantity: 1,
          lineTotal: 110000n,
        },
      ],
    });

    const res = await service.createOrderIntent(
      {
        clientRequestId: 'req-123',
        restaurantSlug: 'hotel-al-noor',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
        delivery: { areaId: 'area-1', landmark: 'Degree College' },
        expectedSubtotal: 110000,
      },
      '127.0.0.1',
    );

    expect(res.reference).toBe('TM-7K4P9Q');
    expect(res.whatsappUrl).toContain('https://wa.me/923001234567');
  });

  it('detects price change and throws 409 PRICE_CHANGED without saving', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue(null);
    prisma.restaurant.findUnique.mockResolvedValue(validRestaurant);
    prisma.restaurantDeliveryArea.findUnique.mockResolvedValue(validDeliveryArea);
    prisma.menuItem.findMany.mockResolvedValue([validItem]); // actual price 110000n

    await expect(
      service.createOrderIntent(
        {
          clientRequestId: 'new-req',
          restaurantSlug: 'hotel-al-noor',
          items: [{ menuItemId: 'item-1', quantity: 1 }],
          delivery: { areaId: 'area-1', landmark: 'Degree College' },
          expectedSubtotal: 100000, // customer expected 100000, but real is 110000!
        },
        '127.0.0.1',
      ),
    ).rejects.toThrow(ConflictException);

    expect(prisma.orderIntent.create).not.toHaveBeenCalled();
  });

  it('rejects order below minimum order amount with 422', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue(null);
    prisma.restaurant.findUnique.mockResolvedValue(validRestaurant); // min order is 100000n
    prisma.restaurantDeliveryArea.findUnique.mockResolvedValue(validDeliveryArea);
    prisma.menuItem.findMany.mockResolvedValue([
      {
        ...validItem,
        basePrice: 50000n, // Rs 500, below 100000n
      },
    ]);

    await expect(
      service.createOrderIntent(
        {
          clientRequestId: 'new-req-2',
          restaurantSlug: 'hotel-al-noor',
          items: [{ menuItemId: 'item-1', quantity: 1 }],
          delivery: { areaId: 'area-1', landmark: 'Degree College' },
          expectedSubtotal: 50000,
        },
        '127.0.0.1',
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('successfully creates order intent and snapshots data atomically', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue(null);
    prisma.restaurant.findUnique.mockResolvedValue(validRestaurant);
    prisma.restaurantDeliveryArea.findUnique.mockResolvedValue(validDeliveryArea);
    prisma.menuItem.findMany.mockResolvedValue([validItem]);

    prisma.orderIntent.create.mockResolvedValue({
      id: 'intent-created',
      clientRequestId: 'req-success',
      publicRef: 'TM-7K4P9Q',
      restaurantNameSnapshot: 'Hotel Al-Noor',
      restaurantWhatsappSnapshot: '03001234567',
      status: OrderIntentStatus.WHATSAPP_HANDOFF_READY,
      subtotal: 110000n,
      deliveryFee: 10000n,
      deliveryFeeStatus: DeliveryFeeStatus.KNOWN,
      deliveryAreaNameSnapshot: 'Timergara',
      landmark: 'Near Degree College',
      expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await service.createOrderIntent(
      {
        clientRequestId: 'req-success',
        restaurantSlug: 'hotel-al-noor',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
        delivery: { areaId: 'area-1', landmark: 'Near Degree College' },
        expectedSubtotal: 110000,
      },
      '127.0.0.1',
    );

    expect(res.reference).toBe('TM-7K4P9Q');
    expect(res.status).toBe(OrderIntentStatus.WHATSAPP_HANDOFF_READY);
    expect(res.whatsappUrl).toContain('https://wa.me/923001234567');
    expect(prisma.orderIntent.create).toHaveBeenCalled();
    expect(prisma.orderIntentItem.createMany).toHaveBeenCalled();
  });

  it('records WhatsApp opened tracking if unexpired', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      publicRef: 'TM-7K4P9Q',
      whatsappOpenedAt: null,
      expiresAt: new Date(Date.now() + 3600000), // expires in 1 hour
    });

    const res = await service.recordWhatsAppOpened('TM-7K4P9Q');
    expect(res.status).toBe(OrderIntentStatus.WHATSAPP_OPENED);
    expect(prisma.orderIntent.update).toHaveBeenCalled();
  });

  it('rejects recording WhatsApp opened if intent has expired (409 Conflict)', async () => {
    prisma.orderIntent.findUnique.mockResolvedValue({
      id: 'intent-1',
      publicRef: 'TM-7K4P9Q',
      whatsappOpenedAt: null,
      expiresAt: new Date(Date.now() - 3600000), // expired 1 hour ago
    });

    await expect(service.recordWhatsAppOpened('TM-7K4P9Q')).rejects.toThrow(
      ConflictException,
    );
  });
});

