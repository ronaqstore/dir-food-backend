import { describe, it, expect, beforeAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RestaurantStatus, ManualStatus } from '../src/generated/prisma/enums.js';
import { timeStringToDate } from '../src/restaurant-hours/utils/opening-hours.util.js';

describe('Public Restaurant Discovery & Menu APIs (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let activeAreaId: string;
  let inactiveAreaId: string;

  let activeRestSlug: string;
  let activeRestName: string;
  let closedRestName: string;
  let scheduledRestName: string;
  let expiredRestSlug: string;
  let pendingRestSlug: string;
  let suspendedRestSlug: string;
  let deactivatedRestSlug: string;
  let closedRestSlug: string;
  let scheduledRestSlug: string;

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

    // 1. Setup Areas
    const defaultCity = await prisma.city.findFirstOrThrow({ where: { slug: 'lower-dir' } });
    const activeArea = await prisma.area.upsert({
      where: { cityId_slug: { cityId: defaultCity.id, slug: 'timergara-pub-e2e' } },
      update: { isActive: true },
      create: {
        cityId: defaultCity.id,
        name: 'Timergara Public E2E',
        slug: 'timergara-pub-e2e',
        sortOrder: 1,
        isActive: true,
      },
    });
    activeAreaId = activeArea.id;

    const inactiveArea = await prisma.area.upsert({
      where: { cityId_slug: { cityId: defaultCity.id, slug: 'inactive-pub-e2e' } },
      update: { isActive: false },
      create: {
        cityId: defaultCity.id,
        name: 'Inactive Public E2E',
        slug: 'inactive-pub-e2e',
        sortOrder: 99,
        isActive: false,
      },
    });
    inactiveAreaId = inactiveArea.id;

    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // +30 days
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // -10 days

    // 2. Active Restaurant (Always open, serving active area, full menu)
    const uniqueRunId = Date.now();
    activeRestSlug = `al-noor-pub-${uniqueRunId}`;
    activeRestName = `Al-Noor Public Restaurant ${uniqueRunId}`;
    const activeRest = await prisma.restaurant.create({
      data: {
        name: activeRestName,
        slug: activeRestSlug,
        description: 'Best Karahi in Timergara',
        cuisines: ['Karahi', 'Desi'],
        logoUrl: 'https://images.example.com/al-noor-logo.jpg',
        coverUrl: 'https://images.example.com/al-noor-cover.jpg',
        contactPhone: '923001234567',
        whatsappNumber: '923007654321',
        addressText: 'Main College Chowk, Timergara',
        minOrderAmount: 50000n, // Rs 500
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: futureDate,
        trialStartedAt: new Date(),
        manualStatus: ManualStatus.AUTO,
        adminNotes: 'Private admin note that should never leak',
        deliveryAreas: {
          create: {
            areaId: activeAreaId,
            deliveryFee: 15000n, // Rs 150
            isActive: true,
          },
        },
        hours: {
          createMany: {
            data: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
              dayOfWeek: day,
              openTime: timeStringToDate('00:00'),
              closeTime: timeStringToDate('23:59'),
            })),
          },
        },
      },
    });

    // Create categories, items, variants for Active Restaurant
    const catActive = await prisma.menuCategory.create({
      data: {
        restaurantId: activeRest.id,
        name: 'Special Karahi',
        sortOrder: 1,
        isActive: true,
      },
    });

    // Item 1: Base price item with image, available
    await prisma.menuItem.create({
      data: {
        restaurantId: activeRest.id,
        categoryId: catActive.id,
        name: 'Chicken Karahi',
        description: 'Fresh desi butter chicken',
        imageUrl: 'https://images.example.com/chicken-karahi.jpg',
        basePrice: 120000n, // Rs 1200
        isAvailable: true,
        isActive: true,
        sortOrder: 1,
      },
    });

    // Item 2: Item with variants, basePrice null
    const itemWithVariants = await prisma.menuItem.create({
      data: {
        restaurantId: activeRest.id,
        categoryId: catActive.id,
        name: 'Mutton Karahi',
        description: 'Tender mutton',
        imageUrl: null,
        basePrice: null,
        isAvailable: true,
        isActive: true,
        sortOrder: 2,
      },
    });

    await prisma.menuItemVariant.createMany({
      data: [
        {
          restaurantId: activeRest.id,
          menuItemId: itemWithVariants.id,
          name: 'Half',
          price: 110000n, // Rs 1100
          sortOrder: 1,
          isActive: true,
        },
        {
          restaurantId: activeRest.id,
          menuItemId: itemWithVariants.id,
          name: 'Full',
          price: 220000n, // Rs 2200
          sortOrder: 2,
          isActive: true,
        },
        {
          restaurantId: activeRest.id,
          menuItemId: itemWithVariants.id,
          name: 'Inactive Variant',
          price: 99900n,
          sortOrder: 3,
          isActive: false, // inactive variant
        },
      ],
    });

    // Item 3: Inactive item in active category (must be excluded)
    await prisma.menuItem.create({
      data: {
        restaurantId: activeRest.id,
        categoryId: catActive.id,
        name: 'Old Discontinued Item',
        basePrice: 50000n,
        isAvailable: true,
        isActive: false,
        sortOrder: 3,
      },
    });

    // Item 4: Active item that is currently unavailable (out of stock)
    await prisma.menuItem.create({
      data: {
        restaurantId: activeRest.id,
        categoryId: catActive.id,
        name: 'Special Trout Fish',
        basePrice: 180000n,
        isAvailable: false,
        isActive: true,
        sortOrder: 4,
      },
    });

    // Category 2: Inactive category (must be excluded along with its items)
    const catInactive = await prisma.menuCategory.create({
      data: {
        restaurantId: activeRest.id,
        name: 'Seasonal Winter Soup',
        sortOrder: 2,
        isActive: false,
      },
    });

    await prisma.menuItem.create({
      data: {
        restaurantId: activeRest.id,
        categoryId: catInactive.id,
        name: 'Hot and Sour Soup',
        basePrice: 40000n,
        isAvailable: true,
        isActive: true,
        sortOrder: 1,
      },
    });

    // 3. Expired Subscription Restaurant (Active status, but subscription in the past)
    expiredRestSlug = `expired-pub-${Date.now()}`;
    const pastTrialStart = new Date(pastDate.getTime() - 1000 * 60 * 60 * 24 * 30);
    await prisma.restaurant.create({
      data: {
        name: 'Expired Subscription Cafe',
        slug: expiredRestSlug,
        cuisines: ['Cafe', 'Fast Food'],
        whatsappNumber: '923001112233',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: pastTrialStart,
        subscriptionEndsAt: pastDate,
        manualStatus: ManualStatus.AUTO,
      },
    });

    // 4. Pending Restaurant
    pendingRestSlug = `pending-pub-${Date.now()}`;
    await prisma.restaurant.create({
      data: {
        name: 'Pending Onboarding Cafe',
        slug: pendingRestSlug,
        cuisines: ['Bakery'],
        status: RestaurantStatus.PENDING,
        subscriptionEndsAt: null,
      },
    });

    // 5. Suspended Restaurant
    suspendedRestSlug = `suspended-pub-${Date.now()}`;
    await prisma.restaurant.create({
      data: {
        name: 'Suspended Cafe',
        slug: suspendedRestSlug,
        cuisines: ['Pizza'],
        status: RestaurantStatus.SUSPENDED,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        statusReason: 'Payment issue',
      },
    });

    // 6. Deactivated Restaurant
    deactivatedRestSlug = `deactivated-pub-${Date.now()}`;
    await prisma.restaurant.create({
      data: {
        name: 'Deactivated Cafe',
        slug: deactivatedRestSlug,
        cuisines: ['BBQ'],
        status: RestaurantStatus.DEACTIVATED,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        statusReason: 'Permanently closed down',
      },
    });

    // 7. Closed Restaurant (Active status, valid subscription, but manualStatus = CLOSED)
    closedRestSlug = `closed-pub-${Date.now()}`;
    closedRestName = `Closed Under Renovation Spot ${uniqueRunId}`;
    await prisma.restaurant.create({
      data: {
        name: closedRestName,
        slug: closedRestSlug,
        cuisines: ['Fast Food', 'Burgers'],
        whatsappNumber: '923004445566',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        manualStatus: ManualStatus.CLOSED,
        unavailableNote: 'Under kitchen renovation',
      },
    });

    // 8. Scheduled Restaurant (Active, valid subscription, but only open on tomorrow)
    scheduledRestSlug = `scheduled-pub-${Date.now()}`;
    scheduledRestName = `Weekend Only Diner ${uniqueRunId}`;
    const today = new Date().getDay();
    const tomorrow = (today + 1) % 7;
    await prisma.restaurant.create({
      data: {
        name: scheduledRestName,
        slug: scheduledRestSlug,
        cuisines: ['Traditional'],
        whatsappNumber: '923007778899',
        status: RestaurantStatus.ACTIVE,
        trialStartedAt: new Date(),
        subscriptionEndsAt: futureDate,
        manualStatus: ManualStatus.AUTO,
        hours: {
          create: {
            dayOfWeek: tomorrow,
            openTime: timeStringToDate('12:00'),
            closeTime: timeStringToDate('22:00'),
          },
        },
      },
    });
  });

  // ===========================================================================
  // A. GET /public/areas
  // ===========================================================================
  describe('GET /public/areas', () => {
    it('returns active delivery areas and excludes inactive areas', async () => {
      const res = await request(app.getHttpServer()).get('/public/areas');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);

      const slugs = res.body.data.map((a: { slug: string }) => a.slug);
      expect(slugs).toContain('timergara-pub-e2e');
      expect(slugs).not.toContain('inactive-pub-e2e');

      // Verify only appropriate public fields are returned
      const area = res.body.data.find((a: { slug: string }) => a.slug === 'timergara-pub-e2e');
      expect(area).toHaveProperty('id');
      expect(area).toHaveProperty('name', 'Timergara Public E2E');
      expect(area).toHaveProperty('slug', 'timergara-pub-e2e');
      expect(area.createdAt).toBeUndefined();
      expect(area.updatedAt).toBeUndefined();
      expect(area.isActive).toBeUndefined();
      expect(area.sortOrder).toBeUndefined();
    });
  });

  // ===========================================================================
  // B. GET /public/restaurants
  // ===========================================================================
  describe('GET /public/restaurants', () => {
    it('returns only active restaurants with unexpired subscriptions', async () => {
      // 1. Active unexpired restaurant is included
      const resActive = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: activeRestName, limit: 10 });
      expect(resActive.status).toBe(200);
      expect(resActive.body.data.map((r: { slug: string }) => r.slug)).toContain(activeRestSlug);

      // 2. Closed but active/unexpired restaurant is included
      const resClosed = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: closedRestName, limit: 10 });
      expect(resClosed.status).toBe(200);
      expect(resClosed.body.data.map((r: { slug: string }) => r.slug)).toContain(closedRestSlug);

      // 3. Scheduled active/unexpired restaurant is included
      const resScheduled = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: scheduledRestName, limit: 10 });
      expect(resScheduled.status).toBe(200);
      expect(resScheduled.body.data.map((r: { slug: string }) => r.slug)).toContain(scheduledRestSlug);

      // 4. Must exclude expired, pending, suspended, and deactivated restaurants
      const resExpired = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Expired Subscription', limit: 10 });
      expect(resExpired.body.data).toHaveLength(0);

      const resPending = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Pending Onboarding', limit: 10 });
      expect(resPending.body.data).toHaveLength(0);

      const resSuspended = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Suspended Public', limit: 10 });
      expect(resSuspended.body.data).toHaveLength(0);

      const resDeactivated = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Deactivated Public', limit: 10 });
      expect(resDeactivated.body.data).toHaveLength(0);
    });

    it('verifies exclusion of private and administrative fields from listing', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Al-Noor Public' });

      expect(res.status).toBe(200);
      const restaurant = res.body.data.find((r: { slug: string }) => r.slug === activeRestSlug);
      expect(restaurant).toBeDefined();

      // Allowed public fields
      expect(restaurant).toHaveProperty('slug', activeRestSlug);
      expect(restaurant).toHaveProperty('name', activeRestName);
      expect(restaurant).toHaveProperty('cuisines');
      expect(restaurant).toHaveProperty('logoUrl');
      expect(restaurant).toHaveProperty('minOrderAmount', 50000); // BigInt serialized to Number
      expect(restaurant).toHaveProperty('isOpenNow', true);
      expect(restaurant).toHaveProperty('availabilityText');
      expect(restaurant).toHaveProperty('nextOpenAt');

      // Private fields that MUST NOT exist
      expect(restaurant.id).toBeUndefined();
      expect(restaurant.adminNotes).toBeUndefined();
      expect(restaurant.statusReason).toBeUndefined();
      expect(restaurant.status).toBeUndefined();
      expect(restaurant.trialStartedAt).toBeUndefined();
      expect(restaurant.subscriptionEndsAt).toBeUndefined();
      expect(restaurant.contactPhone).toBeUndefined();
      expect(restaurant.whatsappNumber).toBeUndefined();
      expect(restaurant.users).toBeUndefined();
    });

    it('filters restaurants by delivery areaId', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ areaId: activeAreaId });

      expect(res.status).toBe(200);
      const slugs = res.body.data.map((r: { slug: string }) => r.slug);
      expect(slugs).toContain(activeRestSlug);
      // Closed and scheduled restaurant do not deliver to this area
      expect(slugs).not.toContain(closedRestSlug);

      // Filtering by an inactive area returns no restaurants
      const resInactive = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ areaId: inactiveAreaId });
      expect(resInactive.status).toBe(200);
      expect(resInactive.body.data).toHaveLength(0);
    });

    it('filters restaurants by cuisine case-insensitively', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ cuisine: 'karahi' });

      expect(res.status).toBe(200);
      const slugs = res.body.data.map((r: { slug: string }) => r.slug);
      expect(slugs).toContain(activeRestSlug);
      expect(slugs).not.toContain(closedRestSlug);
    });

    it('filters restaurants by name search query q', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'Al-Noor' });

      expect(res.status).toBe(200);
      const slugs = res.body.data.map((r: { slug: string }) => r.slug);
      expect(slugs).toContain(activeRestSlug);
      expect(slugs).not.toContain(closedRestSlug);
    });

    it('filters restaurants by openNow=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ openNow: true });

      expect(res.status).toBe(200);
      const slugs = res.body.data.map((r: { slug: string }) => r.slug);
      expect(slugs).toContain(activeRestSlug);
      expect(slugs).not.toContain(closedRestSlug);
    });

    it('sorts open restaurants first when openNow filter is not applied', async () => {
      const res = await request(app.getHttpServer()).get('/public/restaurants');

      expect(res.status).toBe(200);
      const data = res.body.data;
      let seenClosed = false;
      for (const item of data) {
        if (!item.isOpenNow) {
          seenClosed = true;
        } else if (seenClosed) {
          // If we see an open restaurant after a closed one, sorting is violated
          expect(item.isOpenNow).toBe(false);
        }
      }
    });

    it('paginates results with page and limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: expect.any(Number),
      });
    });

    it('rejects invalid query parameters with 400 Bad Request', async () => {
      // 1. q length < 2
      const resShortQ = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ q: 'a' });
      expect(resShortQ.status).toBe(400);

      // 2. invalid areaId (not UUID)
      const resInvalidUuid = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ areaId: 'not-a-uuid' });
      expect(resInvalidUuid.status).toBe(400);

      // 3. invalid openNow
      const resInvalidBool = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ openNow: 'not-a-bool' });
      expect(resInvalidBool.status).toBe(400);

      // 4. limit > 50
      const resOverLimit = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ limit: 100 });
      expect(resOverLimit.status).toBe(400);

      // 5. non-whitelisted parameter
      const resForbiddenParam = await request(app.getHttpServer())
        .get('/public/restaurants')
        .query({ unknownParam: 'malicious' });
      expect(resForbiddenParam.status).toBe(400);
    });
  });

  // ===========================================================================
  // C. GET /public/restaurants/:slug
  // ===========================================================================
  describe('GET /public/restaurants/:slug', () => {
    it('returns full public profile for active restaurant', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${activeRestSlug}`,
      );

      expect(res.status).toBe(200);
      const data = res.body.data;

      expect(data.slug).toBe(activeRestSlug);
      expect(data.name).toBe(activeRestName);
      expect(data.description).toBe('Best Karahi in Timergara');
      expect(data.cuisines).toEqual(['Karahi', 'Desi']);
      expect(data.logoUrl).toBe('https://images.example.com/al-noor-logo.jpg');
      expect(data.coverUrl).toBe('https://images.example.com/al-noor-cover.jpg');
      expect(data.contactPhone).toBe('923001234567');
      expect(data.whatsappNumber).toBe('923007654321');
      expect(data.addressText).toBe('Main College Chowk, Timergara');
      expect(data.minOrderAmount).toBe(50000);
      expect(data.isOpenNow).toBe(true);
      expect(data.manualStatus).toBe(ManualStatus.AUTO);
      expect(data.todayHours).toBeDefined();
      expect(Array.isArray(data.todayHours)).toBe(true);
      expect(data.deliveryAreas).toEqual([
        {
          areaId: activeAreaId,
          name: 'Timergara Public E2E',
          deliveryFee: 15000,
          minOrderAmount: null,
        },
      ]);

      // Verify private fields are never exposed
      expect(data.id).toBeUndefined();
      expect(data.adminNotes).toBeUndefined();
      expect(data.statusReason).toBeUndefined();
      expect(data.subscriptionEndsAt).toBeUndefined();
      expect(data.trialStartedAt).toBeUndefined();
    });

    it('returns manualStatus and unavailableNote when restaurant is closed', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${closedRestSlug}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.isOpenNow).toBe(false);
      expect(res.body.data.manualStatus).toBe(ManualStatus.CLOSED);
      expect(res.body.data.unavailableNote).toBe('Under kitchen renovation');
      expect(res.body.data.availabilityText).toContain('Under kitchen renovation');
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for unknown slug', async () => {
      const res = await request(app.getHttpServer()).get(
        '/public/restaurants/non-existent-restaurant-slug',
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({
        code: 'RESTAURANT_NOT_AVAILABLE',
        message: 'Restaurant not available',
      });
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for PENDING restaurant', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${pendingRestSlug}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for SUSPENDED restaurant', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${suspendedRestSlug}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for DEACTIVATED restaurant', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${deactivatedRestSlug}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE for restaurant with expired subscription', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${expiredRestSlug}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });
  });

  // ===========================================================================
  // D. GET /public/restaurants/:slug/menu
  // ===========================================================================
  describe('GET /public/restaurants/:slug/menu', () => {
    it('returns active categories, active items, and active variants with serialized prices', async () => {
      const res = await request(app.getHttpServer()).get(
        `/public/restaurants/${activeRestSlug}/menu`,
      );

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data).toHaveProperty('categories');
      expect(Array.isArray(data.categories)).toBe(true);

      // Only 1 active category ('Special Karahi'), inactive 'Seasonal Winter Soup' is excluded
      expect(data.categories).toHaveLength(1);
      const cat = data.categories[0];
      expect(cat.name).toBe('Special Karahi');

      // Check items: Item 3 ('Old Discontinued Item') is inactive, so items must have 3 items
      expect(cat.items).toHaveLength(3);

      // Item 1: Chicken Karahi
      const item1 = cat.items.find((i: { name: string }) => i.name === 'Chicken Karahi');
      expect(item1).toBeDefined();
      expect(item1.price).toBe(120000); // 120000 paisa serialized
      expect(item1.isAvailable).toBe(true);
      expect(item1.imageUrl).toBe('https://images.example.com/chicken-karahi.jpg');
      expect(item1.variants).toEqual([]);

      // Item 2: Mutton Karahi (has 2 active variants; 1 inactive variant excluded)
      const item2 = cat.items.find((i: { name: string }) => i.name === 'Mutton Karahi');
      expect(item2).toBeDefined();
      expect(item2.price).toBeNull(); // basePrice is null
      expect(item2.variants).toHaveLength(2);
      expect(item2.variants[0]).toEqual({
        id: expect.any(String),
        name: 'Half',
        price: 110000,
      });
      expect(item2.variants[1]).toEqual({
        id: expect.any(String),
        name: 'Full',
        price: 220000,
      });

      // Item 4: Special Trout Fish (active, but isAvailable: false)
      const item4 = cat.items.find((i: { name: string }) => i.name === 'Special Trout Fish');
      expect(item4).toBeDefined();
      expect(item4.isAvailable).toBe(false);
      expect(item4.price).toBe(180000);

      // Inactive item 3 must not be present
      const item3 = cat.items.find((i: { name: string }) => i.name === 'Old Discontinued Item');
      expect(item3).toBeUndefined();
    });

    it('returns 404 RESTAURANT_NOT_AVAILABLE when restaurant is not eligible', async () => {
      // 1. Missing
      const resMissing = await request(app.getHttpServer()).get(
        '/public/restaurants/missing-restaurant/menu',
      );
      expect(resMissing.status).toBe(404);
      expect(resMissing.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');

      // 2. Expired subscription
      const resExpired = await request(app.getHttpServer()).get(
        `/public/restaurants/${expiredRestSlug}/menu`,
      );
      expect(resExpired.status).toBe(404);
      expect(resExpired.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');

      // 3. Suspended
      const resSuspended = await request(app.getHttpServer()).get(
        `/public/restaurants/${suspendedRestSlug}/menu`,
      );
      expect(resSuspended.status).toBe(404);
      expect(resSuspended.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
    });
  });
});
