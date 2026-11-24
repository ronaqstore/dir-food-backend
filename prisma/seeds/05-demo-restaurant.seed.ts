import bcrypt from 'bcrypt';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  UserRole,
  UserStatus,
  RestaurantStatus,
  ManualStatus,
} from '../../src/generated/prisma/enums.js';
import { normalizePhone } from '../../src/common/utils/phone.js';
import { seedRestaurantDefaults } from '../../src/common/utils/restaurant-defaults.js';
import {
  CATALOG_DATA,
  getDishImage,
} from './data/menu-catalog.data.js';

export interface SeedDemoRestaurantResult {
  restaurantName: string;
  restaurantSlug: string;
  ownerPhone: string;
  ownerPassword: string;
  categoriesCount: number;
  itemsCount: number;
  variantsCount: number;
}

export async function seedDemoRestaurant(
  prisma: PrismaClient,
): Promise<SeedDemoRestaurantResult> {
  // 1. Ensure Lower Dir city is available
  const city = await prisma.city.findFirst({
    where: { slug: 'lower-dir' },
  });

  // 2. Locate or Create Restaurant
  let restaurant = await prisma.restaurant.findFirst({
    where: {
      OR: [{ slug: 'zaiqa-mahal' }, { slug: 'dukan-pro' }],
    },
  });

  const restaurantData = {
    name: 'Zaiqa Mahal & River View Restaurant | ذائقہ محل',
    slug: 'zaiqa-mahal',
    description:
      'Timergara and Lower Dir’s premier dining destination. Specializing in Shinwari Karahi, Live Charcoal BBQ, Gourmet Pizzas, Fast Food, Continental Steaks, Fresh Desserts & Authentic Quetta Chai.',
    cuisines: ['Shinwari', 'BBQ', 'Fast Food', 'Continental', 'Desi'],
    addressText: 'River Road, Balambat Bridge, Timergara, Lower Dir',
    contactPhone: '03001234567',
    whatsappNumber: '03029825214',
    minOrderAmount: 50000n, // Rs. 500 in paisa
    status: RestaurantStatus.ACTIVE,
    manualStatus: ManualStatus.AUTO,
    cityId: city?.id ?? null,
    logoUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&h=300&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&h=400&q=80',
  };

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: restaurantData,
    });
  } else {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: restaurantData,
    });
  }

  // 3. Create or Update Owner Account (Jawad Ullah)
  let ownerUser = await prisma.user.findFirst({
    where: {
      restaurantId: restaurant.id,
      role: UserRole.RESTAURANT_OWNER,
    },
  });

  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'owner@123';
  const ownerPasswordHash = await bcrypt.hash(ownerPassword, 12);
  let effectiveOwnerPhone = '03001234567';

  if (ownerUser) {
    ownerUser = await prisma.user.update({
      where: { id: ownerUser.id },
      data: {
        name: 'Jawad Ullah',
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    effectiveOwnerPhone = ownerUser.phone;
  } else {
    const desiredPhone = normalizePhone(process.env.SEED_OWNER_PHONE || '03001234567');
    const userByPhone = await prisma.user.findUnique({
      where: { phone: desiredPhone },
    });

    if (userByPhone) {
      ownerUser = await prisma.user.update({
        where: { id: userByPhone.id },
        data: {
          name: 'Jawad Ullah',
          role: UserRole.RESTAURANT_OWNER,
          status: UserStatus.ACTIVE,
          restaurantId: restaurant.id,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      effectiveOwnerPhone = desiredPhone;
    } else {
      ownerUser = await prisma.user.create({
        data: {
          name: 'Jawad Ullah',
          phone: desiredPhone,
          passwordHash: ownerPasswordHash,
          role: UserRole.RESTAURANT_OWNER,
          status: UserStatus.ACTIVE,
          restaurantId: restaurant.id,
        },
      });
      effectiveOwnerPhone = desiredPhone;
    }
  }

  // 4. Operating Hours & Delivery Areas
  await seedRestaurantDefaults(prisma as any, restaurant.id, city?.id);

  // Activate delivery areas with delivery fees and minimum order
  await prisma.restaurantDeliveryArea.updateMany({
    where: { restaurantId: restaurant.id },
    data: {
      isActive: true,
      deliveryFee: 10000n, // Rs. 100 in paisa
      minOrderAmount: 50000n, // Rs. 500 in paisa
    },
  });

  // 6. Clean Old Menu for Fresh Seed
  await prisma.menuItemVariant.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.menuItemAddon.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.menuItem.deleteMany({
    where: { restaurantId: restaurant.id },
  });
  await prisma.menuCategory.deleteMany({
    where: { restaurantId: restaurant.id },
  });

  // 7. Seed Categories, Items, Variants & Deals
  let totalItemsCount = 0;
  let totalVariantsCount = 0;

  for (let catIdx = 0; catIdx < CATALOG_DATA.length; catIdx++) {
    const catDef = CATALOG_DATA[catIdx];
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: catDef.name,
        sortOrder: catIdx + 1,
        isActive: true,
      },
    });

    for (let itemIdx = 0; itemIdx < catDef.items.length; itemIdx++) {
      const itemDef = catDef.items[itemIdx];
      const hasVariants = Boolean(
        itemDef.variants && itemDef.variants.length > 0,
      );

      const basePriceInPaisa =
        !hasVariants && itemDef.basePriceInRs !== undefined
          ? BigInt(itemDef.basePriceInRs) * 100n
          : null;

      const isDealItem =
        catDef.name.toLowerCase().includes('deal') ||
        catDef.name.toLowerCase().includes('combo') ||
        itemDef.name.toLowerCase().includes('deal');

      const originalPriceInPaisa =
        isDealItem && basePriceInPaisa
          ? (basePriceInPaisa * 125n) / 100n
          : null;

      const createdItem = await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: itemDef.name.slice(0, 95),
          description: itemDef.description
            ? itemDef.description.slice(0, 280)
            : null,
          imageUrl: getDishImage(itemDef.name, catDef.name),
          basePrice: basePriceInPaisa,
          originalPrice: originalPriceInPaisa,
          isDeal: isDealItem,
          isAvailable: true,
          isActive: true,
          sortOrder: itemIdx + 1,
        },
      });
      totalItemsCount++;

      if (hasVariants && itemDef.variants) {
        for (let varIdx = 0; varIdx < itemDef.variants.length; varIdx++) {
          const v = itemDef.variants[varIdx];
          await prisma.menuItemVariant.create({
            data: {
              restaurantId: restaurant.id,
              menuItemId: createdItem.id,
              name: v.name,
              price: BigInt(v.priceInRs) * 100n,
              isActive: true,
              sortOrder: varIdx + 1,
            },
          });
          totalVariantsCount++;
        }
      }
    }
  }

  return {
    restaurantName: restaurant.name,
    restaurantSlug: restaurant.slug,
    ownerPhone: effectiveOwnerPhone,
    ownerPassword,
    categoriesCount: CATALOG_DATA.length,
    itemsCount: totalItemsCount,
    variantsCount: totalVariantsCount,
  };
}
