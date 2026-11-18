import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCategoryItem {
  name: string;
  sortOrder: number;
}

export const DEFAULT_MENU_CATEGORIES: readonly DefaultCategoryItem[] = [
  { name: 'Deals & Combos', sortOrder: 1 },
  { name: 'Platters & Family Taals', sortOrder: 2 },
  { name: 'Soups & Starters', sortOrder: 3 },
  { name: 'Salads & Raita', sortOrder: 4 },
  { name: 'Karahi & Handi', sortOrder: 5 },
  { name: 'Shinwari', sortOrder: 6 },
  { name: 'Dampokh, Rosh & Namkeen Gosht', sortOrder: 7 },
  { name: 'BBQ & Grills', sortOrder: 8 },
  { name: 'Kebabs, Tikka & Boti', sortOrder: 9 },
  { name: 'Chapli Kabab', sortOrder: 10 },
  { name: 'Fish, Seafood & Trout', sortOrder: 11 },
  { name: 'Sajji & Roast', sortOrder: 12 },
  { name: 'Charga & Broast', sortOrder: 13 },
  { name: 'Mandi & Kabsa', sortOrder: 14 },
  { name: 'Kabuli Pulao & Afghan Rice', sortOrder: 15 },
  { name: 'Bannu Pulao', sortOrder: 16 },
  { name: 'Biryani', sortOrder: 17 },
  { name: 'Pulao & Rice Dishes', sortOrder: 18 },
  { name: 'Peshawari Namak Mandi', sortOrder: 19 },
  { name: 'Afghan BBQ & Chopan', sortOrder: 20 },
  { name: 'Traditional Pashtun Food', sortOrder: 21 },
  { name: 'Swati Traditional Food', sortOrder: 22 },
  { name: 'Chitrali Traditional Food', sortOrder: 23 },
  { name: 'Kohistani Traditional Food', sortOrder: 24 },
  { name: 'Hazara & Hindko Traditional Food', sortOrder: 25 },
  { name: 'Painda & Sohbat', sortOrder: 26 },
  { name: 'Nihari & Paya', sortOrder: 27 },
  { name: 'Qorma & Kofta', sortOrder: 28 },
  { name: 'Haleem & Khichra', sortOrder: 29 },
  { name: 'Daal, Sabzi & Desi Meals', sortOrder: 30 },
  { name: 'Home-Cooked & Tiffin Meals', sortOrder: 31 },
  { name: 'Tandoor, Naan & Roti', sortOrder: 32 },
  { name: 'Fast Food', sortOrder: 33 },
  { name: 'Burgers', sortOrder: 34 },
  { name: 'Pizza', sortOrder: 35 },
  { name: 'Fried Chicken & Wings', sortOrder: 36 },
  { name: 'Fries, Wings & Appetizers', sortOrder: 37 },
  { name: 'Shawarma & Doner', sortOrder: 38 },
  { name: 'Paratha Rolls & Zingerathas', sortOrder: 39 },
  { name: 'Sandwiches & Wraps', sortOrder: 40 },
  { name: 'Pasta & Lasagna', sortOrder: 41 },
  { name: 'Chinese Food', sortOrder: 42 },
  { name: 'Noodles, Ramen & Chow Mein', sortOrder: 43 },
  { name: 'Thai & Pan-Asian', sortOrder: 44 },
  { name: 'Japanese & Sushi', sortOrder: 45 },
  { name: 'Korean Food', sortOrder: 46 },
  { name: 'Steaks & Sizzlers', sortOrder: 47 },
  { name: 'Continental Cuisine', sortOrder: 48 },
  { name: 'Mexican & Tex-Mex', sortOrder: 49 },
  { name: 'Breakfast & Nashta', sortOrder: 50 },
  { name: 'Street Food & Chaat', sortOrder: 51 },
  { name: 'Snacks & Savouries', sortOrder: 52 },
  { name: 'Chai & Kahwa', sortOrder: 53 },
  { name: 'Cafe & Coffee', sortOrder: 54 },
  { name: 'Cold Drinks & Mineral Water', sortOrder: 55 },
  { name: 'Lassi & Traditional Beverages', sortOrder: 56 },
  { name: 'Juices & Smoothies', sortOrder: 57 },
  { name: 'Shakes & Falooda', sortOrder: 58 },
  { name: 'Mocktails & Lemonades', sortOrder: 59 },
  { name: 'Ice Cream & Frozen Desserts', sortOrder: 60 },
  { name: 'Desserts & Puddings', sortOrder: 61 },
  { name: 'Mithai & Traditional Sweets', sortOrder: 62 },
  { name: 'Bakery & Cakes', sortOrder: 63 },
  { name: 'Waffles, Pancakes & Crepes', sortOrder: 64 },
  { name: 'Healthy & Diet Food', sortOrder: 65 },
  { name: 'Vegetarian & Vegan Food', sortOrder: 66 },
] as const;

export function isCategoryCovered(
  defaultName: string,
  existingNames: string[],
): boolean {
  const normDef = defaultName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return existingNames.some((existing) => {
    const normExist = existing.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normDef === normExist) return true;
    if (normExist.includes('deal') && normDef.includes('deal')) return true;
    if (normExist.includes('combo') && normDef.includes('combo')) return true;
    if (normExist.includes('platter') && normDef.includes('platter')) return true;
    if (normExist.includes('taal') && normDef.includes('taal')) return true;
    if (normExist.includes('soup') && normDef.includes('soup')) return true;
    if (normExist.includes('starter') && normDef.includes('starter')) return true;
    if (normExist.includes('fastfood') && normDef.includes('fastfood')) return true;
    if (normExist.includes('karahi') && normDef.includes('karahi')) return true;
    if (normExist.includes('handi') && normDef.includes('handi')) return true;
    if (normExist.includes('bbq') && normDef.includes('bbq')) return true;
    if (normExist.includes('grill') && normDef.includes('grill')) return true;
    if (normExist.includes('biryani') && normDef.includes('biryani')) return true;
    if (normExist.includes('pulao') && normDef.includes('pulao')) return true;
    if (normExist.includes('dampokh') && normDef.includes('dampokh')) return true;
    if (normExist.includes('rosh') && normDef.includes('rosh')) return true;
    if (normExist.includes('namkeen') && normDef.includes('namkeen')) return true;
    if (normExist.includes('pizza') && normDef.includes('pizza')) return true;
    if (normExist.includes('burger') && normDef.includes('burger')) return true;
    if (normExist.includes('shawarma') && normDef.includes('shawarma')) return true;
    if (normExist.includes('tandoor') && normDef.includes('tandoor')) return true;
    if (normExist.includes('roti') && normDef.includes('roti')) return true;
    if (normExist.includes('naan') && normDef.includes('naan')) return true;
    if (normExist.includes('salad') && normDef.includes('salad')) return true;
    if (normExist.includes('raita') && normDef.includes('raita')) return true;
    if (normExist.includes('beverage') && normDef.includes('beverage')) return true;
    if (normExist.includes('drink') && normDef.includes('drink')) return true;
    if (normExist.includes('water') && normDef.includes('water')) return true;
    if (normExist.includes('chai') && normDef.includes('chai')) return true;
    if (normExist.includes('kehwa') && normDef.includes('kehwa')) return true;
    if (normExist.includes('kahwa') && normDef.includes('kahwa')) return true;
    if (normExist.includes('tea') && normDef.includes('tea')) return true;
    if (normExist.includes('lassi') && normDef.includes('lassi')) return true;
    if (normExist.includes('dessert') && normDef.includes('dessert')) return true;
    if (normExist.includes('sweet') && normDef.includes('sweet')) return true;
    if (normExist.includes('breakfast') && normDef.includes('breakfast')) return true;
    if (normExist.includes('nashta') && normDef.includes('nashta')) return true;
    if (normExist.includes('chinese') && normDef.includes('chinese')) return true;
    if (normExist.includes('seafood') && normDef.includes('seafood')) return true;
    if (normExist.includes('fish') && normDef.includes('fish')) return true;
    return false;
  });
}

export async function ensureDefaultCategories(
  prisma: PrismaService,
  restaurantId: string,
): Promise<void> {
  const existing = await prisma.menuCategory.findMany({
    where: { restaurantId },
    select: { name: true, sortOrder: true },
  });

  const existingNames = existing.map((c) => c.name);
  const maxSortOrder = existing.reduce(
    (max, c) => Math.max(max, c.sortOrder),
    0,
  );

  const missing = DEFAULT_MENU_CATEGORIES.filter(
    (defCat) => !isCategoryCovered(defCat.name, existingNames),
  );

  if (missing.length === 0) {
    return;
  }

  let nextSortOrder =
    maxSortOrder === 0 && existing.length === 0 ? 1 : maxSortOrder + 1;

  await prisma.menuCategory.createMany({
    data: missing.map((category) => ({
      restaurantId,
      name: category.name,
      sortOrder: nextSortOrder++,
      isActive: true,
    })),
  });
}
