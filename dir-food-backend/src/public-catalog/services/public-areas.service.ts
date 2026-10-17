import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface PublicAreaItem {
  id: string;
  name: string;
  slug: string;
}

@Injectable()
export class PublicAreasService {
  constructor(private readonly prisma: PrismaService) {}

  async getAreas(): Promise<PublicAreaItem[]> {
    return this.prisma.area.findMany({
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
      },
    });
  }
}

