import { config as loadEnv } from 'dotenv';
loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { normalizePhone, isValidPakistaniMobile } from '../src/common/utils/phone.js';

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  try {
    const parsed = new URL(dbUrl);
    console.log(`Connecting to database at host: ${parsed.host}, db: ${parsed.pathname}`);
  } catch {
    console.log(`Connecting to database...`);
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
    connectionTimeoutMillis: 15_000,
  });
  const prisma = new PrismaClient({ adapter });

  // ---------------------------------------------------------------------------
  // 1. Credentials Setup (Password: admin@123)
  // ---------------------------------------------------------------------------
  const sharedPassword = process.env.SEED_ADMIN_PASSWORD || 'admin@123';
  const passwordHash = await bcrypt.hash(sharedPassword, 12);

  const adminAccounts = [
    {
      phone: normalizePhone(process.env.ADMIN_PRIVATE_PHONE_1 || '03115514151'),
      rawPhone: '03115514151',
      name: 'Super Admin 1',
    },
    {
      phone: normalizePhone(process.env.ADMIN_PRIVATE_PHONE_2 || '03059596704'),
      rawPhone: '03059596704',
      name: 'Super Admin 2',
    },
  ];

  for (const adm of adminAccounts) {
    if (!isValidPakistaniMobile(adm.phone)) {
      console.error(`Invalid admin mobile phone number: ${adm.phone}`);
      process.exit(1);
    }
  }

  const legacyAdminPhones = [normalizePhone('03000000000')];

  console.log('\n--- Seeding Platform Admins & Base Geography ---');

  // ---------------------------------------------------------------------------
  // 2. Default City & Area
  // ---------------------------------------------------------------------------
  const city = await prisma.city.upsert({
    where: { slug: 'lower-dir' },
    update: { isActive: true, sortOrder: 0 },
    create: {
      name: 'Lower Dir',
      slug: 'lower-dir',
      sortOrder: 0,
      isActive: true,
    },
  });
  console.log(`✔ Base City: ${city.name} (${city.slug})`);

  const area = await prisma.area.upsert({
    where: { cityId_slug: { cityId: city.id, slug: 'timergara' } },
    update: { isActive: true },
    create: {
      cityId: city.id,
      name: 'Timergara',
      slug: 'timergara',
      sortOrder: 1,
      isActive: true,
      isVerified: true,
      isCustomCreated: false,
    },
  });
  console.log(`✔ Base Area: ${area.name} (${area.slug})`);

  // ---------------------------------------------------------------------------
  // 3. Platform Admin Users (Private numbers: 03115514151 & 03059596704)
  // ---------------------------------------------------------------------------
  for (const legacyPhone of legacyAdminPhones) {
    const disabled = await prisma.user.updateMany({
      where: { phone: legacyPhone, role: UserRole.PLATFORM_ADMIN },
      data: {
        status: UserStatus.DISABLED,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    if (disabled.count > 0) {
      console.log(`✔ Disabled legacy platform admin phone ${legacyPhone}`);
    }
  }

  for (const adm of adminAccounts) {
    const admin = await prisma.user.upsert({
      where: { phone: adm.phone },
      update: {
        name: adm.name,
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        restaurantId: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      create: {
        name: adm.name,
        phone: adm.phone,
        passwordHash,
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
        restaurantId: null,
      },
    });
    console.log(`✔ Platform Admin: ${admin.name} | Phone: ${admin.phone} (${adm.rawPhone})`);
  }

  console.log('\n======================================================');
  console.log('Platform Seeding completed successfully!');
  console.log('Super Admin Credentials (Private Login Numbers):');
  console.log(`  - Admin 1:  03115514151 (or +923115514151) | Password: ${sharedPassword}`);
  console.log(`  - Admin 2:  03059596704 (or +923059596704) | Password: ${sharedPassword}`);
  console.log(`  - Role:     PLATFORM_ADMIN`);
  console.log('Public Support Numbers (Public Site Contacts):');
  console.log(`  - Support 1: 0302 9825213 (03029825213)`);
  console.log(`  - Support 2: 0348 4894115 (03484894115)`);
  console.log('======================================================\n');

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
