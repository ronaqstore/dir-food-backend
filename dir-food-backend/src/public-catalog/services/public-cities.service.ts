import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PublicCityItem {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

@Injectable()
export class PublicCitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCities(): Promise<PublicCityItem[]> {
    return this.prisma.city.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
      },
    });
  }
}

