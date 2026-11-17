import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCategoryItem {
  name: string;
  sortOrder: number;
}

export const DEFAULT_MENU_CATEGORIES: readonly DefaultCategoryItem[] = [
  { name: 'Fast Food', sortOrder: 1 },
  { name: 'BBQ & Grills', sortOrder: 2 },
  { name: 'Karahi & Handi', sortOrder: 3 },
  { name: 'Shinwari', sortOrder: 4 },
  { name: 'Peshawari Namak Mandi', sortOrder: 5 },
  { name: 'Chapli Kabab', sortOrder: 6 },
  { name: 'Kebabs, Tikka & Boti', sortOrder: 7 },
  { name: 'Charga & Broast', sortOrder: 8 },
  { name: 'Rosh & Namkeen Gosht', sortOrder: 9 },
  { name: 'Sajji & Roast', sortOrder: 10 },
  { name: 'Traditional Pashtun Food', sortOrder: 11 },
  { name: 'Swati Traditional Food', sortOrder: 12 },
  { name: 'Chitrali Traditional Food', sortOrder: 13 },
  { name: 'Kohistani Traditional Food', sortOrder: 14 },
  { name: 'Hazara & Hindko Traditional Food', sortOrder: 15 },
  { name: 'Afghan BBQ & Chopan', sortOrder: 16 },
  { name: 'Bannu Pulao', sortOrder: 17 },
  { name: 'Kabuli Pulao & Afghan Rice', sortOrder: 18 },
  { name: 'Biryani', sortOrder: 19 },
  { name: 'Pulao & Rice Dishes', sortOrder: 20 },
  { name: 'Painda & Sohbat', sortOrder: 21 },
  { name: 'Mandi & Kabsa', sortOrder: 22 },
  { name: 'Nihari & Paya', sortOrder: 23 },
  { name: 'Qorma & Kofta', sortOrder: 24 },
  { name: 'Haleem & Khichra', sortOrder: 25 },
  { name: 'Daal, Sabzi & Desi Meals', sortOrder: 26 },
  { name: 'Home-Cooked & Tiffin Meals', sortOrder: 27 },
  { name: 'Pizza', sortOrder: 28 },
  { name: 'Burgers', sortOrder: 29 },
  { name: 'Fried Chicken & Wings', sortOrder: 30 },
  { name: 'Shawarma & Doner', sortOrder: 31 },
  { name: 'Paratha Rolls & Zingerathas', sortOrder: 32 },
  { name: 'Sandwiches & Wraps', sortOrder: 33 },
  { name: 'Pasta & Lasagna', sortOrder: 34 },
  { name: 'Chinese Food', sortOrder: 35 },
  { name: 'Thai & Pan-Asian', sortOrder: 36 },
  { name: 'Noodles, Ramen & Chow Mein', sortOrder: 37 },
  { name: 'Japanese & Sushi', sortOrder: 38 },
  { name: 'Korean Food', sortOrder: 39 },
  { name: 'Steaks & Sizzlers', sortOrder: 40 },
  { name: 'Continental Cuisine', sortOrder: 41 },
  { name: 'Mexican & Tex-Mex', sortOrder: 42 },
  { name: 'Fish, Seafood & Trout', sortOrder: 43 },
  { name: 'Street Food & Chaat', sortOrder: 44 },
  { name: 'Snacks & Savouries', sortOrder: 45 },
  { name: 'Cafe & Coffee', sortOrder: 46 },
  { name: 'Chai & Kahwa', sortOrder: 47 },
  { name: 'Breakfast & Nashta', sortOrder: 48 },
  { name: 'Bakery & Cakes', sortOrder: 49 },
  { name: 'Mithai & Traditional Sweets', sortOrder: 50 },
  { name: 'Desserts & Puddings', sortOrder: 51 },
  { name: 'Ice Cream & Frozen Desserts', sortOrder: 52 },
  { name: 'Waffles, Pancakes & Crepes', sortOrder: 53 },
  { name: 'Juices & Smoothies', sortOrder: 54 },
  { name: 'Shakes & Falooda', sortOrder: 55 },
  { name: 'Mocktails & Lemonades', sortOrder: 56 },
  { name: 'Healthy & Diet Food', sortOrder: 57 },
  { name: 'Vegetarian & Vegan Food', sortOrder: 58 },
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
    if (normExist.includes('fastfood') && normDef.includes('fastfood'))
      return true;
    if (normExist.includes('karahi') && normDef.includes('karahi')) return true;
    if (normExist.includes('bbq') && normDef.includes('bbq')) return true;
    if (normExist.includes('biryani') && normDef.includes('biryani'))
      return true;
    if (normExist.includes('pizza') && normDef.includes('pizza')) return true;
    if (normExist.includes('shawarma') && normDef.includes('shawarma'))
      return true;
    if (normExist.includes('tandoor') && normDef.includes('tandoor'))
      return true;
    if (normExist.includes('roti') && normDef.includes('roti')) return true;
    if (normExist.includes('naan') && normDef.includes('naan')) return true;
    if (normExist.includes('salad') && normDef.includes('salad')) return true;
    if (normExist.includes('beverage') && normDef.includes('beverage'))
      return true;
    if (normExist.includes('drink') && normDef.includes('drink')) return true;
    if (normExist.includes('dessert') && normDef.includes('dessert'))
      return true;
    if (normExist.includes('breakfast') && normDef.includes('breakfast'))
      return true;
    if (normExist.includes('starter') && normDef.includes('starter'))
      return true;
    if (normExist.includes('chinese') && normDef.includes('chinese'))
      return true;
    if (normExist.includes('seafood') && normDef.includes('seafood'))
      return true;
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
