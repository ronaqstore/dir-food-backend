---
name: prisma-patterns
description: >
  Prisma 7 patterns for dir-food-backend: multi-file schema, UUID v7, BigInt paisa,
  tenant-scoped queries, transactions, select projections, error codes, migrations.
  Use when touching prisma/*.prisma, writing queries, or handling Prisma errors.
---

# Prisma Patterns — Dir Food Backend

## Schema layout
```
prisma/
  schema.prisma          # generator + datasource (schema: 'prisma' in prisma.config.ts)
  enums.prisma           # all enums
  models/
    tenant.prisma        # Restaurant, User, ...
    menu.prisma          # MenuCategory, MenuItem, variants
    delivery.prisma      # Area, RestaurantDeliveryArea
    orders.prisma        # OrderIntent ...
    audit.prisma         # AuditLog
  migrations/            # immutable history — never edit an applied migration
```
Generated client: `src/generated/prisma/` — **never edit**; regenerate with `npx prisma generate`.

## Model conventions
```prisma
model MenuItem {
  id           String   @id @default(uuid(7)) @db.Uuid
  restaurantId String   @db.Uuid
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  name         String
  basePrice    BigInt                       // paisa
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([restaurantId])
}
```
- Every tenant-owned model has `restaurantId` + an index on it (or a composite index starting with it).
- Money columns are `BigInt` paisa. No `Float`/`Decimal` for money.
- Composite uniqueness: `@@unique([restaurantId, areaId])` → Prisma key `restaurantId_areaId`.

## Schema change workflow
```bash
# 1. edit prisma/models/*.prisma or prisma/enums.prisma
npx prisma format
npx prisma validate
# 2. USER runs (hook asks for confirmation):
npx prisma migrate dev --name <snake_case_description>
# 3. regenerate the client
npx prisma generate
npx tsc --noEmit
```
`prisma migrate reset` and `db push --force-reset` are blocked by the harness — they wipe the dev DB.

## Tenant-scoped queries
```ts
// ✅ findFirst with tenant in where (findUnique only accepts unique fields)
const item = await this.prisma.menuItem.findFirst({ where: { id, restaurantId } });

// ✅ composite unique key that includes the tenant
await this.prisma.restaurantDeliveryArea.findUnique({
  where: { restaurantId_areaId: { restaurantId, areaId } },
});

// ✅ bulk ops scoped too
await this.prisma.menuItem.updateMany({ where: { restaurantId, categoryId }, data: { isActive: false } });
```

## Transactions
```ts
await this.prisma.$transaction(async (tx) => {
  await tx.restaurantDeliveryArea.upsert({ where: {...}, create: {...}, update: {...} });
  await tx.restaurantDeliveryArea.updateMany({ where: {...}, data: { isActive: false } });
});
```
Use `tx` (not `this.prisma`) inside the callback. Audit log can be written after the transaction commits.

## Projections & N+1
```ts
// ✅ one query, explicit fields (also enforces privacy on public endpoints)
this.prisma.restaurant.findFirst({
  where: { slug, status: 'ACTIVE', subscriptionEndsAt: { gt: new Date() } },
  select: {
    name: true, slug: true, whatsappNumber: true,
    menuCategories: {
      where: { isActive: true },
      select: { name: true, items: { where: { isActive: true }, select: { name: true, basePrice: true } } },
    },
  },
});

// ✅ batch lookups
const areas = await this.prisma.area.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } });

// ❌ await inside a loop over DB rows
for (const c of categories) { await this.prisma.menuItem.findMany({ where: { categoryId: c.id } }); }
```

## Error mapping
| Prisma code | Meaning | Map to |
|---|---|---|
| `P2002` | Unique constraint | `ConflictException({ code: 'SLUG_TAKEN' ... })` (409) |
| `P2025` | Record to update/delete not found | `NotFoundException` (404) |
| `P2003` | Foreign key failed | `BadRequestException` / 422 |

```ts
import { Prisma } from '../../generated/prisma/client.js';
try { ... } catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    throw new ConflictException({ code: 'SLUG_TAKEN', message: 'Slug already in use' });
  }
  throw e;
}
```
Prefer checking existence first (as the existing services do) and use the catch as a race-condition fallback.

## BigInt handling
- Write: `BigInt(dto.amount)` (dto amount is an integer paisa number).
- Read & compute: keep `bigint` arithmetic (`a + b`, `a * BigInt(qty)`); compare with `===` / `<` between bigints.
- Return: just return it — `ResponseEnvelopeInterceptor` serializes BigInt to a number.
- Tests: mock values as `10000n`; serialized assertions expect `10000`.

