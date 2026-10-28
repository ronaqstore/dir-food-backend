import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { normalizePhone } from '../src/common/utils/phone.js';
import bcrypt from 'bcrypt';

describe('Restaurant Dashboard & Menu Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let owner1Token: string;
  let owner2Token: string;
  let owner1RestId: string;
  let _owner2RestId: string;
  let testAreaId: string;

  let category1Id: string;
  let item1Id: string;

  let phoneCounter = Math.floor(1000000 + Math.random() * 8000000);
  function getUniquePakistaniPhone(): string {
    phoneCounter++;
    return `0300${phoneCounter}`;
  }

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

    // 1. Ensure test delivery area exists
    const defaultCity = await prisma.city.findFirstOrThrow({ where: { slug: 'lower-dir' } });
    const area = await prisma.area.upsert({
      where: { cityId_slug: { cityId: defaultCity.id, slug: 'timergara-city-e2e' } },
      update: { isActive: true, isVerified: true },
      create: {
        cityId: defaultCity.id,
        name: 'Timergara City E2E',
        slug: 'timergara-city-e2e',
        sortOrder: 1,
        isActive: true,
        isVerified: true,
      },
    });
    testAreaId = area.id;

    // 2. Setup platform admin
    const adminPhone = getUniquePakistaniPhone();
    const adminNormalized = normalizePhone(adminPhone);
    const adminPassHash = await bcrypt.hash('AdminSecret123!', 10);
    await prisma.user.create({
      data: {
        name: 'Dashboard E2E Admin',
        phone: adminNormalized,
        passwordHash: adminPassHash,
        role: UserRole.PLATFORM_ADMIN,
      },
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/platform-admin/login')
      .send({ phone: adminPhone, password: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    // 3. Register Restaurant 1 & Owner 1
    const owner1Phone = getUniquePakistaniPhone();
    const reg1Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: 'Al-Madina Shinwari E2E',
        ownerName: 'Owner One',
        phone: owner1Phone,
        password: 'Password123!',
      });
    owner1RestId = reg1Res.body.data.restaurant.id;

    const login1Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner1Phone, password: 'Password123!' });
    owner1Token = login1Res.body.data.accessToken;

    // 4. Register Restaurant 2 & Owner 2 (for tenant isolation tests)
    const owner2Phone = getUniquePakistaniPhone();
    const reg2Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: 'Second Kitchen E2E',
        ownerName: 'Owner Two',
        phone: owner2Phone,
        password: 'Password123!',
      });
    _owner2RestId = reg2Res.body.data.restaurant.id;

    const login2Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner2Phone, password: 'Password123!' });
    owner2Token = login2Res.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Milestone 1: Restaurant Profile & Availability', () => {
    it('updates restaurant profile including whatsapp number and minOrderAmount', async () => {
      const res = await request(app.getHttpServer())
        .patch('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Al-Madina Shinwari & BBQ',
          description: 'Special karahi cooked fresh',
          whatsappNumber: '03009876543',
          addressText: 'Near College Chowk, Timergara',
          minOrderAmount: 50000, // 500 Rs
          cuisines: ['Shinwari', 'Karahi'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Al-Madina Shinwari & BBQ');
      expect(res.body.data.whatsappNumber).toBe('923009876543');
      expect(res.body.data.minOrderAmount).toBe(50000);
    });

    it('rejects forbidden administrative fields in profile update', async () => {
      const res = await request(app.getHttpServer())
        .patch('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          status: 'ACTIVE', // forbidden property
        });

      expect(res.status).toBe(400);
    });

    it('updates restaurant manual availability status', async () => {
      const res = await request(app.getHttpServer())
        .put('/me/restaurant/availability')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          manualStatus: 'TEMP_UNAVAILABLE',
          unavailableNote: 'Gas load-shedding',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.manualStatus).toBe('TEMP_UNAVAILABLE');
      expect(res.body.data.unavailableNote).toBe('Gas load-shedding');

      // Revert back to AUTO
      await request(app.getHttpServer())
        .put('/me/restaurant/availability')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          manualStatus: 'AUTO',
        });
    });
  });

  describe('Milestone 1: Operating Hours Management', () => {
    it('sets weekly operating hours schedule including overnight range', async () => {
      const res = await request(app.getHttpServer())
        .put('/me/restaurant/hours')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          days: [
            {
              dayOfWeek: 1, // Monday overnight: 18:00 to 02:00
              ranges: [{ openTime: '18:00', closeTime: '02:00' }],
            },
            {
              dayOfWeek: 2, // Tuesday day: 10:00 to 22:00
              ranges: [{ openTime: '10:00', closeTime: '22:00' }],
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(7);
      const monday = res.body.data.find((d: any) => d.dayOfWeek === 1);
      expect(monday.ranges).toEqual([{ openTime: '18:00', closeTime: '02:00' }]);
    });

    it('rejects overlapping schedule ranges on the same day', async () => {
      const res = await request(app.getHttpServer())
        .put('/me/restaurant/hours')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          days: [
            {
              dayOfWeek: 3,
              ranges: [
                { openTime: '10:00', closeTime: '15:00' },
                { openTime: '14:00', closeTime: '18:00' },
              ],
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Milestone 2: Delivery Areas Management', () => {
    it('retrieves platform delivery areas with restaurant served status', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/delivery-areas')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((a: any) => a.areaId === testAreaId);
      expect(found).toBeDefined();
    });

    it('configures served delivery areas and delivery fee', async () => {
      const res = await request(app.getHttpServer())
        .put('/me/restaurant/delivery-areas')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          areas: [
            {
              areaId: testAreaId,
              deliveryFee: 15000, // 150 Rs
            },
          ],
        });

      expect(res.status).toBe(200);
      const configured = res.body.data.find((a: any) => a.areaId === testAreaId);
      expect(configured.isServed).toBe(true);
      expect(configured.deliveryFee).toBe(15000);
    });
  });

  describe('Milestone 3: Menu Categories Management', () => {
    it('creates a new menu category', async () => {
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/categories')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Shinwari Karahi',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Shinwari Karahi');
      category1Id = res.body.data.id;
    });

    it('lists categories with item counts', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/categories')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('renames a category', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/restaurant/categories/${category1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Desi Shinwari Karahi',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Desi Shinwari Karahi');
    });
  });

  describe('Milestone 3: Menu Items & Variants Management', () => {
    it('creates a menu item with variants', async () => {
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/items')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          categoryId: category1Id,
          name: 'Special Mutton Karahi',
          description: 'Cooked in pure animal fat with green chilies',
          variants: [
            { name: 'Half (0.5 kg)', price: 120000 },
            { name: 'Full (1.0 kg)', price: 230000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Special Mutton Karahi');
      expect(res.body.data.variants).toHaveLength(2);
      expect(res.body.data.variants[0].price).toBe(120000);
      item1Id = res.body.data.id;
    });

    it('rejects item creation without basePrice or variants', async () => {
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/items')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          categoryId: category1Id,
          name: 'Empty Item',
        });

      expect(res.status).toBe(400);
    });

    it('updates item availability status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/restaurant/items/${item1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          isAvailable: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isAvailable).toBe(false);

      // Re-enable
      await request(app.getHttpServer())
        .patch(`/me/restaurant/items/${item1Id}`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          isAvailable: true,
        });
    });

    it('replaces variants for an item', async () => {
      const res = await request(app.getHttpServer())
        .put(`/me/restaurant/items/${item1Id}/variants`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          variants: [
            { name: 'Single Portion', price: 90000 },
            { name: 'Family Portion', price: 250000 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Single Portion');
    });
  });

  describe('Unblocking Platform Admin Approval (4 Prerequisites Met)', () => {
    it('approves restaurant from PENDING to ACTIVE now that all 4 prerequisites are satisfied', async () => {
      // Prerequisites check:
      // 1. WhatsApp number: set (923009876543)
      // 2. Opening hours: configured
      // 3. Active menu item: created
      // 4. Active delivery area: configured
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'ACTIVE',
          reason: 'All 4 prerequisites verified during onboarding',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.trialStartedAt).toBeDefined();
      expect(res.body.data.subscriptionEndsAt).toBeDefined();
    });
  });

  describe('Tenant Isolation Enforcement', () => {
    it('returns 404 when Owner 2 attempts to edit Owner 1 category', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/restaurant/categories/${category1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({
          name: 'Hacked Category',
        });

      expect(res.status).toBe(404);
    });

    it('returns 404 when Owner 2 attempts to edit Owner 1 menu item', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/me/restaurant/items/${item1Id}`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({
          name: 'Hacked Item',
        });

      expect(res.status).toBe(404);
    });

    it('returns 404 when Owner 2 attempts to replace Owner 1 item variants', async () => {
      const res = await request(app.getHttpServer())
        .put(`/me/restaurant/items/${item1Id}/variants`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .send({
          variants: [{ name: 'Stolen', price: 1000 }],
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Self-Serve Restaurant Publishing (Readiness & Go-Live)', () => {
    it('returns readiness true when all prerequisites are met for Owner 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/readiness')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isReadyToPublish).toBe(true);
      expect(res.body.data.missingPrerequisites).toEqual([]);
    });

    it('returns readiness false for Owner 2 who has not configured hours, areas, or menu', async () => {
      const res = await request(app.getHttpServer())
        .get('/me/restaurant/readiness')
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isReadyToPublish).toBe(false);
      expect(res.body.data.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('rejects self-publishing with 422 when Owner 2 attempts to publish without prerequisites', async () => {
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/publish')
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('PUBLISH_PREREQUISITES_NOT_MET');
    });

    it('successfully self-publishes restaurant and starts 30-day trial for Owner 1', async () => {
      // Reset Restaurant 1 to PENDING to test owner self-publishing transition
      await prisma.restaurant.update({
        where: { id: owner1RestId },
        data: { status: 'PENDING', trialStartedAt: null, subscriptionEndsAt: null },
      });

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/publish')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.trialStartedAt).toBeDefined();
      expect(res.body.data.subscriptionEndsAt).toBeDefined();
    });

    it('rejects subsequent self-publishing with 409 Conflict when already active', async () => {
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/publish')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_ACTIVE');
    });
  });

  describe('Lifecycle State Protections (SUSPENDED & DEACTIVATED)', () => {
    it('allows read-only access but blocks mutations when restaurant is SUSPENDED', async () => {
      // 1. Admin suspends Restaurant 1
      await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Quality check investigation',
        });

      // 2. Owner can still view restaurant profile & categories
      const getProfile = await request(app.getHttpServer())
        .get('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(getProfile.status).toBe(200);

      const getCategories = await request(app.getHttpServer())
        .get('/me/restaurant/categories')
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(getCategories.status).toBe(200);

      // 3. Owner mutation is rejected with 403 Forbidden
      const patchProfile = await request(app.getHttpServer())
        .patch('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Blocked Name Change',
        });
      expect(patchProfile.status).toBe(403);

      const createCategory = await request(app.getHttpServer())
        .post('/me/restaurant/categories')
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({
          name: 'Blocked Category',
        });
      expect(createCategory.status).toBe(403);
    });

    it('blocks all owner requests when restaurant is DEACTIVATED', async () => {
      // 1. Admin deactivates Restaurant 1
      await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'DEACTIVATED',
          reason: 'Permanent closure',
        });

      // 2. Any owner request returns 403 Forbidden
      const getProfile = await request(app.getHttpServer())
        .get('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`);
      expect(getProfile.status).toBe(403);
    });
  });
});
