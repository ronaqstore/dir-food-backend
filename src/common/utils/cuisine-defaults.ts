import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCuisineItem {
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
}

export const DEFAULT_MASTER_CUISINES: readonly DefaultCuisineItem[] = [
  { name: 'Fast Food', slug: 'fast-food', icon: null, sortOrder: 1 },
  { name: 'Karahi', slug: 'karahi', icon: null, sortOrder: 2 },
  { name: 'BBQ', slug: 'bbq', icon: null, sortOrder: 3 },
  { name: 'Biryani', slug: 'biryani', icon: null, sortOrder: 4 },
  { name: 'Pizza', slug: 'pizza', icon: null, sortOrder: 5 },
  { name: 'Burgers', slug: 'burgers', icon: null, sortOrder: 6 },
  { name: 'Chai & Cafe', slug: 'chai-cafe', icon: null, sortOrder: 7 },
  { name: 'Traditional', slug: 'traditional', icon: null, sortOrder: 8 },
  { name: 'Kabab', slug: 'kabab', icon: null, sortOrder: 9 },
  { name: 'Pulao', slug: 'pulao', icon: null, sortOrder: 10 },
  { name: 'Shawarma', slug: 'shawarma', icon: null, sortOrder: 11 },
  { name: 'Chinese', slug: 'chinese', icon: null, sortOrder: 12 },
  { name: 'Fish & Seafood', slug: 'fish-seafood', icon: null, sortOrder: 13 },
  { name: 'Breakfast', slug: 'breakfast', icon: null, sortOrder: 14 },
  { name: 'Beverages', slug: 'beverages', icon: null, sortOrder: 15 },
  { name: 'Desserts', slug: 'desserts', icon: null, sortOrder: 16 },
  { name: 'Shinwari', slug: 'shinwari', icon: null, sortOrder: 17 },
  { name: 'Tikka', slug: 'tikka', icon: null, sortOrder: 18 },
] as const;

export async function ensureDefaultCuisines(
  prisma: PrismaService,
): Promise<void> {
  const count = await prisma.cuisine.count();
  if (count < DEFAULT_MASTER_CUISINES.length) {
    await prisma.cuisine.createMany({
      data: DEFAULT_MASTER_CUISINES.map((cuisine) => ({
        name: cuisine.name,
        slug: cuisine.slug,
        icon: cuisine.icon,
        sortOrder: cuisine.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}
