import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ensureDefaultCategories } from '../../common/utils/category-defaults.js';
import type { CreateCategoryDto } from '../dto/create-category.dto.js';
import type { UpdateCategoryDto } from '../dto/update-category.dto.js';

@Injectable()
export class MenuCategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {}

  async seedDefaultCategories(restaurantId: string): Promise<void> {
    await ensureDefaultCategories(this.prisma, restaurantId);
  }

  async getCategories(
    restaurantId: string,
    search?: string,
    isActive?: boolean,
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const isPaginated = page !== undefined || limit !== undefined;

    if (!isPaginated && !search && typeof isActive !== 'boolean' && !sortBy) {
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

    const where: Record<string, unknown> = { restaurantId };
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';
    let orderByClause: Record<string, 'asc' | 'desc'>[] = [
      { sortOrder: 'asc' },
    ];
    if (sortBy === 'name') {
      orderByClause = [{ name: orderDirection }];
    } else if (sortBy === 'createdAt') {
      orderByClause = [{ createdAt: orderDirection }];
    } else if (sortBy === 'sortOrder') {
      orderByClause = [{ sortOrder: orderDirection }];
    }

    const safePage =
      page !== undefined && Number.isFinite(page) && page > 0
        ? Math.floor(page)
        : 1;
    const safeLimit =
      limit !== undefined && Number.isFinite(limit) && limit > 0
        ? Math.min(200, Math.floor(limit))
        : 20;
    const skip = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      this.prisma.menuCategory.count({ where }),
      this.prisma.menuCategory.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: orderByClause,
        include: {
          _count: {
            select: {
              items: { where: { isActive: true } },
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
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
