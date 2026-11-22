import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { R2StorageService } from '../../uploads/services/r2-storage.service.js';
import { ImageProcessorService } from '../../uploads/services/image-processor.service.js';
import type { RawUploadFile } from '../../uploads/services/image-processor.service.js';
import type { CreateMenuItemDto } from '../dto/create-item.dto.js';
import type { UpdateMenuItemDto } from '../dto/update-item.dto.js';
import type { ReplaceVariantsDto } from '../dto/replace-variants.dto.js';
import type { ReplaceAddonsDto } from '../dto/replace-addons.dto.js';
import {
  handleUploadItemImage,
  handleDeleteItemImage,
} from '../helpers/menu-item-images.helper.js';
import {
  handleReplaceVariants,
  handleReorderItems,
} from '../helpers/menu-item-variants.helper.js';
import { handleReplaceAddons } from '../helpers/menu-item-addons.helper.js';

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  async getItems(
    restaurantId: string,
    categoryId?: string,
    page = 1,
    limit = 20,
    search?: string,
    isDeal?: boolean,
    isAvailable?: boolean,
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

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(500, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const baseWhere: Record<string, unknown> = { restaurantId };
    if (categoryId) {
      baseWhere.categoryId = categoryId;
    }
    if (typeof isDeal === 'boolean') {
      baseWhere.isDeal = isDeal;
    }
    if (search && search.trim()) {
      baseWhere.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const where: Record<string, unknown> = { ...baseWhere };
    if (typeof isAvailable === 'boolean') {
      where.isAvailable = isAvailable;
    }

    const orderDirection = sortOrder === 'desc' ? 'desc' : 'asc';
    let orderByClause: Record<string, 'asc' | 'desc'>[] = [
      { categoryId: 'asc' },
      { sortOrder: 'asc' },
    ];

    if (sortBy === 'name') {
      orderByClause = [{ name: orderDirection }];
    } else if (sortBy === 'price') {
      orderByClause = [{ basePrice: orderDirection }];
    } else if (sortBy === 'createdAt') {
      orderByClause = [{ createdAt: orderDirection }];
    } else if (sortBy === 'sortOrder') {
      orderByClause = [{ sortOrder: orderDirection }];
    }

    const [
      total,
      availableCount,
      soldOutCount,
      dishesCount,
      dealsCount,
      items,
    ] = await Promise.all([
      this.prisma.menuItem.count({ where }),
      this.prisma.menuItem.count({
        where: { ...baseWhere, isAvailable: true },
      }),
      this.prisma.menuItem.count({
        where: { ...baseWhere, isAvailable: false },
      }),
      this.prisma.menuItem.count({ where: { restaurantId, isDeal: false } }),
      this.prisma.menuItem.count({ where: { restaurantId, isDeal: true } }),
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: orderByClause,
        include: {
          category: { select: { id: true, name: true } },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          addons: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
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
        totalCount: availableCount + soldOutCount,
        availableCount,
        soldOutCount,
        dishesCount,
        dealsCount,
      },
    };
  }

  async createItem(restaurantId: string, dto: CreateMenuItemDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const hasBasePrice = dto.basePrice !== undefined && dto.basePrice !== null;
    const hasVariants = dto.variants && dto.variants.length > 0;

    if (!hasBasePrice && !hasVariants) {
      throw new BadRequestException(
        'Item must have either a basePrice or at least one variant',
      );
    }

    if (
      dto.originalPrice !== undefined &&
      dto.originalPrice !== null &&
      hasBasePrice &&
      dto.basePrice !== undefined &&
      dto.basePrice !== null &&
      dto.originalPrice <= dto.basePrice
    ) {
      throw new BadRequestException(
        'Original price must be greater than selling base price',
      );
    }

    let targetCategoryId = dto.categoryId;

    if (!targetCategoryId) {
      if (dto.isDeal) {
        let dealsCategory = await this.prisma.menuCategory.findFirst({
          where: {
            restaurantId,
            name: { in: ['Deals & Combos', 'Deals', 'اسپیشل ڈیلز'] },
          },
        });

        if (!dealsCategory) {
          const maxSort = await this.prisma.menuCategory.aggregate({
            where: { restaurantId },
            _max: { sortOrder: true },
          });
          const nextOrder = (maxSort._max.sortOrder ?? 0) + 1;

          dealsCategory = await this.prisma.menuCategory.create({
            data: {
              restaurantId,
              name: 'Deals',
              sortOrder: nextOrder,
              isActive: true,
            },
          });
        }
        targetCategoryId = dealsCategory.id;
      } else {
        throw new BadRequestException(
          'categoryId is required for regular menu items',
        );
      }
    } else {
      const category = await this.prisma.menuCategory.findUnique({
        where: {
          id_restaurantId: {
            id: targetCategoryId,
            restaurantId,
          },
        },
      });

      if (!category) {
        throw new NotFoundException(
          'Menu category not found for this restaurant',
        );
      }
    }

    const duplicate = await this.prisma.menuItem.findFirst({
      where: {
        restaurantId,
        categoryId: targetCategoryId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        isActive: true,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `A menu item or deal with the name "${dto.name.trim()}" already exists in this category`,
      );
    }

    const lastItem = await this.prisma.menuItem.findFirst({
      where: {
        restaurantId,
        categoryId: targetCategoryId,
      },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nextSortOrder = lastItem ? lastItem.sortOrder + 1 : 0;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const item = await tx.menuItem.create({
          data: {
            restaurantId,
            categoryId: targetCategoryId,
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            basePrice:
              hasBasePrice &&
              dto.basePrice !== undefined &&
              dto.basePrice !== null
                ? BigInt(dto.basePrice)
                : null,
            originalPrice:
              dto.originalPrice !== undefined && dto.originalPrice !== null
                ? BigInt(dto.originalPrice)
                : null,
            isDeal: dto.isDeal ?? false,
            sortOrder: nextSortOrder,
          },
        });

        if (hasVariants && dto.variants) {
          for (let index = 0; index < dto.variants.length; index++) {
            const v = dto.variants[index];
            await tx.menuItemVariant.create({
              data: {
                restaurantId,
                menuItemId: item.id,
                name: v.name.trim(),
                price: BigInt(v.price),
                sortOrder: index,
              },
            });
          }
        }

        if (dto.addons && dto.addons.length > 0) {
          for (let index = 0; index < dto.addons.length; index++) {
            const a = dto.addons[index];
            await tx.menuItemAddon.create({
              data: {
                restaurantId,
                menuItemId: item.id,
                name: a.name.trim(),
                price: BigInt(a.price),
                sortOrder: index,
              },
            });
          }
        }

        return tx.menuItem.findUnique({
          where: { id: item.id },
          include: {
            variants: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
            addons: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
            category: {
              select: { id: true, name: true },
            },
          },
        });
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A menu item or deal with this name already exists in this category`,
        );
      }
      throw err;
    }
  }

  async updateItem(restaurantId: string, id: string, dto: UpdateMenuItemDto) {
    const existing = await this.prisma.menuItem.findUnique({
      where: {
        id_restaurantId: {
          id,
          restaurantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.prisma.menuCategory.findUnique({
        where: {
          id_restaurantId: {
            id: dto.categoryId,
            restaurantId,
          },
        },
      });

      if (!category) {
        throw new NotFoundException(
          'Target menu category not found for this restaurant',
        );
      }
    }

    const finalBasePrice =
      dto.basePrice !== undefined
        ? dto.basePrice !== null
          ? BigInt(dto.basePrice)
          : null
        : existing.basePrice;

    if (dto.originalPrice !== undefined && dto.originalPrice !== null) {
      if (
        finalBasePrice !== null &&
        BigInt(dto.originalPrice) <= finalBasePrice
      ) {
        throw new BadRequestException(
          'Original price must be greater than selling base price',
        );
      }
    }

    const targetCategoryId = dto.categoryId ?? existing.categoryId;
    const targetName = dto.name !== undefined ? dto.name.trim() : existing.name;

    if (dto.name !== undefined || dto.categoryId !== undefined) {
      const duplicate = await this.prisma.menuItem.findFirst({
        where: {
          restaurantId,
          categoryId: targetCategoryId,
          name: { equals: targetName, mode: 'insensitive' },
          id: { not: id },
          isActive: true,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A menu item or deal with the name "${targetName}" already exists in this category`,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.basePrice !== undefined) {
      data.basePrice = dto.basePrice !== null ? BigInt(dto.basePrice) : null;
      if (dto.basePrice !== null) {
        await this.prisma.menuItemVariant.updateMany({
          where: {
            restaurantId,
            menuItemId: id,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }
    }
    if (dto.originalPrice !== undefined) {
      data.originalPrice =
        dto.originalPrice !== null ? BigInt(dto.originalPrice) : null;
    }
    if (dto.isDeal === true) {
      const activeVariantsCount = await this.prisma.menuItemVariant.count({
        where: {
          restaurantId,
          menuItemId: id,
          isActive: true,
        },
      });
      if (activeVariantsCount > 0) {
        throw new BadRequestException(
          'Cannot mark an item with active variants as a deal',
        );
      }
      data.isDeal = true;
    } else if (dto.isDeal !== undefined) {
      data.isDeal = dto.isDeal;
    }
    if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    try {
      return await this.prisma.menuItem.update({
        where: {
          id_restaurantId: {
            id,
            restaurantId,
          },
        },
        data,
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          addons: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `A menu item or deal with this name already exists in this category`,
        );
      }
      throw err;
    }
  }

  async reorderItems(restaurantId: string, categoryId: string, ids: string[]) {
    await handleReorderItems(this.prisma, restaurantId, categoryId, ids);
    return this.getItems(restaurantId, categoryId);
  }

  async replaceVariants(
    restaurantId: string,
    itemId: string,
    dto: ReplaceVariantsDto,
  ) {
    return handleReplaceVariants(this.prisma, restaurantId, itemId, dto);
  }

  async replaceAddons(
    restaurantId: string,
    itemId: string,
    dto: ReplaceAddonsDto,
  ) {
    return handleReplaceAddons(this.prisma, restaurantId, itemId, dto);
  }

  async uploadItemImage(
    restaurantId: string,
    itemId: string,
    file?: RawUploadFile,
  ) {
    return handleUploadItemImage(
      this.prisma,
      this.imageProcessor,
      this.r2Storage,
      restaurantId,
      itemId,
      file,
    );
  }

  async deleteItemImage(restaurantId: string, itemId: string) {
    return handleDeleteItemImage(
      this.prisma,
      this.r2Storage,
      restaurantId,
      itemId,
    );
  }
}
