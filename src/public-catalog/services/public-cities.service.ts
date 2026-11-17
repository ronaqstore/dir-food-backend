import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DEFAULT_CITIES,
  ensureDefaultCities,
} from '../../common/utils/city-defaults.js';

export interface PublicCityItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

@Injectable()
export class PublicCitiesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await ensureDefaultCities(this.prisma);
  }

  async getCities(): Promise<PublicCityItem[]> {
    await ensureDefaultCities(this.prisma);
    const cities = await this.prisma.city.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });

    if (cities.length === 0) {
      return DEFAULT_CITIES.map((c) => ({
        id: c.slug,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
      }));
    }

    return cities;
  }
}
