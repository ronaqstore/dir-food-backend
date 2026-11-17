import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultCityItem {
  name: string;
  slug: string;
  sortOrder: number;
}

export const DEFAULT_CITIES: readonly DefaultCityItem[] = [
  { name: 'Lower Dir', slug: 'lower-dir', sortOrder: 1 },
  { name: 'Upper Dir', slug: 'upper-dir', sortOrder: 2 },
  { name: 'Central Dir', slug: 'central-dir', sortOrder: 3 },
  { name: 'Swat', slug: 'swat', sortOrder: 4 },
  { name: 'Bar Swat (Upper Swat)', slug: 'bar-swat-upper-swat', sortOrder: 5 },
  { name: 'Malakand', slug: 'malakand', sortOrder: 6 },
  { name: 'Bajaur', slug: 'bajaur', sortOrder: 7 },
  { name: 'Peshawar', slug: 'peshawar', sortOrder: 8 },
  { name: 'Mardan', slug: 'mardan', sortOrder: 9 },
  { name: 'Charsadda', slug: 'charsadda', sortOrder: 10 },
  { name: 'Nowshera', slug: 'nowshera', sortOrder: 11 },
  { name: 'Swabi', slug: 'swabi', sortOrder: 12 },
  { name: 'Buner', slug: 'buner', sortOrder: 13 },
  { name: 'Shangla', slug: 'shangla', sortOrder: 14 },
  { name: 'Abbottabad', slug: 'abbottabad', sortOrder: 15 },
  { name: 'Haripur', slug: 'haripur', sortOrder: 16 },
  { name: 'Mansehra', slug: 'mansehra', sortOrder: 17 },
  { name: 'Battagram', slug: 'battagram', sortOrder: 18 },
  { name: 'Torghar', slug: 'torghar', sortOrder: 19 },
  { name: 'Allai', slug: 'allai', sortOrder: 20 },
  { name: 'Lower Kohistan', slug: 'lower-kohistan', sortOrder: 21 },
  { name: 'Upper Kohistan', slug: 'upper-kohistan', sortOrder: 22 },
  { name: 'Kolai-Palas', slug: 'kolai-palas', sortOrder: 23 },
  { name: 'Lower Chitral', slug: 'lower-chitral', sortOrder: 24 },
  { name: 'Upper Chitral', slug: 'upper-chitral', sortOrder: 25 },
  { name: 'Kohat', slug: 'kohat', sortOrder: 26 },
  { name: 'Hangu', slug: 'hangu', sortOrder: 27 },
  { name: 'Karak', slug: 'karak', sortOrder: 28 },
  { name: 'Bannu', slug: 'bannu', sortOrder: 29 },
  { name: 'Lakki Marwat', slug: 'lakki-marwat', sortOrder: 30 },
  { name: 'Dera Ismail Khan', slug: 'dera-ismail-khan', sortOrder: 31 },
  { name: 'Tank', slug: 'tank', sortOrder: 32 },
  { name: 'Paharpur', slug: 'paharpur', sortOrder: 33 },
  { name: 'Khyber', slug: 'khyber', sortOrder: 34 },
  { name: 'Mohmand', slug: 'mohmand', sortOrder: 35 },
  { name: 'Kurram', slug: 'kurram', sortOrder: 36 },
  { name: 'Orakzai', slug: 'orakzai', sortOrder: 37 },
  { name: 'North Waziristan', slug: 'north-waziristan', sortOrder: 38 },
  { name: 'South Waziristan', slug: 'south-waziristan', sortOrder: 39 },
  {
    name: 'Lower South Waziristan',
    slug: 'lower-south-waziristan',
    sortOrder: 40,
  },
  {
    name: 'Upper South Waziristan',
    slug: 'upper-south-waziristan',
    sortOrder: 41,
  },
] as const;

export async function ensureDefaultCities(
  prisma: PrismaService,
): Promise<void> {
  const existing = await prisma.city.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((c) => c.slug));
  const missing = DEFAULT_CITIES.filter((c) => !existingSlugs.has(c.slug));

  if (missing.length > 0) {
    await prisma.city.createMany({
      data: missing.map((city) => ({
        name: city.name,
        slug: city.slug,
        sortOrder: city.sortOrder,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}
