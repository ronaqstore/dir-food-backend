import type { PrismaService } from '../../prisma/prisma.service.js';

export interface DefaultAreaItem {
  name: string;
  slug: string;
  sortOrder: number;
}

export const DEFAULT_AREAS_BY_CITY_SLUG: Readonly<
  Record<string, readonly DefaultAreaItem[]>
> = {
  'lower-dir': [
    { name: 'Timergara', slug: 'timergara', sortOrder: 1 },
    { name: 'Balambat', slug: 'balambat', sortOrder: 2 },
    { name: 'Talash', slug: 'talash', sortOrder: 3 },
    { name: 'Chakdara', slug: 'chakdara', sortOrder: 4 },
    { name: 'Samarbagh', slug: 'samarbagh', sortOrder: 5 },
    { name: 'Munda', slug: 'munda', sortOrder: 6 },
    { name: 'Lal Qila (Maidan)', slug: 'lal-qila-maidan', sortOrder: 7 },
    { name: 'Khall', slug: 'khall', sortOrder: 8 },
    { name: 'Koto', slug: 'koto', sortOrder: 9 },
    { name: 'Odigram', slug: 'odigram', sortOrder: 10 },
    { name: 'Mayar', slug: 'mayar', sortOrder: 11 },
    { name: 'Asbanr', slug: 'asbanr', sortOrder: 12 },
    { name: 'Rabat', slug: 'rabat', sortOrder: 13 },
    { name: 'Gulabad', slug: 'gulabad', sortOrder: 14 },
    { name: 'Badwan', slug: 'badwan', sortOrder: 15 },
    { name: 'Shahi', slug: 'shahi', sortOrder: 16 },
    { name: 'Kumbar', slug: 'kumbar', sortOrder: 17 },
  ],
  'upper-dir': [
    { name: 'Dir City', slug: 'dir-city', sortOrder: 1 },
    { name: 'Wari', slug: 'wari', sortOrder: 2 },
    { name: 'Darora', slug: 'darora', sortOrder: 3 },
    { name: 'Chukiatan', slug: 'chukiatan', sortOrder: 4 },
    { name: 'Sheringal', slug: 'sheringal', sortOrder: 5 },
    { name: 'Kalkot', slug: 'kalkot', sortOrder: 6 },
    { name: 'Kumrat', slug: 'kumrat', sortOrder: 7 },
  ],
  'central-dir': [
    { name: 'Larjam', slug: 'larjam', sortOrder: 1 },
    { name: 'Nehag', slug: 'nehag', sortOrder: 2 },
    { name: 'Warai', slug: 'warai-central', sortOrder: 3 },
  ],
  swat: [
    { name: 'Mingora', slug: 'mingora', sortOrder: 1 },
    { name: 'Saidu Sharif', slug: 'saidu-sharif', sortOrder: 2 },
    { name: 'Barikot', slug: 'barikot', sortOrder: 3 },
    { name: 'Matta', slug: 'matta', sortOrder: 4 },
    { name: 'Kabal', slug: 'kabal', sortOrder: 5 },
    { name: 'Khwazakhela', slug: 'khwazakhela', sortOrder: 6 },
    { name: 'Madyan', slug: 'madyan', sortOrder: 7 },
    { name: 'Bahrain', slug: 'bahrain', sortOrder: 8 },
    { name: 'Kalam', slug: 'kalam', sortOrder: 9 },
  ],
  'bar-swat-upper-swat': [
    { name: 'Madyan', slug: 'madyan-upper', sortOrder: 1 },
    { name: 'Bahrain', slug: 'bahrain-upper', sortOrder: 2 },
    { name: 'Kalam', slug: 'kalam-upper', sortOrder: 3 },
    { name: 'Usho', slug: 'usho', sortOrder: 4 },
  ],
  malakand: [
    { name: 'Batkhela', slug: 'batkhela', sortOrder: 1 },
    { name: 'Dargai', slug: 'dargai', sortOrder: 2 },
    { name: 'Thana', slug: 'thana', sortOrder: 3 },
    { name: 'Malakand Khas', slug: 'malakand-khas', sortOrder: 4 },
  ],
  bajaur: [
    { name: 'Khar', slug: 'khar', sortOrder: 1 },
    { name: 'Nawagai', slug: 'nawagai', sortOrder: 2 },
    { name: 'Inayat Killa', slug: 'inayat-killa', sortOrder: 3 },
  ],
  peshawar: [
    { name: 'University Town', slug: 'university-town', sortOrder: 1 },
    { name: 'Hayatabad', slug: 'hayatabad', sortOrder: 2 },
    { name: 'Saddar', slug: 'saddar', sortOrder: 3 },
    { name: 'Gulbahar', slug: 'gulbahar', sortOrder: 4 },
    { name: 'City Center', slug: 'city-center-peshawar', sortOrder: 5 },
    { name: 'Ring Road', slug: 'ring-road', sortOrder: 6 },
    { name: 'Board Bazaar', slug: 'board-bazaar', sortOrder: 7 },
  ],
  mardan: [
    { name: 'City Center', slug: 'city-center-mardan', sortOrder: 1 },
    { name: 'Sheikh Maltoon', slug: 'sheikh-maltoon', sortOrder: 2 },
    { name: 'Cantt', slug: 'cantt-mardan', sortOrder: 3 },
    { name: 'Katlang', slug: 'katlang', sortOrder: 4 },
    { name: 'Takht Bhai', slug: 'takht-bhai', sortOrder: 5 },
  ],
  charsadda: [
    { name: 'Charsadda City', slug: 'charsadda-city', sortOrder: 1 },
    { name: 'Tangi', slug: 'tangi', sortOrder: 2 },
    { name: 'Shabqadar', slug: 'shabqadar', sortOrder: 3 },
  ],
  nowshera: [
    { name: 'Nowshera Cantt', slug: 'nowshera-cantt', sortOrder: 1 },
    { name: 'Pabbi', slug: 'pabbi', sortOrder: 2 },
    { name: 'Risalpur', slug: 'risalpur', sortOrder: 3 },
  ],
  swabi: [
    { name: 'Swabi City', slug: 'swabi-city', sortOrder: 1 },
    { name: 'Topi', slug: 'topi', sortOrder: 2 },
    { name: 'Chota Lahor', slug: 'chota-lahor', sortOrder: 3 },
  ],
  buner: [
    { name: 'Daggar', slug: 'daggar', sortOrder: 1 },
    { name: 'Totalai', slug: 'totalai', sortOrder: 2 },
  ],
  shangla: [
    { name: 'Alpuri', slug: 'alpuri', sortOrder: 1 },
    { name: 'Besham', slug: 'besham', sortOrder: 2 },
  ],
  abbottabad: [
    { name: 'Mandian', slug: 'mandian', sortOrder: 1 },
    { name: 'Supply', slug: 'supply', sortOrder: 2 },
    { name: 'Cantt', slug: 'cantt-abbottabad', sortOrder: 3 },
    { name: 'Havelian', slug: 'havelian', sortOrder: 4 },
  ],
  haripur: [
    { name: 'Haripur City', slug: 'haripur-city', sortOrder: 1 },
    { name: 'Khanpur', slug: 'khanpur', sortOrder: 2 },
    { name: 'Sector 2', slug: 'sector-2-haripur', sortOrder: 3 },
  ],
  mansehra: [
    { name: 'Mansehra City', slug: 'mansehra-city', sortOrder: 1 },
    { name: 'Shinkiari', slug: 'shinkiari', sortOrder: 2 },
    { name: 'Balakot', slug: 'balakot', sortOrder: 3 },
  ],
  battagram: [
    { name: 'Battagram City', slug: 'battagram-city', sortOrder: 1 },
    { name: 'Kuza Banda', slug: 'kuza-banda', sortOrder: 2 },
  ],
  torghar: [{ name: 'Judba', slug: 'judba', sortOrder: 1 }],
  allai: [
    { name: 'Allai City', slug: 'allai-city', sortOrder: 1 },
    { name: 'Banna', slug: 'banna', sortOrder: 2 },
  ],
  'lower-kohistan': [{ name: 'Pattan', slug: 'pattan', sortOrder: 1 }],
  'upper-kohistan': [{ name: 'Dasu', slug: 'dasu', sortOrder: 1 }],
  'kolai-palas': [{ name: 'Palas', slug: 'palas', sortOrder: 1 }],
  'lower-chitral': [
    { name: 'Chitral Town', slug: 'chitral-town', sortOrder: 1 },
    { name: 'Drosh', slug: 'drosh', sortOrder: 2 },
    { name: 'Ayun', slug: 'ayun', sortOrder: 3 },
  ],
  'upper-chitral': [
    { name: 'Booni', slug: 'booni', sortOrder: 1 },
    { name: 'Mastuj', slug: 'mastuj', sortOrder: 2 },
  ],
  kohat: [
    { name: 'Kohat City', slug: 'kohat-city', sortOrder: 1 },
    { name: 'Cantt', slug: 'cantt-kohat', sortOrder: 2 },
    { name: 'Lachi', slug: 'lachi', sortOrder: 3 },
  ],
  hangu: [
    { name: 'Hangu City', slug: 'hangu-city', sortOrder: 1 },
    { name: 'Thall', slug: 'thall', sortOrder: 2 },
  ],
  karak: [
    { name: 'Karak City', slug: 'karak-city', sortOrder: 1 },
    { name: 'Takht-e-Nasrati', slug: 'takht-e-nasrati', sortOrder: 2 },
  ],
  bannu: [
    { name: 'Bannu City', slug: 'bannu-city', sortOrder: 1 },
    { name: 'Cantt', slug: 'cantt-bannu', sortOrder: 2 },
  ],
  'lakki-marwat': [
    { name: 'Lakki Marwat City', slug: 'lakki-marwat-city', sortOrder: 1 },
    { name: 'Naurang', slug: 'naurang', sortOrder: 2 },
  ],
  'dera-ismail-khan': [
    { name: 'D.I. Khan City', slug: 'di-khan-city', sortOrder: 1 },
    { name: 'Cantt', slug: 'cantt-di-khan', sortOrder: 2 },
    { name: 'Paroa', slug: 'paroa', sortOrder: 3 },
  ],
  tank: [{ name: 'Tank City', slug: 'tank-city', sortOrder: 1 }],
  paharpur: [{ name: 'Paharpur Town', slug: 'paharpur-town', sortOrder: 1 }],
  khyber: [
    { name: 'Landi Kotal', slug: 'landi-kotal', sortOrder: 1 },
    { name: 'Jamrud', slug: 'jamrud', sortOrder: 2 },
    { name: 'Bara', slug: 'bara', sortOrder: 3 },
  ],
  mohmand: [
    { name: 'Ghalanai', slug: 'ghalanai', sortOrder: 1 },
    { name: 'Ekka Ghund', slug: 'ekka-ghund', sortOrder: 2 },
  ],
  kurram: [
    { name: 'Parachinar', slug: 'parachinar', sortOrder: 1 },
    { name: 'Sadda', slug: 'sadda', sortOrder: 2 },
  ],
  orakzai: [
    { name: 'Kalaya', slug: 'kalaya', sortOrder: 1 },
    { name: 'Ghiljo', slug: 'ghiljo', sortOrder: 2 },
  ],
  'north-waziristan': [
    { name: 'Miran Shah', slug: 'miran-shah', sortOrder: 1 },
    { name: 'Mir Ali', slug: 'mir-ali', sortOrder: 2 },
  ],
  'south-waziristan': [{ name: 'Wana', slug: 'wana', sortOrder: 1 }],
  'lower-south-waziristan': [
    { name: 'Wana Center', slug: 'wana-center', sortOrder: 1 },
    { name: 'Shakai', slug: 'shakai', sortOrder: 2 },
  ],
  'upper-south-waziristan': [
    { name: 'Spinkai', slug: 'spinkai', sortOrder: 1 },
    { name: 'Ladha', slug: 'ladha', sortOrder: 2 },
  ],
};

export async function ensureDefaultAreas(
  prisma: PrismaService,
  cityId?: string,
): Promise<void> {
  const cities = await prisma.city.findMany({
    where: cityId ? { id: cityId } : {},
    select: { id: true, slug: true },
  });

  for (const city of cities) {
    const defaults = DEFAULT_AREAS_BY_CITY_SLUG[city.slug];
    if (!defaults || defaults.length === 0) continue;

    const existing = await prisma.area.findMany({
      where: { cityId: city.id },
      select: { slug: true, name: true },
    });

    const existingSlugs = new Set(existing.map((a) => a.slug));
    const missing = defaults.filter((d) => !existingSlugs.has(d.slug));

    if (missing.length > 0) {
      await prisma.area.createMany({
        data: missing.map((a) => ({
          cityId: city.id,
          name: a.name,
          slug: a.slug,
          sortOrder: a.sortOrder,
          isActive: true,
          isVerified: true,
          isCustomCreated: false,
        })),
        skipDuplicates: true,
      });
    }
  }
}
