import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCategoryDto } from '../dto/create-category.dto.js';
import type { UpdateCategoryDto } from '../dto/update-category.dto.js';

@Injectable()
export class MenuCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            items: { where: { isActive: true } },
          },
        },
      },
    });
  }

  async createCategory(restaurantId: string, dto: CreateCategoryDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const lastCategory = await this.prisma.menuCategory.findFirst({
      where: { restaurantId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nextSortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;

    return this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: dto.name.trim(),
        sortOrder: nextSortOrder,
      },
    });
  }

  async updateCategory(
    restaurantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const existing = await this.prisma.menuCategory.findUnique({
      where: {
        id_restaurantId: {
          id,
          restaurantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Menu category not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.menuCategory.update({
      where: {
        id_restaurantId: {
          id,
          restaurantId,
        },
      },
      data,
    });
  }

  async reorderCategories(restaurantId: string, ids: string[]) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Verify all IDs belong to this restaurant
    const count = await this.prisma.menuCategory.count({
      where: {
        id: { in: ids },
        restaurantId,
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(
        'One or more category IDs do not belong to this restaurant',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.menuCategory.update({
          where: {
            id_restaurantId: {
              id,
              restaurantId,
            },
          },
          data: {
            sortOrder: index,
          },
        }),
      ),
    );

    return this.getCategories(restaurantId);
  }
}
