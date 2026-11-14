import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ReplaceVariantsDto } from '../dto/replace-variants.dto.js';

export async function handleReplaceVariants(
  prisma: PrismaService,
  restaurantId: string,
  itemId: string,
  dto: ReplaceVariantsDto,
) {
  const item = await prisma.menuItem.findUnique({
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

  await prisma.$transaction(async (tx) => {
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

    for (let i = 0; i < dto.variants.length; i++) {
      const v = dto.variants[i];
      if (v.id) {
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

  return prisma.menuItemVariant.findMany({
    where: {
      restaurantId,
      menuItemId: itemId,
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
}
