# Database Seeder Architecture & Guide

This directory contains the modular database seeders for the **Dir Food** platform. All seeders are orchestrated by a single master script: [`prisma/seed.ts`](../seed.ts).

---

## Directory Structure

```text
prisma/
├── seed.ts                         # Master Seeder Entrypoint (npm run seed)
└── seeds/
    ├── README.md                   # This documentation & developer guide
    ├── client.ts                   # Shared Prisma Client connection & env loader
    ├── 01-cities.seed.ts           # 41 Khyber Pakhtunkhwa districts & cities
    ├── 02-areas.seed.ts            # Master delivery areas & settlements
    ├── 03-cuisines.seed.ts         # 40 Master food types & culinary specialties
    └── 04-admins.seed.ts           # Platform Super Admin accounts (Admin 1 & 2)
```

---

## How to Run the Seeders

### 1. Seed All Platform Data (Master Command)
Populates the database with core platform reference data (no dummy restaurants):
```bash
npm run seed
```
Or via Prisma CLI:
```bash
npx prisma db seed
```

### 2. Run a Specific Seeder Only
Use the `--only=<seeder-name>` flag:
```bash
# Seed only cities & districts
npm run seed -- --only=cities

# Seed only delivery areas
npm run seed -- --only=areas

# Seed only master cuisines
npm run seed -- --only=cuisines

# Seed only super admin accounts
npm run seed -- --only=admins
```

---

## Seeder Inventory & Descriptions

| Seeder File | Target Tables | Description |
|---|---|---|
| `01-cities.seed.ts` | `cities` | Seeds the 41 districts of Khyber Pakhtunkhwa (`lower-dir`, `swat`, `peshawar`, etc.) with `sortOrder` and active status. |
| `02-areas.seed.ts` | `areas` | Seeds master settlements, mouzas, and towns mapped to each district. |
| `03-cuisines.seed.ts` | `cuisines` | Seeds the 40 standard platform food specialties (`Fast Food`, `Shinwari`, `Karahi`, `BBQ`, `Biryani`, `Continental`, etc.). |
| `04-admins.seed.ts` | `users` | Creates or updates Super Admin 1 (`03115514151`) and Super Admin 2 (`03059596704`) with `PLATFORM_ADMIN` role and hashed passwords. |

---

## How to Add a New Seeder in the Future

Whenever a new feature requires initial database seed data, follow these 3 simple steps:

### Step 1: Create the Seeder File
Create a new file in `prisma/seeds/` named with the next sequential number:
```text
prisma/seeds/06-my-feature.seed.ts
```

Implement the seeder function accepting `prisma: PrismaClient`:
```typescript
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export interface SeedMyFeatureResult {
  count: number;
}

export async function seedMyFeature(prisma: PrismaClient): Promise<SeedMyFeatureResult> {
  console.log('  -> Seeding my new feature records...');

  // Use upsert or createMany with skipDuplicates: true for idempotency
  const result = await prisma.myModel.upsert({
    where: { key: 'example' },
    update: { name: 'Updated Example' },
    create: { key: 'example', name: 'Example' },
  });

  return { count: 1 };
}
```

### Step 2: Register in the Master Seeder (`prisma/seed.ts`)
Open [`prisma/seed.ts`](../seed.ts):
1. **Import your seeder:**
   ```typescript
   import { seedMyFeature } from './seeds/06-my-feature.seed.js';
   ```
2. **Add it to the execution pipeline inside `main()`:**
   ```typescript
   // -------------------------------------------------------------------------
   // 6. My Feature
   // -------------------------------------------------------------------------
   if (shouldRun('my-feature')) {
     console.log('\n[6/6] 🚀 Seeding My Feature...');
     const { count } = await seedMyFeature(prisma);
     console.log(`      ✔ ${count} my-feature records verified.`);
   }
   ```

### Step 3: Test and Verify
Run your new seeder individually:
```bash
npm run seed -- --only=my-feature
```
And test the full master run:
```bash
npm run seed
```

---

## Best Practices for Seeders
1. **Idempotency:** Always use `upsert` or `skipDuplicates: true`. Running `npm run seed` multiple times must never throw duplicate key errors or duplicate data.
2. **Explicit Money Units:** All monetary values must be stored in `BigInt` paisa (Rs 1 = 100 paisa, e.g. `BigInt(priceInRs) * 100n`).
3. **No Hardcoded Passwords in Production:** Use `process.env.SEED_ADMIN_PASSWORD` or fallback to secure local development defaults.
4. **Log Clear Progress:** Each seeder should log clean, concise feedback so developers and CI/CD pipelines can observe progress.
