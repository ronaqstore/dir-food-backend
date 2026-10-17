import { describe, it, expect, beforeAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  RestaurantStatus,
  ManualStatus,
  UserRole,
  UserStatus,
  OrderIntentStatus,
} from '../src/generated/prisma/enums.js';
import { timeStringToDate } from '../src/restaurant-hours/utils/opening-hours.util.js';
import { normalizePhone } from '../src/common/utils/phone.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

describe('Order Intents & WhatsApp Handoff Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let activeAreaId: string;
  let otherAreaId: string;

  let owner1Token: string;
  let owner1RestId: string;
  let owner1Slug: string;

  let owner2Token: string;
  let owner2RestId: string;

  let expiredRestSlug: string;
  let closedRestSlug: string;

  let itemBaseId: string;
  let itemVariantId: string;
  let variantFullId: string;
  let itemOutOfStockId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Setup Delivery Areas
    const area1 = await prisma.area.upsert({
      where: { slug: 'timergara-order-e2e' },
      update: { isActive: true },
      create: {
        name: 'Timergara Order E2E',
        slug: 'timergara-order-e2e',
        sortOrder: 1,
        isActive: true,
      },
    });
    activeAreaId = area1.id;

    const area2 = await prisma.area.upsert({
      where: { slug: 'unserved-order-e2e' },
      update: { isActive: true },
      create: {
        name: 'Unserved Order E2E',
        slug: 'unserved-order-e2e',
        sortOrder: 2,
        isActive: true,
      },
    });
    otherAreaId = area2.id;

    // 2. Setup Restaurant 1 (Active, 24/7 hours, minOrder 50000n = Rs 500)
    const futureDate = new Date(Date.now() + 30 * 86400000);
    owner1Slug = `shinwari-orders-e2e-${Date.now()}`;
    const rest1 = await prisma.restaurant.create({
      data: {
        name: 'Shinwari Orders E2E',
        slug: owner1Slug,
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        contactPhone: '03001234567',
        whatsappNumber: '03001234567',
        minOrderAmount: 50000n, // Rs 500
        manualStatus: ManualStatus.AUTO,
      },
    });
    owner1RestId = rest1.id;

    // Connect rest1 to activeAreaId (delivery fee Rs 100 = 10000n)
    await prisma.restaurantDeliveryArea.create({
      data: {
        restaurantId: owner1RestId,
        areaId: activeAreaId,
        deliveryFee: 10000n,
        isActive: true,
      },
    });

    // 24/7 Hours for Rest 1
    for (let day = 0; day <= 6; day++) {
      await prisma.restaurantHours.create({
        data: {
          restaurantId: owner1RestId,
          dayOfWeek: day,
          openTime: timeStringToDate('00:00'),
          closeTime: timeStringToDate('23:59'),
        },
      });
    }

    // Owner 1 user & login
    const passwordHash = await bcrypt.hash('Secret123!', 10);
    const owner1PhoneRaw = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;
    await prisma.user.create({
      data: {
        restaurantId: owner1RestId,
        name: 'Owner One',
        phone: normalizePhone(owner1PhoneRaw),
        passwordHash,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
      },
    });

    const loginRes1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner1PhoneRaw, password: 'Secret123!' });
    owner1Token = loginRes1.body.data.token || loginRes1.body.data.accessToken;

    // Menu Categories & Items for Rest 1
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: owner1RestId,
        name: 'Main Courses',
        isActive: true,
      },
    });

    // Item 1: Base price Rs 200 (20000n)
    const itemBase = await prisma.menuItem.create({
      data: {
        restaurantId: owner1RestId,
        categoryId: category.id,
        name: 'Daal Mash',
        basePrice: 20000n,
        isActive: true,
        isAvailable: true,
      },
    });
    itemBaseId = itemBase.id;

    // Item 2: Variants (Half = Rs 600, Full = Rs 1100)
    const itemVar = await prisma.menuItem.create({
      data: {
        restaurantId: owner1RestId,
        categoryId: category.id,
        name: 'Chicken Karahi',
        basePrice: null,
        isActive: true,
        isAvailable: true,
        variants: {
          create: [
            { name: 'Half', price: 60000n, isActive: true },
            { name: 'Full', price: 110000n, isActive: true },
          ],
        },
      },
      include: { variants: true },
    });
    itemVariantId = itemVar.id;
    variantFullId = itemVar.variants.find((v) => v.name === 'Full')!.id;

    // Item 3: Out of stock
    const itemOOS = await prisma.menuItem.create({
      data: {
        restaurantId: owner1RestId,
        categoryId: category.id,
        name: 'Special Trout Fish',
        basePrice: 150000n,
        isActive: true,
        isAvailable: false,
      },
    });
    itemOutOfStockId = itemOOS.id;

    // Setup Restaurant 2 (for tenant isolation test)
    const rest2 = await prisma.restaurant.create({
      data: {
        name: 'Other Rest E2E',
        slug: `other-rest-e2e-${Date.now()}`,
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        contactPhone: '03111234567',
        whatsappNumber: '03111234567',
      },
    });
    owner2RestId = rest2.id;
    const owner2PhoneRaw = `0311${Math.floor(1000000 + Math.random() * 9000000)}`;
    await prisma.user.create({
      data: {
        restaurantId: owner2RestId,
        name: 'Owner Two',
        phone: normalizePhone(owner2PhoneRaw),
        passwordHash,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
      },
    });
    const loginRes2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner2PhoneRaw, password: 'Secret123!' });
    owner2Token = loginRes2.body.data.token || loginRes2.body.data.accessToken;

    // Setup Expired Restaurant
    expiredRestSlug = `expired-rest-e2e-${Date.now()}`;
    await prisma.restaurant.create({
      data: {
        name: 'Expired Rest E2E',
        slug: expiredRestSlug,
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(Date.now() - 60 * 86400000),
        subscriptionEndsAt: new Date(Date.now() - 86400000), // expired yesterday
        contactPhone: '03221234567',
        whatsappNumber: '03221234567',
      },
    });

    // Setup Closed Restaurant
    closedRestSlug = `closed-rest-e2e-${Date.now()}`;
    await prisma.restaurant.create({
      data: {
        name: 'Closed Rest E2E',
        slug: closedRestSlug,
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        manualStatus: ManualStatus.CLOSED,
        unavailableNote: 'Renovating kitchen',
        contactPhone: '03331234567',
        whatsappNumber: '03331234567',
      },
    });
  });

  describe('POST /public/cart/validate', () => {
    it('successfully validates valid items and calculates subtotal and delivery fee', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/cart/validate')
        .send({
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemBaseId, quantity: 2 },
            { menuItemId: itemVariantId, variantId: variantFullId, quantity: 1 },
          ],
          deliveryAreaId: activeAreaId,
        })
        .expect(200);

      expect(res.body.data.lines).toHaveLength(2);
      expect(res.body.data.subtotal).toBe(40000 + 110000); // 150000 paisa = Rs 1500
      expect(res.body.data.delivery.deliveryFee).toBe(10000); // Rs 100
      expect(res.body.data.problems).toHaveLength(0);
      expect(res.body.data.restaurant.isOpenNow).toBe(true);
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for expired or non-existent restaurant', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/cart/validate')
        .send({
          restaurantSlug: expiredRestSlug,
          items: [{ menuItemId: itemBaseId, quantity: 1 }],
        })
        .expect(404);

      expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });

    it('reports problems when item is out of stock or variant is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/cart/validate')
        .send({
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemOutOfStockId, quantity: 1 }, // out of stock
            { menuItemId: itemVariantId, quantity: 1 }, // missing variantId!
          ],
        })
        .expect(200);

      expect(res.body.data.problems.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.problems.some((p: string) => p.includes('out of stock'))).toBe(true);
      expect(res.body.data.problems.some((p: string) => p.includes('Variant is required'))).toBe(true);
    });
  });

  describe('POST /public/order-intents', () => {
    let createdRef: string;
    let createdClientReqId: string;

    it('returns 409 RESTAURANT_CLOSED when restaurant is marked closed', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: randomUUID(),
          restaurantSlug: closedRestSlug,
          items: [{ menuItemId: itemBaseId, quantity: 1 }],
          delivery: { areaId: activeAreaId, landmark: 'Near gate' },
          expectedSubtotal: 20000,
        })
        .expect(409);

      expect(res.body.error.code).toBe('RESTAURANT_CLOSED');
    });

    it('returns 422 if delivery area is not served by restaurant', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: randomUUID(),
          restaurantSlug: owner1Slug,
          items: [{ menuItemId: itemBaseId, quantity: 3 }],
          delivery: { areaId: otherAreaId, landmark: 'Degree College' },
          expectedSubtotal: 60000,
        })
        .expect(422);

      expect(res.body.error.message).toContain('not served by this restaurant');
    });

    it('detects price difference and returns 409 PRICE_CHANGED without creating an intent', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: randomUUID(),
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemBaseId, quantity: 3 }, // 3 x 20000 = 60000
          ],
          delivery: { areaId: activeAreaId, landmark: 'Degree College' },
          expectedSubtotal: 50000, // mismatch! (expected 50000, actual is 60000)
        })
        .expect(409);

      expect(res.body.error.code).toBe('PRICE_CHANGED');
      expect(res.body.error.details.subtotal).toBe(60000);
      expect(res.body.error.details.lines).toHaveLength(1);
    });

    it('enforces restaurant minOrderAmount with 422 BELOW_MINIMUM_ORDER', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: randomUUID(),
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemBaseId, quantity: 1 }, // 1 x 20000 = 20000 (min is 50000)
          ],
          delivery: { areaId: activeAreaId, landmark: 'Degree College' },
          expectedSubtotal: 20000,
        })
        .expect(422);

      expect(res.body.error.code).toBe('BELOW_MINIMUM_ORDER');
    });

    it('successfully creates an order intent and returns WhatsApp message and URL', async () => {
      createdClientReqId = randomUUID();
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: createdClientReqId,
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemBaseId, quantity: 1 }, // 20000
            { menuItemId: itemVariantId, variantId: variantFullId, quantity: 1 }, // 110000
          ],
          customer: {
            name: 'Ahmad Khan',
            phone: '03009876543',
          },
          delivery: {
            areaId: activeAreaId,
            landmark: 'Near Girls Degree College gate',
            directions: 'Blue gate, 2nd house',
            mapPin: { lat: 34.8265, lng: 71.8412 },
          },
          expectedSubtotal: 130000, // 20000 + 110000 = 130000
        })
        .expect(201);

      expect(res.body.data.reference).toMatch(/^TM-[A-Z0-9]{6}$/);
      expect(res.body.data.status).toBe(OrderIntentStatus.WHATSAPP_HANDOFF_READY);
      expect(res.body.data.subtotal).toBe(130000);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.whatsappUrl).toContain('https://wa.me/923001234567?text=');
      expect(res.body.data.message).toContain('Assalam o Alaikum, Shinwari Orders E2E!');
      expect(res.body.data.message).toContain('Ahmad Khan');
      expect(res.body.data.message).toContain('Location pin: https://maps.google.com/?q=34.8265,71.8412');

      createdRef = res.body.data.reference;
    });

    it('handles idempotent duplicate submissions with the same clientRequestId', async () => {
      const res = await request(app.getHttpServer())
        .post('/public/order-intents')
        .send({
          clientRequestId: createdClientReqId, // same ID
          restaurantSlug: owner1Slug,
          items: [
            { menuItemId: itemBaseId, quantity: 1 },
            { menuItemId: itemVariantId, variantId: variantFullId, quantity: 1 },
          ],
          delivery: { areaId: activeAreaId, landmark: 'Near gate' },
          expectedSubtotal: 130000,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.reference).toBe(createdRef);
    });

    it('records WhatsApp opened button click', async () => {
      const res = await request(app.getHttpServer())
        .post(`/public/order-intents/${createdRef}/whatsapp-opened`)
        .expect(200);

      expect(res.body.data.status).toBe(OrderIntentStatus.WHATSAPP_OPENED);
    });

    it('allows public retrieval of order intent and message while unexpired', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/order-intents/${createdRef}`)
        .expect(200);

      expect(res.body.data.reference).toBe(createdRef);
      expect(res.body.data.status).toBe(OrderIntentStatus.WHATSAPP_OPENED);
      expect(res.body.data.whatsappUrl).toContain('https://wa.me/923001234567?text=');
    });
  });

  describe('Restaurant Owner Endpoints (/me/restaurant/order-intents & /stats)', () => {
    it('returns own restaurant order intents with notConfirmed flag', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/order-intents')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const first = res.body.data[0];
      expect(first.notConfirmed).toBe(true);
      expect(first.isExpired).toBe(false);
      expect(first.landmark).toBe('Near Girls Degree College gate');
      expect(first.items).toHaveLength(2);
    });

    it('enforces tenant isolation: owner 2 cannot see owner 1 order intents', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/order-intents')
        .set('Authorization', `Bearer ${owner2Token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });

    it('returns owner stats (requestsCreated, whatsappOpened, whatsappOpenRate, topItems)', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/stats?range=7d')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(res.body.data.range).toBe('7d');
      expect(res.body.data.requestsCreated).toBeGreaterThanOrEqual(1);
      expect(res.body.data.whatsappOpened).toBeGreaterThanOrEqual(1);
      expect(res.body.data.whatsappOpenRate).toBeGreaterThan(0);
      expect(res.body.data.topItems.length).toBeGreaterThanOrEqual(1);
    });

    it('blocks unauthenticated requests to owner order-intents with 401', async () => {
      await request(app.getHttpServer())
        .get('/me/restaurant/order-intents')
        .expect(401);
    });
  });
});
