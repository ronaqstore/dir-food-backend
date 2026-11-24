import { getPrismaClient } from './seeds/client.js';
import { seedCities } from './seeds/01-cities.seed.js';
import { seedAreas } from './seeds/02-areas.seed.js';
import { seedCuisines } from './seeds/03-cuisines.seed.js';
import { seedAdmins } from './seeds/04-admins.seed.js';
import { seedDemoRestaurant } from './seeds/05-demo-restaurant.seed.js';

interface SeedFlags {
  only?: string;
  skipDemo?: boolean;
}

function parseFlags(): SeedFlags {
  const flags: SeedFlags = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--only=')) {
      flags.only = arg.split('=')[1]?.toLowerCase().trim();
    } else if (arg === '--skip-demo' || arg === '--skip-menu') {
      flags.skipDemo = true;
    }
  }
  return flags;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Database seeding is strictly forbidden in production mode without explicit ALLOW_PRODUCTION_SEED=true.');
  }

  const flags = parseFlags();
  const prisma = getPrismaClient();

  const startTime = Date.now();
  console.log('\n================================================================');
  console.log('              🌱  DIR FOOD - MASTER DATABASE SEEDER            ');
  console.log('================================================================');

  try {
    const isOnly = (name: string) => flags.only === name;
    const shouldRun = (name: string) => !flags.only || isOnly(name);

    // -------------------------------------------------------------------------
    // 1. Platform Cities & Districts
    // -------------------------------------------------------------------------
    if (shouldRun('cities')) {
      console.log('\n[1/5] 🏛️  Seeding Platform Cities & Districts...');
      const { count } = await seedCities(prisma);
      console.log(`      ✔ ${count} Khyber Pakhtunkhwa districts & cities verified.`);
    }

    // -------------------------------------------------------------------------
    // 2. Master Delivery Areas & Localities
    // -------------------------------------------------------------------------
    if (shouldRun('areas')) {
      console.log('\n[2/5] 📍  Seeding Master Delivery Areas & Localities...');
      const { totalCount } = await seedAreas(prisma);
      console.log(`      ✔ ${totalCount} delivery areas & settlements indexed.`);
    }

    // -------------------------------------------------------------------------
    // 3. Master Cuisines & Food Types
    // -------------------------------------------------------------------------
    if (shouldRun('cuisines')) {
      console.log('\n[3/5] 🍲  Seeding Master Cuisines & Food Types...');
      const { count } = await seedCuisines(prisma);
      console.log(`      ✔ ${count} master cuisines verified.`);
    }

    // -------------------------------------------------------------------------
    // 4. Platform Super Admin Accounts
    // -------------------------------------------------------------------------
    if (shouldRun('admins') || shouldRun('admin')) {
      console.log('\n[4/5] 👑  Seeding Platform Super Admins...');
      const { admins, defaultPassword } = await seedAdmins(prisma);
      for (const adm of admins) {
        console.log(`      ✔ ${adm.name} ready: ${adm.rawPhone} (${adm.phone})`);
      }
      console.log(`      🔑 Default Password: ${defaultPassword}`);
    }

    // -------------------------------------------------------------------------
    // 5. Demo Restaurant & Menu Catalog
    // -------------------------------------------------------------------------
    if (!flags.skipDemo && (shouldRun('demo') || shouldRun('menu') || shouldRun('demo-restaurant') || !flags.only)) {
      console.log('\n[5/5] 🍽️  Seeding Demo Restaurant & Full Menu Catalog...');
      const demo = await seedDemoRestaurant(prisma);
      console.log(`      ✔ Restaurant: ${demo.restaurantName}`);
      console.log(`      ✔ Slug:       ${demo.restaurantSlug}`);
      console.log(`      ✔ Owner:      ${demo.ownerPhone} (Password: ${demo.ownerPassword})`);
      console.log(`      ✔ Categories: ${demo.categoriesCount}`);
      console.log(`      ✔ Menu Items: ${demo.itemsCount}`);
      console.log(`      ✔ Variants:   ${demo.variantsCount}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉  ALL DATABASE SEEDING COMPLETED IN ${duration}s!`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Seeding failed with error:');
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
