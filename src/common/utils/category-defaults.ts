import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCategoryItem {
  name: string;
  sortOrder: number;
}

export const DEFAULT_MENU_CATEGORIES: readonly DefaultCategoryItem[] = [
  { name: 'Deals & Combos', sortOrder: 1 },
  { name: 'Starters & Appetizers', sortOrder: 2 },
  { name: 'Karahi & Handi', sortOrder: 3 },
  { name: 'BBQ & Grills', sortOrder: 4 },
  { name: 'Biryani & Rice', sortOrder: 5 },
  { name: 'Fast Food & Burgers', sortOrder: 6 },
  { name: 'Pizza', sortOrder: 7 },
  { name: 'Shawarma & Rolls', sortOrder: 8 },
  { name: 'Tandoor (Roti & Naan)', sortOrder: 9 },
  { name: 'Fish & Seafood', sortOrder: 10 },
  { name: 'Chinese Dishes', sortOrder: 11 },
  { name: 'Salad & Raita', sortOrder: 12 },
  { name: 'Beverages & Cold Drinks', sortOrder: 13 },
  { name: 'Chai & Hot Drinks', sortOrder: 14 },
  { name: 'Desserts & Sweets', sortOrder: 15 },
  { name: 'Breakfast', sortOrder: 16 },
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
