import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DEFAULT_MASTER_CUISINES } from '../../src/common/utils/cuisine-defaults.js';

export interface SeedCuisinesResult {
  count: number;
}

export async function seedCuisines(prisma: PrismaClient): Promise<SeedCuisinesResult> {
  let seededCount = 0;

  for (const cuisine of DEFAULT_MASTER_CUISINES) {
    await prisma.cuisine.upsert({
      where: { slug: cuisine.slug },
      update: {
        name: cuisine.name,
        icon: cuisine.icon,
        sortOrder: cuisine.sortOrder,
        isActive: true,
      },
      create: {
        name: cuisine.name,
        slug: cuisine.slug,
        icon: cuisine.icon,
        sortOrder: cuisine.sortOrder,
        isActive: true,
      },
    });
    seededCount++;
  }

  return { count: seededCount };
}
