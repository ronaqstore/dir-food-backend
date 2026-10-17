import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RestaurantStatus, UserRole } from '../src/generated/prisma/enums.js';
import { normalizePhone } from '../src/common/utils/phone.js';

describe('Platform Admin Management & Operations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let ownerToken: string;
  let createdRestId: string;
  let createdAreaId: string;

  let phoneCounter = Math.floor(2000000 + Math.random() * 7000000);
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

    // 1. Create and log in platform admin
    const adminPhone = getUniquePakistaniPhone();
    const adminNormalized = normalizePhone(adminPhone);
    const adminPassHash = await bcrypt.hash('AdminSecret123!', 10);
    await prisma.user.create({
      data: {
        name: 'Platform Admin E2E',
        phone: adminNormalized,
        passwordHash: adminPassHash,
        role: UserRole.PLATFORM_ADMIN,
      },
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/platform-admin/login')
      .send({ phone: adminPhone, password: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    // 2. Register standard restaurant owner for access-control verification
    const ownerPhone = getUniquePakistaniPhone();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: 'Access Control Test Kitchen',
        ownerName: 'Kitchen Owner',
        phone: ownerPhone,
        password: 'Password123!',
      });

    const ownerLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: ownerPhone, password: 'Password123!' });
    ownerToken = ownerLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // 1. ACCESS CONTROL & PERMISSIONS
  // ===========================================================================
  describe('Access Control', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/admin/restaurants');
      expect(res.status).toBe(401);
    });

    it('rejects restaurant owner token on admin endpoints with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    it('allows platform admin token', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ===========================================================================
  // 2. RESTAURANT ADMINISTRATION & ONBOARDING
  // ===========================================================================
  describe('Restaurant Administration', () => {
    it('creates restaurant and owner account atomically with setup link (POST /admin/restaurants)', async () => {
      const ownerPhone = getUniquePakistaniPhone();
      const res = await request(app.getHttpServer())
        .post('/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taj Mahal Restaurant E2E',
          contactPhone: '03001234567',
          whatsappNumber: '03007654321',
          addressText: 'Main Bazaar, Timergara',
          cuisines: ['Desi', 'Karahi'],
          minOrderAmount: 30000,
          owner: {
            name: 'Taj Owner',
            phone: ownerPhone,
          },
        });

      expect(res.status).toBe(201);
      const data = res.body.data;
      expect(data.restaurant).toBeDefined();
      expect(data.restaurant.name).toBe('Taj Mahal Restaurant E2E');
      expect(data.restaurant.status).toBe(RestaurantStatus.PENDING);
      expect(data.owner.phone).toBe(normalizePhone(ownerPhone));
      expect(data.setupLink).toBeDefined();
      expect(data.setupLink.setupUrl).toContain('/setup-password?token=');

      createdRestId = data.restaurant.id;
    });

    it('lists restaurants with status filter and pagination (GET /admin/restaurants)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/restaurants')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: RestaurantStatus.PENDING, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.some((r: { id: string }) => r.id === createdRestId)).toBe(true);
    });

    it('gets full restaurant detail with completeness checklist (GET /admin/restaurants/:id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/restaurants/${createdRestId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.id).toBe(createdRestId);
      expect(data.completeness).toBeDefined();
      expect(data.completeness.isReadyForApproval).toBe(false);
      expect(data.completeness.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('updates restaurant support fields and admin notes (PATCH /admin/restaurants/:id)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${createdRestId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Taj Mahal Fine Dining',
          adminNotes: 'Verified phone call with owner',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Taj Mahal Fine Dining');
      expect(res.body.data.adminNotes).toBe('Verified phone call with owner');
    });

    it('re-issues single-use password setup link for owner (POST /admin/restaurants/:id/setup-link)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/restaurants/${createdRestId}/setup-link`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.setupUrl).toContain('/setup-password?token=');
      expect(res.body.data.expiresAt).toBeDefined();
    });

    it('rejects approval when prerequisites are missing (PATCH /admin/restaurants/:id/status)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${createdRestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: RestaurantStatus.ACTIVE });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('APPROVAL_PREREQUISITES_NOT_MET');
    });

    it('approves restaurant and starts 30-day trial once prerequisites are met', async () => {
      // 1. Setup hours
      const openTime = new Date('1970-01-01T09:00:00Z');
      const closeTime = new Date('1970-01-01T22:00:00Z');
      await prisma.restaurantHours.create({
        data: {
          restaurantId: createdRestId,
          dayOfWeek: 1,
          openTime,
          closeTime,
        },
      });

      // 2. Setup category and item
      const cat = await prisma.menuCategory.create({
        data: {
          restaurantId: createdRestId,
          name: 'Main Dishes',
        },
      });

      await prisma.menuItem.create({
        data: {
          restaurantId: createdRestId,
          categoryId: cat.id,
          name: 'Special Biryani',
          basePrice: 50000n,
          isAvailable: true,
          isActive: true,
        },
      });

      // 3. Setup delivery area
      const area = await prisma.area.findFirst({ where: { isActive: true } });
      await prisma.restaurantDeliveryArea.create({
        data: {
          restaurantId: createdRestId,
          areaId: area!.id,
          isActive: true,
        },
      });

      // Now approve
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${createdRestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: RestaurantStatus.ACTIVE });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(RestaurantStatus.ACTIVE);
      expect(res.body.data.trialStartedAt).toBeDefined();
      expect(res.body.data.subscriptionEndsAt).toBeDefined();
    });

    it('extends subscription after manual offline payment (POST /admin/restaurants/:id/subscription/extend)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/admin/restaurants/${createdRestId}/subscription/extend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ addDays: 30 });

      expect(res.status).toBe(200);
      expect(res.body.data.restaurantId).toBe(createdRestId);
      expect(res.body.data.subscriptionEndsAt).toBeDefined();
      expect(new Date(res.body.data.subscriptionEndsAt).getTime()).toBeGreaterThan(
        new Date(res.body.data.previousSubscriptionEndsAt).getTime(),
      );
    });

    it('correctively shortens subscription with mandatory reason and confirm=true (POST /admin/restaurants/:id/subscription/shorten)', async () => {
      const detailRes = await request(app.getHttpServer())
        .get(`/admin/restaurants/${createdRestId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const currentEndsAt = new Date(detailRes.body.data.subscriptionEndsAt);
      const shorterDate = new Date(currentEndsAt.getTime() - 15 * 24 * 60 * 60 * 1000);

      const res = await request(app.getHttpServer())
        .post(`/admin/restaurants/${createdRestId}/subscription/shorten`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subscriptionEndsAt: shorterDate.toISOString(),
          reason: 'Correcting duplicate extension invoice',
          confirm: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.restaurantId).toBe(createdRestId);
      expect(new Date(res.body.data.subscriptionEndsAt).toISOString()).toBe(shorterDate.toISOString());
    });

    it('changes restaurant slug with validation (PATCH /admin/restaurants/:id/slug)', async () => {
      const newSlug = `taj-fine-dining-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${createdRestId}/slug`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: newSlug });

      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe(newSlug);
    });
  });

  // ===========================================================================
  // 3. MASTER DELIVERY AREAS MANAGEMENT
  // ===========================================================================
  describe('Master Delivery Areas Management', () => {
    it('creates a new delivery area (POST /admin/areas)', async () => {
      const areaName = `Timergara South ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/admin/areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: areaName,
          sortOrder: 10,
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(areaName);
      expect(res.body.data.isActive).toBe(true);
      createdAreaId = res.body.data.id;
    });

    it('lists all delivery areas with restaurant counts (GET /admin/areas)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/areas')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((a: { id: string }) => a.id === createdAreaId)).toBe(true);
      const targetArea = res.body.data.find((a: { id: string }) => a.id === createdAreaId);
      expect(targetArea.activeRestaurantsCount).toBeDefined();
    });

    it('updates delivery area name and sort order (PATCH /admin/areas/:id)', async () => {
      const updatedAreaName = `Timergara South Extended ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .patch(`/admin/areas/${createdAreaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: updatedAreaName,
          sortOrder: 12,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(updatedAreaName);
      expect(res.body.data.sortOrder).toBe(12);
    });
  });

  // ===========================================================================
  // 4. SUPPORT LOOKUP, ACTIVITY, AND AUDIT
  // ===========================================================================
  describe('Operations, Support & Audit', () => {
    it('searches order intents for support (GET /admin/order-intents)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/order-intents')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('returns platform 7d activity summary (GET /admin/activity)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ range: '7d' });

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.range).toBe('7d');
      expect(data.restaurants).toBeDefined();
      expect(data.orderIntents).toBeDefined();
      expect(typeof data.restaurants.total).toBe('number');
      expect(typeof data.orderIntents.requestsCreated).toBe('number');
    });

    it('retrieves system audit trail with filtering (GET /admin/audit-logs)', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ restaurantId: createdRestId, page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.some((l: { action: string }) => l.action === 'RESTAURANT_CREATED_BY_ADMIN')).toBe(true);
    });
  });
});
