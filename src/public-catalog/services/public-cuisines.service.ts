import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DEFAULT_MASTER_CUISINES,
  ensureDefaultCuisines,
} from '../../common/utils/cuisine-defaults.js';

export interface PublicCuisineItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
}

@Injectable()
export class PublicCuisinesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await ensureDefaultCuisines(this.prisma);
  }

  async getCuisines(): Promise<PublicCuisineItem[]> {
    const items = await this.prisma.cuisine.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        sortOrder: true,
      },
    });

    if (items.length > 0) {
      return items;
    }

    await ensureDefaultCuisines(this.prisma);
    const refreshed = await this.prisma.cuisine.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        sortOrder: true,
      },
    });

    if (refreshed.length > 0) {
      return refreshed;
    }

    return DEFAULT_MASTER_CUISINES.map((c) => ({
      id: `default-${c.slug}`,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      sortOrder: c.sortOrder,
    }));
  }
}
