import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ensureDefaultAreas } from '../../common/utils/area-defaults.js';

export interface PublicAreaItem {
  id: string;
  cityId: string;
  name: string;
  slug: string;
}

@Injectable()
export class PublicAreasService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await ensureDefaultAreas(this.prisma);
  }

  async getAreas(cityId?: string): Promise<PublicAreaItem[]> {
    await ensureDefaultAreas(this.prisma, cityId);
    return this.prisma.area.findMany({
      where: {
        isActive: true,
        isVerified: true,
        ...(cityId ? { cityId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        cityId: true,
        name: true,
        slug: true,
      },
    });
  }
}
