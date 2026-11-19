import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCategoryItem {
  name: string;
  sortOrder: number;
}

export const DEFAULT_MENU_CATEGORIES: readonly DefaultCategoryItem[] = [
  { name: 'Deals', sortOrder: 1 },
  { name: 'Platters & Family Taals', sortOrder: 2 },
  { name: 'Soups & Starters', sortOrder: 3 },
  { name: 'Salads & Raita', sortOrder: 4 },
  { name: 'Karahi & Handi', sortOrder: 5 },
  { name: 'Shinwari', sortOrder: 6 },
  { name: 'Dampokh, Rosh & Namkeen Gosht', sortOrder: 7 },
  { name: 'BBQ & Grills', sortOrder: 8 },
  { name: 'Kebabs, Tikka & Boti', sortOrder: 9 },
  { name: 'Chapli Kabab', sortOrder: 10 },
  { name: 'Batair, Quail & Game Birds', sortOrder: 11 },
  { name: 'Mutton Ribs, Champ & Organ Meats', sortOrder: 12 },
  { name: 'Fish, Seafood & Trout', sortOrder: 13 },
  { name: 'Sajji & Roast', sortOrder: 14 },
  { name: 'Charga & Broast', sortOrder: 15 },
  { name: 'Mandi & Kabsa', sortOrder: 16 },
  { name: 'Kabuli Pulao & Afghan Rice', sortOrder: 17 },
  { name: 'Bannu Pulao', sortOrder: 18 },
  { name: 'Biryani', sortOrder: 19 },
  { name: 'Pulao & Rice Dishes', sortOrder: 20 },
  { name: 'Peshawari Namak Mandi', sortOrder: 21 },
  { name: 'Afghan BBQ & Chopan', sortOrder: 22 },
  { name: 'Traditional Pashtun Food', sortOrder: 23 },
  { name: 'Swati Traditional Food', sortOrder: 24 },
  { name: 'Chitrali Traditional Food', sortOrder: 25 },
  { name: 'Kohistani Traditional Food', sortOrder: 26 },
  { name: 'Hazara & Hindko Traditional Food', sortOrder: 27 },
  { name: 'Painda & Sohbat', sortOrder: 28 },
  { name: 'Nihari & Paya', sortOrder: 29 },
  { name: 'Qorma & Kofta', sortOrder: 30 },
  { name: 'Haleem & Khichra', sortOrder: 31 },
  { name: 'Daal, Sabzi & Desi Meals', sortOrder: 32 },
  { name: 'Home-Cooked & Tiffin Meals', sortOrder: 33 },
  { name: 'Tandoor, Naan & Roti', sortOrder: 34 },
  { name: 'Parathas & Stuffed Flatbreads', sortOrder: 35 },
  { name: 'Fast Food', sortOrder: 36 },
  { name: 'Burgers', sortOrder: 37 },
  { name: 'Pizza', sortOrder: 38 },
  { name: 'Fried Chicken & Wings', sortOrder: 39 },
  { name: 'Fries, Wings & Appetizers', sortOrder: 40 },
  { name: 'Nachos, Loaded Fries & Tostadas', sortOrder: 41 },
  { name: 'Shawarma & Doner', sortOrder: 42 },
  { name: 'Paratha Rolls & Zingerathas', sortOrder: 43 },
  { name: 'Sandwiches & Wraps', sortOrder: 44 },
  { name: 'Paninis & Gourmet Toasts', sortOrder: 45 },
  { name: 'Pasta & Lasagna', sortOrder: 46 },
  { name: 'Chinese Food', sortOrder: 47 },
  { name: 'Noodles, Ramen & Chow Mein', sortOrder: 48 },
  { name: 'Thai & Pan-Asian', sortOrder: 49 },
  { name: 'Japanese & Sushi', sortOrder: 50 },
  { name: 'Korean Food', sortOrder: 51 },
  { name: 'Steaks & Sizzlers', sortOrder: 52 },
  { name: 'Continental Cuisine', sortOrder: 53 },
  { name: 'Mexican & Tex-Mex', sortOrder: 54 },
  { name: 'Breakfast & Nashta', sortOrder: 55 },
  { name: 'Street Food & Chaat', sortOrder: 56 },
  { name: 'Snacks & Savouries', sortOrder: 57 },
  { name: 'Kids Meals & Junior Box', sortOrder: 58 },
  { name: 'Chai & Kahwa', sortOrder: 59 },
  { name: 'Cafe & Coffee', sortOrder: 60 },
  { name: 'Cold Drinks & Mineral Water', sortOrder: 61 },
  { name: 'Lassi & Traditional Beverages', sortOrder: 62 },
  { name: 'Juices & Smoothies', sortOrder: 63 },
  { name: 'Shakes & Falooda', sortOrder: 64 },
  { name: 'Mocktails & Lemonades', sortOrder: 65 },
  { name: 'Ice Cream & Frozen Desserts', sortOrder: 66 },
  { name: 'Desserts & Puddings', sortOrder: 67 },
  { name: 'Mithai & Traditional Sweets', sortOrder: 68 },
  { name: 'Bakery & Cakes', sortOrder: 69 },
  { name: 'Waffles, Pancakes & Crepes', sortOrder: 70 },
  { name: 'Healthy & Diet Food', sortOrder: 71 },
  { name: 'Vegetarian & Vegan Food', sortOrder: 72 },
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
    if (normExist.includes('sobat') && normDef.includes('sobat')) return true;
    if (normExist.includes('painda') && normDef.includes('painda')) return true;
    if (normExist.includes('mandi') && normDef.includes('mandi')) return true;
    if (normExist.includes('kabsa') && normDef.includes('kabsa')) return true;
    if (normExist.includes('sajji') && normDef.includes('sajji')) return true;
    if (normExist.includes('chargha') && normDef.includes('chargha')) return true;
    if (normExist.includes('broast') && normDef.includes('broast')) return true;
    if (normExist.includes('kabab') && normDef.includes('kabab')) return true;
    if (normExist.includes('kebab') && normDef.includes('kebab')) return true;
    if (normExist.includes('tikka') && normDef.includes('tikka')) return true;
    if (normExist.includes('boti') && normDef.includes('boti')) return true;
    if (normExist.includes('icecream') && normDef.includes('icecream')) return true;
    if (normExist.includes('falooda') && normDef.includes('falooda')) return true;
    if (normExist.includes('shake') && normDef.includes('shake')) return true;
    if (normExist.includes('sandwich') && normDef.includes('sandwich')) return true;
    if (normExist.includes('paratha') && normDef.includes('paratha')) return true;
    if (normExist.includes('coffee') && normDef.includes('coffee')) return true;
    if (normExist.includes('cafe') && normDef.includes('cafe')) return true;
    if (normExist.includes('bakery') && normDef.includes('bakery')) return true;
    if (normExist.includes('cake') && normDef.includes('cake')) return true;
    if (normExist.includes('wing') && normDef.includes('wing')) return true;
    if (normExist.includes('trout') && normDef.includes('trout')) return true;
    if (normExist.includes('steak') && normDef.includes('steak')) return true;
    if (normExist.includes('pasta') && normDef.includes('pasta')) return true;
    if (normExist.includes('panini') && normDef.includes('panini')) return true;
    if (normExist.includes('karhai') && normDef.includes('karahi')) return true;
    if (normExist.includes('barbq') && normDef.includes('bbq')) return true;
    if (normExist.includes('barbeque') && normDef.includes('bbq')) return true;
    if (normExist.includes('batair') && normDef.includes('batair')) return true;
    if (normExist.includes('quail') && normDef.includes('quail')) return true;
    if (normExist.includes('champ') && normDef.includes('champ')) return true;
    if (normExist.includes('rib') && normDef.includes('rib')) return true;
    if (normExist.includes('brain') && normDef.includes('brain')) return true;
    if (normExist.includes('maghaz') && normDef.includes('maghaz')) return true;
    if (normExist.includes('nacho') && normDef.includes('nacho')) return true;
    if (normExist.includes('tostada') && normDef.includes('tostada')) return true;
    if (normExist.includes('plater') && normDef.includes('platter')) return true;
    if (normExist.includes('kid') && normDef.includes('kid')) return true;
    if (normExist.includes('junior') && normDef.includes('junior')) return true;
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
