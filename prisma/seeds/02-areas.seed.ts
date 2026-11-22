import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ensureDefaultAreas } from '../../src/common/utils/area-defaults.js';

export interface SeedAreasResult {
  totalCount: number;
}

export async function seedAreas(prisma: PrismaClient): Promise<SeedAreasResult> {
  const lowerDirCity = await prisma.city.findUnique({
    where: { slug: 'lower-dir' },
  });

  if (lowerDirCity) {
    await prisma.area.upsert({
      where: {
        cityId_slug: { cityId: lowerDirCity.id, slug: 'timergara' },
      },
      update: {
        name: 'Timergara',
        isActive: true,
        isVerified: true,
      },
      create: {
        cityId: lowerDirCity.id,
        name: 'Timergara',
        slug: 'timergara',
        sortOrder: 1,
        isActive: true,
        isVerified: true,
        isCustomCreated: false,
      },
    });
  }

  // Populate master areas across all cities from content/area.json / defaults
  await ensureDefaultAreas(prisma as any);

  const totalCount = await prisma.area.count();
  return { totalCount };
}
