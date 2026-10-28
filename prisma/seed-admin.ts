import { config as loadEnv } from 'dotenv';
loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  UserRole,
  UserStatus,
  RestaurantStatus,
  ManualStatus,
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
  // 1. Credentials Setup (Simple and identical password: admin@123)
  // ---------------------------------------------------------------------------
  const sharedPassword =
    process.env.SEED_ADMIN_PASSWORD || process.env.SEED_OWNER_PASSWORD || 'admin@123';
  const passwordHash = await bcrypt.hash(sharedPassword, 12);

  const adminPhone = normalizePhone(process.env.SEED_ADMIN_PHONE || '03029825213');
  const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';
  const legacyAdminPhone = normalizePhone('03000000000');

  const ownerPhone = normalizePhone(process.env.SEED_OWNER_PHONE || '03111111111');
  const ownerName = process.env.SEED_OWNER_NAME || 'Shop Owner';
  const shopName =
    process.env.SEED_SHOP_NAME || 'Zaiqa Mahal & River View Restaurant';

  if (!isValidPakistaniMobile(adminPhone)) {
    console.error(`Invalid admin mobile phone number: ${adminPhone}`);
    process.exit(1);
  }
  if (!isValidPakistaniMobile(ownerPhone)) {
    console.error(`Invalid owner mobile phone number: ${ownerPhone}`);
    process.exit(1);
  }

  console.log('\n--- Seeding Database ---');

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
    },
  });
  console.log(`✔ Base Area: ${area.name} (${area.slug})`);

  // ---------------------------------------------------------------------------
  // 3. Platform Admin User
  // ---------------------------------------------------------------------------
  if (legacyAdminPhone !== adminPhone) {
    const disabled = await prisma.user.updateMany({
      where: { phone: legacyAdminPhone, role: UserRole.PLATFORM_ADMIN },
      data: {
        status: UserStatus.DISABLED,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    if (disabled.count > 0) {
      console.log(`✔ Disabled legacy platform admin phone ${legacyAdminPhone}`);
    }
  }

  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      name: adminName,
      passwordHash,
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      restaurantId: null,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      name: adminName,
      phone: adminPhone,
      passwordHash,
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      restaurantId: null,
    },
  });
  console.log(`✔ Platform Admin: ${admin.name} | Phone: ${admin.phone}`);

  // ---------------------------------------------------------------------------
  // 4. Restaurant for Owner
  // ---------------------------------------------------------------------------
  const restaurantSlug = process.env.SEED_RESTAURANT_SLUG || 'zaiqa-mahal';
  const futureSubscription = new Date();
  futureSubscription.setFullYear(futureSubscription.getFullYear() + 1);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: restaurantSlug },
    update: {
      name: shopName,
      status: RestaurantStatus.ACTIVE,
      manualStatus: ManualStatus.AUTO,
      contactPhone: ownerPhone,
      whatsappNumber: ownerPhone,
      trialStartedAt: new Date(),
      subscriptionEndsAt: futureSubscription,
      cityId: city.id,
    },
    create: {
      name: shopName,
      slug: restaurantSlug,
      cityId: city.id,
      description: 'Your favorite local dishes delivered hot and fresh.',
      cuisines: ['Traditional', 'Fast Food', 'BBQ'],
      addressText: 'Main Bazaar, Timergara',
      contactPhone: ownerPhone,
      whatsappNumber: ownerPhone,
      minOrderAmount: 50000n, // Rs 500
      status: RestaurantStatus.ACTIVE,
      manualStatus: ManualStatus.AUTO,
      trialStartedAt: new Date(),
      subscriptionEndsAt: futureSubscription,
    },
  });
  console.log(`✔ Restaurant: ${restaurant.name} (Slug: ${restaurant.slug})`);

  // ---------------------------------------------------------------------------
  // 5. Restaurant Owner User
  // ---------------------------------------------------------------------------
  const owner = await prisma.user.upsert({
    where: { phone: ownerPhone },
    update: {
      name: ownerName,
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: restaurant.id,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      name: ownerName,
      phone: ownerPhone,
      passwordHash,
      role: UserRole.RESTAURANT_OWNER,
      status: UserStatus.ACTIVE,
      restaurantId: restaurant.id,
    },
  });
  console.log(`✔ Restaurant Owner: ${owner.name} | Phone: ${owner.phone} (03111111111)`);

  // ---------------------------------------------------------------------------
  // 6. Connect Restaurant to Delivery Area
  // ---------------------------------------------------------------------------
  const existingRda = await prisma.restaurantDeliveryArea.findFirst({
    where: {
      restaurantId: restaurant.id,
      areaId: area.id,
    },
  });
  if (!existingRda) {
    await prisma.restaurantDeliveryArea.create({
      data: {
        restaurantId: restaurant.id,
        areaId: area.id,
        deliveryFee: 10000n, // Rs 100
        isActive: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 7. Operating Hours (Sunday = 0 to Saturday = 6)
  // ---------------------------------------------------------------------------
  const openTime = new Date('1970-01-01T09:00:00.000Z');
  const closeTime = new Date('1970-01-01T23:00:00.000Z');

  for (let day = 0; day <= 6; day++) {
    const existingHours = await prisma.restaurantHours.findFirst({
      where: {
        restaurantId: restaurant.id,
        dayOfWeek: day,
      },
    });
    if (!existingHours) {
      await prisma.restaurantHours.create({
        data: {
          restaurantId: restaurant.id,
          dayOfWeek: day,
          openTime,
          closeTime,
        },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Sample Menu Category & Item
  // ---------------------------------------------------------------------------
  const existingCat = await prisma.menuCategory.findFirst({
    where: { restaurantId: restaurant.id, name: 'Popular Dishes' },
  });
  const category =
    existingCat ??
    (await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Popular Dishes',
        sortOrder: 1,
      },
    }));

  const existingItem = await prisma.menuItem.findFirst({
    where: { restaurantId: restaurant.id, name: 'Special Chicken Karahi' },
  });
  if (!existingItem) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category.id,
        name: 'Special Chicken Karahi',
        description: 'Fresh desi chicken cooked with green chilies, tomatoes, and organic spices.',
        basePrice: 120000n, // Rs 1,200
        isAvailable: true,
        isActive: true,
        sortOrder: 1,
      },
    });
  }

  console.log('\n======================================================');
  console.log('Seeding completed successfully!');
  console.log('Super Admin Credentials:');
  console.log(`  - Mobile:   03029825213 (or +${adminPhone})`);
  console.log(`  - Password: ${sharedPassword}`);
  console.log(`  - Role:     PLATFORM_ADMIN`);
  console.log('Restaurant Owner Credentials:');
  console.log(`  - Mobile:   03111111111 (or +923111111111)`);
  console.log(`  - Password: ${sharedPassword}`);
  console.log(`  - Role:     RESTAURANT_OWNER`);
  console.log(`  - Linked:   ${restaurant.name}`);
  console.log('======================================================\n');

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Failed to seed database:', err);
  process.exit(1);
});
