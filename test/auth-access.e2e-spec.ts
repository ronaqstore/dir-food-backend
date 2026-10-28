import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UserRole, RestaurantStatus, UserStatus } from '../src/generated/prisma/enums.js';
import { normalizePhone } from '../src/common/utils/phone.js';
import bcrypt from 'bcrypt';

describe('Auth & Access Control (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let adminPhone: string;
  let owner1Token: string;
  let owner2Token: string;
  let owner1RestId: string;
  let owner2RestId: string;
  let owner1Phone: string;
  let owner2Phone: string;

  const testRunId = Math.random().toString(36).substring(2, 8);
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

    // Setup initial platform admin in DB for testing
    adminPhone = getUniquePakistaniPhone();
    const adminNormalizedPhone = normalizePhone(adminPhone);
    const adminPassHash = await bcrypt.hash('AdminSecret123!', 10);
    await prisma.user.upsert({
      where: { phone: adminNormalizedPhone },
      update: {},
      create: {
        name: 'Super Admin',
        phone: adminNormalizedPhone,
        passwordHash: adminPassHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        restaurantId: null,
      },
    });

    // Login as Admin to get token
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/platform-admin/login')
      .send({ phone: adminPhone, password: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.data.token || adminLoginRes.body.data.accessToken;

    // Register Restaurant 1
    owner1Phone = getUniquePakistaniPhone();
    const reg1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: `Test Hotel 1 ${testRunId}`,
        ownerName: 'Owner One',
        phone: owner1Phone,
        password: 'Password123!',
      });
    if (!reg1.body.data) {
      console.error('Registration 1 failed:', reg1.body);
    }
    owner1RestId = reg1.body.data.restaurant.id;

    const login1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner1Phone, password: 'Password123!' });
    owner1Token = login1.body.data.token;

    // Register Restaurant 2
    owner2Phone = getUniquePakistaniPhone();
    const reg2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: `Test Hotel 2 ${testRunId}`,
        ownerName: 'Owner Two',
        phone: owner2Phone,
        password: 'Password123!',
      });
    owner2RestId = reg2.body.data.restaurant.id;

    const login2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner2Phone, password: 'Password123!' });
    owner2Token = login2.body.data.token;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Registration & Constraints', () => {
    it('creates a PENDING restaurant and RESTAURANT_OWNER user', async () => {
      const pendingPhone = getUniquePakistaniPhone();
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          restaurantName: `Pending Stalls ${testRunId}`,
          ownerName: 'Stall Owner',
          phone: pendingPhone,
          password: 'Password123!',
        })
        .expect(201);

      expect(res.body.data.restaurant.status).toBe(RestaurantStatus.PENDING);
      expect(res.body.data.user.role).toBe(UserRole.RESTAURANT_OWNER);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate phone registrations with 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          restaurantName: `Duplicate Phone Stalls ${testRunId}`,
          ownerName: 'Owner Duplicate',
          phone: owner1Phone, // already used
          password: 'Password123!',
        })
        .expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects forbidden extra parameters (e.g. attempting to assign role or status)', async () => {
      const hackerPhone = getUniquePakistaniPhone();
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          restaurantName: `Hacker Stalls ${testRunId}`,
          ownerName: 'Hacker',
          phone: hackerPhone,
          password: 'Password123!',
          role: 'PLATFORM_ADMIN',
          status: 'ACTIVE',
        })
        .expect(400);

      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('Authentication & Route Protection', () => {
    it('rejects unauthenticated requests to protected route with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('accepts authenticated requests with valid Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(res.body.data.name).toBe('Owner One');
      expect(res.body.data.restaurant.id).toBe(owner1RestId);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('accepts authenticated requests with cookie', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `dir_food_token=${owner1Token}`)
        .expect(200);

      expect(res.body.data.name).toBe('Owner One');
    });

    it('clears cookie on logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Role-Based Access Control', () => {
    it('blocks restaurant owner from accessing platform admin endpoints with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/restaurants/pending')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows platform admin to access platform admin endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/restaurants/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('Tenant Isolation (/me/restaurant)', () => {
    it('returns own restaurant data and prevents accessing another restaurant', async () => {
      // Owner 1 requests /me/restaurant
      const res1 = await request(app.getHttpServer())
        .get('/me/restaurant')
        .set('Authorization', `Bearer ${owner1Token}`)
        .expect(200);

      expect(res1.body.data.id).toBe(owner1RestId);

      // Owner 2 requests /me/restaurant
      const res2 = await request(app.getHttpServer())
        .get('/me/restaurant')
        .set('Authorization', `Bearer ${owner2Token}`)
        .expect(200);

      expect(res2.body.data.id).toBe(owner2RestId);
      expect(res1.body.data.id).not.toBe(res2.body.data.id);
    });
  });

  describe('Admin Approval Workflow', () => {
    it('refuses to approve restaurant when prerequisites are not met with 422 Unprocessable Entity', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: RestaurantStatus.ACTIVE })
        .expect(422);

      expect(res.body.error.code).toBe('APPROVAL_PREREQUISITES_NOT_MET');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('approves restaurant and starts 30-day trial when all prerequisites are met', async () => {
      // Setup prerequisites for restaurant 1:
      // 1. WhatsApp number
      await prisma.restaurant.update({
        where: { id: owner1RestId },
        data: { whatsappNumber: '923111111111' },
      });

      // 2. Opening hours
      await prisma.restaurantHours.create({
        data: {
          restaurantId: owner1RestId,
          dayOfWeek: 1,
          openTime: new Date('1970-01-01T09:00:00Z'),
          closeTime: new Date('1970-01-01T23:00:00Z'),
        },
      });

      // 3. Category & Active Menu Item
      const cat = await prisma.menuCategory.create({
        data: {
          restaurantId: owner1RestId,
          name: `Main Dishes ${testRunId}`,
        },
      });
      await prisma.menuItem.create({
        data: {
          restaurantId: owner1RestId,
          categoryId: cat.id,
          name: 'Chicken Karahi',
          basePrice: 150000n,
          isActive: true,
        },
      });

      // 4. Delivery Area
      const defaultCity = await prisma.city.findFirstOrThrow({ where: { slug: 'lower-dir' } });
      const area = await prisma.area.upsert({
        where: { cityId_slug: { cityId: defaultCity.id, slug: `timergara-city-${testRunId}` } },
        update: {},
        create: {
          cityId: defaultCity.id,
          name: `Timergara City ${testRunId}`,
          slug: `timergara-city-${testRunId}`,
        },
      });
      await prisma.restaurantDeliveryArea.create({
        data: {
          restaurantId: owner1RestId,
          areaId: area.id,
          isActive: true,
        },
      });

      // Now call admin approval
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: RestaurantStatus.ACTIVE })
        .expect(200);

      expect(res.body.data.status).toBe(RestaurantStatus.ACTIVE);
      expect(res.body.data.trialStartedAt).toBeDefined();
      expect(res.body.data.subscriptionEndsAt).toBeDefined();

      const start = new Date(res.body.data.trialStartedAt).getTime();
      const end = new Date(res.body.data.subscriptionEndsAt).getTime();
      const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
      expect(days).toBe(30);

      // Verify audit log was recorded
      const audit = await prisma.auditLog.findFirst({
        where: {
          restaurantId: owner1RestId,
          action: 'RESTAURANT_APPROVED',
        },
      });
      expect(audit).toBeDefined();
    });

    it('blocks non-admin from approving restaurants', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner2RestId}/status`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .send({ status: RestaurantStatus.ACTIVE })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Separate Auth Endpoints & Password Lifecycle (Ronaq Store Pattern)', () => {
    it('rejects owner on /auth/platform-admin/login and admin on /auth/login', async () => {
      // Owner tries platform admin login
      await request(app.getHttpServer())
        .post('/auth/platform-admin/login')
        .send({ phone: owner1Phone, password: 'Password123!' })
        .expect(401);

      // Admin tries owner login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: adminPhone, password: 'AdminSecret123!' })
        .expect(401);
    });

    it('completes the admin setup-link → setup-password → me → change-password flow', async () => {
      // 1. Register a new restaurant without direct password login
      const setupPhone = getUniquePakistaniPhone();
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          restaurantName: `Setup Flow Hotel ${testRunId}`,
          ownerName: 'Setup Owner',
          phone: setupPhone,
          password: 'InitialPassword123!',
        })
        .expect(201);

      const setupUserId = reg.body.data.user.id;

      // 2. Admin issues password setup link
      const linkRes = await request(app.getHttpServer())
        .post(`/platform-admin/users/${setupUserId}/password-setup-link`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(linkRes.body.data.setupUrl).toBeDefined();
      const setupUrl = new URL(linkRes.body.data.setupUrl);
      const token = setupUrl.searchParams.get('token');
      expect(token).toMatch(/^[a-f0-9]{64}$/);

      // 3. Owner consumes setup link to set new password
      await request(app.getHttpServer())
        .post('/auth/setup-password')
        .send({
          token,
          password: 'FreshPassword123!',
        })
        .expect(200);

      // 4. Token cannot be replayed
      await request(app.getHttpServer())
        .post('/auth/setup-password')
        .send({
          token,
          password: 'FreshPassword123!',
        })
        .expect(400);

      // 5. Owner logs in with new password
      const newLoginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: setupPhone,
          password: 'FreshPassword123!',
        })
        .expect(200);

      const newOwnerToken = newLoginRes.body.data.accessToken || newLoginRes.body.data.token;
      expect(newOwnerToken).toBeDefined();

      // 6. Owner changes password
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${newOwnerToken}`)
        .send({
          currentPassword: 'WrongOldPassword',
          newPassword: 'EvenNewerPassword123!',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${newOwnerToken}`)
        .send({
          currentPassword: 'FreshPassword123!',
          newPassword: 'EvenNewerPassword123!',
        })
        .expect(200);

      // 7. Re-login with changed password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: setupPhone,
          password: 'EvenNewerPassword123!',
        })
        .expect(200);

      // 8. Immediate revocation: Disable user in DB -> token is rejected on next request
      await prisma.user.update({
        where: { id: setupUserId },
        data: { status: UserStatus.DISABLED },
      });

      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${newOwnerToken}`)
        .send({
          currentPassword: 'EvenNewerPassword123!',
          newPassword: 'AnotherPassword123!',
        })
        .expect(403);

      // Re-enable user
      await prisma.user.update({
        where: { id: setupUserId },
        data: { status: UserStatus.ACTIVE },
      });

      // 9. Restaurant suspension: Mutations blocked with 403, but GET allowed
      const regRestId = reg.body.data.restaurant.id;
      await prisma.restaurant.update({
        where: { id: regRestId },
        data: { status: RestaurantStatus.SUSPENDED },
      });

      // GET /auth/me should succeed (read-only)
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${newOwnerToken}`)
        .expect(200);

      // POST /auth/change-password (mutation) should be blocked with 403
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${newOwnerToken}`)
        .send({
          currentPassword: 'EvenNewerPassword123!',
          newPassword: 'AnotherPassword123!',
        })
        .expect(403);
    });
  });
});


