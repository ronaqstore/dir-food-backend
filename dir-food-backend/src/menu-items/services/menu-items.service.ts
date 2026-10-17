import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { R2StorageService } from '../../uploads/services/r2-storage.service.js';
import { ImageProcessorService } from '../../uploads/services/image-processor.service.js';
import type { CreateMenuItemDto } from '../dto/create-item.dto.js';
import type { UpdateMenuItemDto } from '../dto/update-item.dto.js';
import type { ReplaceVariantsDto } from '../dto/replace-variants.dto.js';

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
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where: Record<string, unknown> = { restaurantId };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [total, items] = await Promise.all([
      this.prisma.menuItem.count({ where }),
      this.prisma.menuItem.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
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

    const hasBasePrice =
      dto.basePrice !== undefined && dto.basePrice !== null;
    const hasVariants = dto.variants && dto.variants.length > 0;

    if (!hasBasePrice && !hasVariants) {
      throw new BadRequestException(
        'Item must have either a basePrice or at least one variant',
      );
    }

    // Verify category belongs to this restaurant
    const category = await this.prisma.menuCategory.findUnique({
      where: {
        id_restaurantId: {
          id: dto.categoryId,
          restaurantId,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Menu category not found for this restaurant');
    }

    const lastItem = await this.prisma.menuItem.findFirst({
      where: {
        restaurantId,
        categoryId: dto.categoryId,
      },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const nextSortOrder = lastItem ? lastItem.sortOrder + 1 : 0;

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: {
          restaurantId,
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          basePrice: hasBasePrice ? BigInt(dto.basePrice!) : null,
          sortOrder: nextSortOrder,
        },
      });

      if (hasVariants) {
        await tx.menuItemVariant.createMany({
          data: dto.variants!.map((v, index) => ({
            restaurantId,
            menuItemId: item.id,
            name: v.name.trim(),
            price: BigInt(v.price),
            sortOrder: index,
          })),
        });
      }

      return tx.menuItem.findUnique({
        where: { id: item.id },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
          category: {
            select: { id: true, name: true },
          },
        },
      });
    });
  }

  async updateItem(
    restaurantId: string,
    id: string,
    dto: UpdateMenuItemDto,
  ) {
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
        throw new NotFoundException('Target menu category not found for this restaurant');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.basePrice !== undefined) {
      data.basePrice = dto.basePrice !== null ? BigInt(dto.basePrice) : null;
    }
    if (dto.isAvailable !== undefined) data.isAvailable = dto.isAvailable;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.menuItem.update({
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
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async reorderItems(
    restaurantId: string,
    categoryId: string,
    ids: string[],
  ) {
    const category = await this.prisma.menuCategory.findUnique({
      where: {
        id_restaurantId: {
          id: categoryId,
          restaurantId,
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Menu category not found for this restaurant');
    }

    const count = await this.prisma.menuItem.count({
      where: {
        id: { in: ids },
        restaurantId,
        categoryId,
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(
        'One or more item IDs do not belong to this restaurant and category',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.menuItem.update({
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

    return this.getItems(restaurantId, categoryId);
  }

  async replaceVariants(
    restaurantId: string,
    itemId: string,
    dto: ReplaceVariantsDto,
  ) {
    const item = await this.prisma.menuItem.findUnique({
      where: {
        id_restaurantId: {
          id: itemId,
          restaurantId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }

    const providedIds = dto.variants
      .map((v) => v.id)
      .filter((id): id is string => Boolean(id));

    await this.prisma.$transaction(async (tx) => {
      // 1. Deactivate existing variants not in the submitted list
      await tx.menuItemVariant.updateMany({
        where: {
          restaurantId,
          menuItemId: itemId,
          id: { notIn: providedIds },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // 2. Create or update each submitted variant
      for (let i = 0; i < dto.variants.length; i++) {
        const v = dto.variants[i];
        if (v.id) {
          // Update existing variant (must belong to this restaurant and item)
          await tx.menuItemVariant.update({
            where: {
              id_restaurantId_menuItemId: {
                id: v.id,
                restaurantId,
                menuItemId: itemId,
              },
            },
            data: {
              name: v.name.trim(),
              price: BigInt(v.price),
              isActive: v.isActive ?? true,
              sortOrder: i,
            },
          });
        } else {
          // Create new variant
          await tx.menuItemVariant.create({
            data: {
              restaurantId,
              menuItemId: itemId,
              name: v.name.trim(),
              price: BigInt(v.price),
              isActive: v.isActive ?? true,
              sortOrder: i,
            },
          });
        }
      }
    });

    return this.prisma.menuItemVariant.findMany({
      where: {
        restaurantId,
        menuItemId: itemId,
        isActive: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async uploadItemImage(
    restaurantId: string,
    itemId: string,
    file?: { buffer?: Buffer; size?: number; mimetype?: string },
  ) {
    const item = await this.prisma.menuItem.findUnique({
      where: {
        id_restaurantId: {
          id: itemId,
          restaurantId,
        },
      },
      select: { id: true, imageUrl: true },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }

    const processed = await this.imageProcessor.process(file);
    const key = `restaurants/${restaurantId}/menu-items/${itemId}/${randomUUID()}.${processed.ext}`;
    const url = await this.r2Storage.put(
      key,
      processed.buffer,
      processed.contentType,
    );

    const oldUrl = item.imageUrl;

    try {
      const updated = await this.prisma.menuItem.update({
        where: {
          id_restaurantId: {
            id: itemId,
            restaurantId,
          },
        },
        data: {
          imageUrl: url,
        },
      });

      if (oldUrl) {
        await this.r2Storage.deleteByUrl(oldUrl, restaurantId);
      }

      return updated;
    } catch (error) {
      await this.r2Storage.deleteByUrl(url, restaurantId);
      throw error;
    }
  }

  async deleteItemImage(restaurantId: string, itemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: {
        id_restaurantId: {
          id: itemId,
          restaurantId,
        },
      },
      select: { id: true, imageUrl: true },
    });

    if (!item) {
      throw new NotFoundException('Menu item not found for this restaurant');
    }

    const oldUrl = item.imageUrl;

    const updated = await this.prisma.menuItem.update({
      where: {
        id_restaurantId: {
          id: itemId,
          restaurantId,
        },
      },
      data: {
        imageUrl: null,
      },
    });

    if (oldUrl) {
      await this.r2Storage.deleteByUrl(oldUrl, restaurantId);
    }

    return updated;
  }
}
