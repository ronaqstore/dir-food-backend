import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DEFAULT_CITIES } from '../../src/common/utils/city-defaults.js';

export interface SeedCitiesResult {
  count: number;
}

export async function seedCities(prisma: PrismaClient): Promise<SeedCitiesResult> {
  let seededCount = 0;

  for (const city of DEFAULT_CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: {
        name: city.name,
        sortOrder: city.sortOrder,
        isActive: true,
      },
      create: {
        name: city.name,
        slug: city.slug,
        sortOrder: city.sortOrder,
        isActive: true,
      },
    });
    seededCount++;
  }

  return { count: seededCount };
}
