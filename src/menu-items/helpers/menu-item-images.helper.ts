import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ImageProcessorService,
  RawUploadFile,
} from '../../uploads/services/image-processor.service.js';
import type { R2StorageService } from '../../uploads/services/r2-storage.service.js';

export async function handleUploadItemImage(
  prisma: PrismaService,
  imageProcessor: ImageProcessorService,
  r2Storage: R2StorageService,
  restaurantId: string,
  itemId: string,
  file?: RawUploadFile,
) {
  const item = await prisma.menuItem.findUnique({
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

  const processed = await imageProcessor.process(file);
  const key = `restaurants/${restaurantId}/menu-items/${itemId}/${randomUUID()}.${processed.ext}`;
  const url = await r2Storage.put(key, processed.buffer, processed.contentType);

  const oldUrl = item.imageUrl;

  try {
    const updated = await prisma.menuItem.update({
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
      await r2Storage.deleteByUrl(oldUrl, restaurantId);
    }

    return updated;
  } catch (error) {
    await r2Storage.deleteByUrl(url, restaurantId);
    throw error;
  }
}

export async function handleDeleteItemImage(
  prisma: PrismaService,
  r2Storage: R2StorageService,
  restaurantId: string,
  itemId: string,
) {
  const item = await prisma.menuItem.findUnique({
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

  const updated = await prisma.menuItem.update({
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
    await r2Storage.deleteByUrl(oldUrl, restaurantId);
  }

  return updated;
}
