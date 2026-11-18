import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCuisineItem {
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
}

export const DEFAULT_MASTER_CUISINES: readonly DefaultCuisineItem[] = [
  { name: 'Pakistani', slug: 'pakistani', icon: null, sortOrder: 1 },
  { name: 'Pashtun / Pukhtoon', slug: 'pashtun', icon: null, sortOrder: 2 },
  { name: 'Peshawari', slug: 'peshawari', icon: null, sortOrder: 3 },
  { name: 'Swati', slug: 'swati', icon: null, sortOrder: 4 },
  {
    name: 'Chitrali / Khowar',
    slug: 'chitrali-khowar',
    icon: null,
    sortOrder: 5,
  },
  { name: 'Kohistani', slug: 'kohistani', icon: null, sortOrder: 6 },
  { name: 'Hazara / Hindko', slug: 'hazara-hindko', icon: null, sortOrder: 7 },
  { name: 'Afghan', slug: 'afghan', icon: null, sortOrder: 8 },
  { name: 'Central Asian', slug: 'central-asian', icon: null, sortOrder: 9 },
  { name: 'Punjabi', slug: 'punjabi', icon: null, sortOrder: 10 },
  { name: 'Sindhi', slug: 'sindhi', icon: null, sortOrder: 11 },
  { name: 'Balochi', slug: 'balochi', icon: null, sortOrder: 12 },
  { name: 'Kashmiri', slug: 'kashmiri', icon: null, sortOrder: 13 },
  { name: 'Mughlai', slug: 'mughlai', icon: null, sortOrder: 14 },
  { name: 'North Indian', slug: 'north-indian', icon: null, sortOrder: 15 },
  { name: 'South Indian', slug: 'south-indian', icon: null, sortOrder: 16 },
  { name: 'Chinese', slug: 'chinese', icon: null, sortOrder: 17 },
  { name: 'Thai', slug: 'thai', icon: null, sortOrder: 18 },
  { name: 'Japanese', slug: 'japanese', icon: null, sortOrder: 19 },
  { name: 'Korean', slug: 'korean', icon: null, sortOrder: 20 },
  { name: 'Turkish', slug: 'turkish', icon: null, sortOrder: 21 },
  {
    name: 'Arabic & Middle Eastern',
    slug: 'middle-eastern',
    icon: null,
    sortOrder: 22,
  },
  { name: 'Lebanese', slug: 'lebanese', icon: null, sortOrder: 23 },
  {
    name: 'Persian / Iranian',
    slug: 'persian-iranian',
    icon: null,
    sortOrder: 24,
  },
  { name: 'Mediterranean', slug: 'mediterranean', icon: null, sortOrder: 25 },
  { name: 'Italian', slug: 'italian', icon: null, sortOrder: 26 },
  { name: 'American', slug: 'american', icon: null, sortOrder: 27 },
  { name: 'Mexican', slug: 'mexican', icon: null, sortOrder: 28 },
  { name: 'Continental', slug: 'continental', icon: null, sortOrder: 29 },
  { name: 'Asian Fusion', slug: 'asian-fusion', icon: null, sortOrder: 30 },
  { name: 'Fast Food', slug: 'fast-food', icon: null, sortOrder: 31 },
  { name: 'Shinwari', slug: 'shinwari', icon: null, sortOrder: 32 },
  { name: 'Fish & Seafood', slug: 'fish-seafood', icon: null, sortOrder: 33 },
  { name: 'BBQ & Grills', slug: 'bbq-grills', icon: null, sortOrder: 34 },
  { name: 'Cafe & Bakery', slug: 'cafe-bakery', icon: null, sortOrder: 35 },
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
