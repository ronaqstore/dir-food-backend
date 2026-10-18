---
name: testing-patterns
description: >
  Vitest unit and e2e testing patterns for dir-food-backend: mocking PrismaService,
  controller delegation tests, service rule tests, supertest e2e with real tokens,
  envelope assertions, tenant-isolation tests. Use when writing or fixing *.spec.ts / *.e2e-spec.ts.
---

# Testing Patterns — Dir Food Backend

- Runner: **Vitest 4** (`vi.fn`, not `jest.fn`). Globals enabled, but import explicitly for clarity.
- Unit: `**/*.spec.ts` → `npm test` (or `npm test -- <path>`).
- E2E: `test/*.e2e-spec.ts` → `npm run test:e2e` (real local PostgreSQL dev DB).
- Every controller, service, and util has a sibling spec (AGENTS.md §3).

## 1. Service unit test — mock Prisma by hand
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DeliveryAreasService } from './delivery-areas.service.js';

describe('DeliveryAreasService (unit)', () => {
  let service: DeliveryAreasService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      restaurant: { findUnique: vi.fn() },
      area: { findMany: vi.fn() },
      restaurantDeliveryArea: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),   // run callback with same mock
    };
    service = new DeliveryAreasService(mockPrisma);
  });

  it('throws NotFoundException if restaurant does not exist', async () => {
    mockPrisma.restaurant.findUnique.mockResolvedValue(null);
    await expect(service.getDeliveryAreas('res-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scopes queries to the restaurant', async () => {
    mockPrisma.restaurant.findUnique.mockResolvedValue({ id: 'res-1' });
    mockPrisma.area.findMany.mockResolvedValue([]);
    mockPrisma.restaurantDeliveryArea.findMany.mockResolvedValue([]);
    await service.getDeliveryAreas('res-1');
    expect(mockPrisma.restaurantDeliveryArea.findMany).toHaveBeenCalledWith({ where: { restaurantId: 'res-1' } });
  });
});
```
What to cover in service specs: happy path · each thrown exception (status **and** `code`) · tenant scoping in `where` ·
BigInt conversion · audit call (`expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'X' }))`).

Asserting an error code:
```ts
await expect(service.create(...)).rejects.toMatchObject({
  response: expect.objectContaining({ code: 'PRICE_CHANGED' }),
});
```

## 2. Controller unit test — delegation only
```ts
describe('DeliveryAreasController (unit)', () => {
  let controller: DeliveryAreasController;
  let mockService: any;

  beforeEach(() => {
    mockService = { getDeliveryAreas: vi.fn(), updateDeliveryAreas: vi.fn() };
    controller = new DeliveryAreasController(mockService as DeliveryAreasService);
  });

  it('delegates with user.restaurantId', async () => {
    const user = { userId: 'user-1', role: UserRole.RESTAURANT_OWNER, restaurantId: 'rest-1' };
    mockService.getDeliveryAreas.mockResolvedValue([]);
    await controller.getDeliveryAreas(user);
    expect(mockService.getDeliveryAreas).toHaveBeenCalledWith('rest-1');
  });
});
```

## 3. E2E test — real app, real DB
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('<Feature> (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    // seed: unique phones/slugs per run to avoid collisions (see getUniquePakistaniPhone in existing e2e specs)
  });

  afterAll(async () => {
    // delete only rows this suite created (by id), never truncate
    await app.close();
  });

  it('returns data envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/me/restaurant/delivery-areas')
      .set('Authorization', `Bearer ${owner1Token}`)
      .expect(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('returns error envelope with code', async () => {
    const res = await request(app.getHttpServer()).get('/public/restaurants/does-not-exist').expect(404);
    expect(res.body.error.code).toBe('RESTAURANT_NOT_AVAILABLE');
  });
});
```

## 4. Mandatory e2e cases for owner/admin features
- **Tenant isolation**: owner2's token cannot read/update owner1's resource → 404 (or 403), and owner1's data is unchanged.
- **Role isolation**: owner token on `/admin/...` → 403; no token → 401.
- **Suspended restaurant**: GET allowed, mutation → 403.
- **Validation**: unknown body field → 400 (`forbidNonWhitelisted`).
- **Public privacy**: response does not contain `id`, `adminNotes`, `statusReason`, `subscriptionEndsAt`.

## Rules
- Assert on `res.body.data` / `res.body.error`, never the raw body.
- Never `.skip`/`.only` in committed code; never weaken an assertion to make a test pass.
- Use unique data per run in e2e; clean up by ids you created.
- Money in mocks as `bigint` (`10000n`); in HTTP responses as numbers (`10000`).

