import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { R2StorageService } from '../src/uploads/services/r2-storage.service.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { normalizePhone } from '../src/common/utils/phone.js';
import bcrypt from 'bcrypt';

describe('Image Uploads & Storage Adapter (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let r2Storage: R2StorageService;

  let adminToken: string;
  let owner1Token: string;
  let owner2Token: string;
  let owner1RestId: string;
  let _owner2RestId: string;
  let category1Id: string;
  let item1Id: string;

  let phoneCounter = Math.floor(2000000 + Math.random() * 7000000);
  function getUniquePhone(): string {
    phoneCounter++;
    return `0301${phoneCounter}`;
  }

  const makeTestImage = async (
    format: 'jpeg' | 'png' | 'webp',
    width = 80,
    height = 80,
  ): Promise<Buffer> => {
    const s = sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 200, g: 150, b: 100 },
      },
    });
    if (format === 'jpeg') return s.jpeg().toBuffer();
    if (format === 'png') return s.png().toBuffer();
    return s.webp().toBuffer();
  };

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
    r2Storage = app.get(R2StorageService);

    // 1. Setup platform admin
    const adminPhone = getUniquePhone();
    const adminPassHash = await bcrypt.hash('AdminSecret123!', 10);
    await prisma.user.create({
      data: {
        name: 'Upload E2E Admin',
        phone: normalizePhone(adminPhone),
        passwordHash: adminPassHash,
        role: UserRole.PLATFORM_ADMIN,
      },
    });

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/platform-admin/login')
      .send({ phone: adminPhone, password: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.data.accessToken;

    // 2. Register Owner 1 & Restaurant 1
    const owner1Phone = getUniquePhone();
    const reg1Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: 'Shinwari Uploads E2E',
        ownerName: 'Upload Owner One',
        phone: owner1Phone,
        password: 'Password123!',
      });
    owner1RestId = reg1Res.body.data.restaurant.id;

    const login1Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner1Phone, password: 'Password123!' });
    owner1Token = login1Res.body.data.accessToken;

    // 3. Register Owner 2 & Restaurant 2 (for tenant isolation)
    const owner2Phone = getUniquePhone();
    const reg2Res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        restaurantName: 'Second Kitchen Uploads E2E',
        ownerName: 'Upload Owner Two',
        phone: owner2Phone,
        password: 'Password123!',
      });
    _owner2RestId = reg2Res.body.data.restaurant.id;

    const login2Res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ phone: owner2Phone, password: 'Password123!' });
    owner2Token = login2Res.body.data.accessToken;

    // 4. Create Category and Item for Restaurant 1
    const cat = await prisma.menuCategory.create({
      data: {
        restaurantId: owner1RestId,
        name: 'BBQ Specials',
      },
    });
    category1Id = cat.id;

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: owner1RestId,
        categoryId: category1Id,
        name: 'Mutton Tikka',
        basePrice: 85000n,
      },
    });
    item1Id = item.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Disabled Storage Policy (Local / Dev when R2 is off)', () => {
    beforeAll(() => {
      (r2Storage as any).enabled = false;
    });

    it('returns 503 Service Unavailable when attempting upload while R2 is disabled', async () => {
      // In default test environment, R2_STORAGE_ENABLED=false
      const sampleJpeg = await makeTestImage('jpeg');

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/logo')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleJpeg, 'logo.jpg');

      expect(res.status).toBe(503);
      expect(res.body.error.message).toContain('Cloudflare R2 storage is not configured');

      // Verify no fake placeholder URL was saved to DB
      const rest = await prisma.restaurant.findUnique({
        where: { id: owner1RestId },
        select: { logoUrl: true },
      });
      expect(rest?.logoUrl).toBeNull();
    });
  });

  describe('Active Storage Flows (Mocked S3 R2 Client)', () => {
    beforeAll(() => {
      // Enable storage service dynamically on the live instance for upload tests
      (r2Storage as any).enabled = true;
      (r2Storage as any).publicUrlBase = 'https://images.dirfood.test';
      (r2Storage as any).client = {
        send: vi.fn().mockImplementation((cmd: any) => {
          return Promise.resolve({
            Key: cmd.input.Key,
          });
        }),
      };
    });

    it('rejects invalid image kind with 400 Bad Request', async () => {
      const sampleJpeg = await makeTestImage('jpeg');

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/banner')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleJpeg, 'banner.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid image kind');
    });

    it('rejects non-image text file disguised as JPEG with 400 Bad Request', async () => {
      const fakeImage = Buffer.from('NOT AN IMAGE FILE CONTENT AT ALL');

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/logo')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', fakeImage, 'fake.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid or corrupted image file');
    });

    it('uploads valid JPEG logo with auto-rotation, EXIF stripping, and prefix', async () => {
      const sampleJpeg = await makeTestImage('jpeg', 300, 300);

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/logo')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleJpeg, 'restaurant-logo.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.logoUrl).toBeDefined();
      expect(res.body.data.logoUrl).toContain(
        `https://images.dirfood.test/restaurants/${owner1RestId}/profile/logo-`,
      );

      // Verify persisted in DB
      const rest = await prisma.restaurant.findUnique({
        where: { id: owner1RestId },
        select: { logoUrl: true },
      });
      expect(rest?.logoUrl).toBe(res.body.data.logoUrl);
    });

    it('uploads valid WebP cover image', async () => {
      const sampleWebp = await makeTestImage('webp', 800, 400);

      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/cover')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleWebp, 'cover.webp');

      expect(res.status).toBe(201);
      expect(res.body.data.coverUrl).toContain(
        `https://images.dirfood.test/restaurants/${owner1RestId}/profile/cover-`,
      );
    });

    it('uploads valid PNG menu item image', async () => {
      const samplePng = await makeTestImage('png', 400, 400);

      const res = await request(app.getHttpServer())
        .post(`/me/restaurant/items/${item1Id}/image`)
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', samplePng, 'tikka.png');

      expect(res.status).toBe(201);
      expect(res.body.data.imageUrl).toContain(
        `https://images.dirfood.test/restaurants/${owner1RestId}/menu-items/${item1Id}/`,
      );

      const item = await prisma.menuItem.findUnique({
        where: { id: item1Id },
        select: { imageUrl: true },
      });
      expect(item?.imageUrl).toBe(res.body.data.imageUrl);
    });

    it('enforces tenant isolation: Owner 2 cannot upload image to Owner 1 menu item', async () => {
      const sampleJpeg = await makeTestImage('jpeg', 100, 100);

      const res = await request(app.getHttpServer())
        .post(`/me/restaurant/items/${item1Id}/image`)
        .set('Authorization', `Bearer ${owner2Token}`)
        .attach('file', sampleJpeg, 'stolen.jpg');

      expect(res.status).toBe(404);
    });

    it('enforces tenant isolation: Owner 2 cannot delete Owner 1 menu item image', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/me/restaurant/items/${item1Id}/image`)
        .set('Authorization', `Bearer ${owner2Token}`);

      expect(res.status).toBe(404);
    });

    it('deletes menu item image', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/me/restaurant/items/${item1Id}/image`)
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.imageUrl).toBeNull();

      const item = await prisma.menuItem.findUnique({
        where: { id: item1Id },
        select: { imageUrl: true },
      });
      expect(item?.imageUrl).toBeNull();
    });

    it('deletes restaurant cover image', async () => {
      const res = await request(app.getHttpServer())
        .delete('/me/restaurant/images/cover')
        .set('Authorization', `Bearer ${owner1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.coverUrl).toBeNull();
    });

    it('blocks image upload mutations when restaurant is SUSPENDED', async () => {
      // Admin suspends Restaurant 1
      await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Investigation pending',
        });

      const sampleJpeg = await makeTestImage('jpeg');
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/logo')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleJpeg, 'logo.jpg');

      expect(res.status).toBe(403);
    });

    it('blocks all requests when restaurant is DEACTIVATED', async () => {
      // Admin deactivates Restaurant 1
      await request(app.getHttpServer())
        .patch(`/admin/restaurants/${owner1RestId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'DEACTIVATED',
          reason: 'Permanent closure',
        });

      const sampleJpeg = await makeTestImage('jpeg');
      const res = await request(app.getHttpServer())
        .post('/me/restaurant/images/logo')
        .set('Authorization', `Bearer ${owner1Token}`)
        .attach('file', sampleJpeg, 'logo.jpg');

      expect(res.status).toBe(403);
    });
  });
});
