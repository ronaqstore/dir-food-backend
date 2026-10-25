import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PublicAreaItem {
  id: string;
  cityId: string;
  name: string;
  slug: string;
}

@Injectable()
export class PublicAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async getAreas(cityId?: string): Promise<PublicAreaItem[]> {
    return this.prisma.area.findMany({
      where: {
        isActive: true,
        isVerified: true,
        ...(cityId ? { cityId } : {}),
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        cityId: true,
        name: true,
        slug: true,
      },
    });
  }
}

