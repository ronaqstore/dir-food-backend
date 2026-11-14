import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { ReplaceAddonsDto } from '../dto/replace-addons.dto.js';

export async function handleReplaceAddons(
  prisma: PrismaService,
  restaurantId: string,
  itemId: string,
  dto: ReplaceAddonsDto,
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

  const providedIds = dto.addons
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.menuItemAddon.updateMany({
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

    for (let index = 0; index < dto.addons.length; index++) {
      const a = dto.addons[index];
      if (a.id) {
        await tx.menuItemAddon.update({
          where: {
            id_restaurantId_menuItemId: {
              id: a.id,
              restaurantId,
              menuItemId: itemId,
            },
          },
          data: {
            name: a.name.trim(),
            price: BigInt(a.price),
            sortOrder: index,
            isActive: a.isActive ?? true,
          },
        });
      } else {
        await tx.menuItemAddon.create({
          data: {
            restaurantId,
            menuItemId: itemId,
            name: a.name.trim(),
            price: BigInt(a.price),
            sortOrder: index,
            isActive: a.isActive ?? true,
          },
        });
      }
    }
  });

  return prisma.menuItemAddon.findMany({
    where: {
      restaurantId,
      menuItemId: itemId,
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });
}
