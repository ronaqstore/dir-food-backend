import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/services/audit.service.js';
import { slugify } from '../../common/utils/phone.js';
import type { UpdateSlugDto } from '../dto/update-slug.dto.js';

export async function handleChangeSlug(
  prisma: PrismaService,
  auditService: AuditService,
  id: string,
  dto: UpdateSlugDto,
  adminUserId: string,
  ipAddress?: string,
) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
  });
  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  const newSlug = slugify(dto.slug);
  if (!newSlug || newSlug.length < 3) {
    throw new BadRequestException('Slug must be at least 3 characters');
  }

  const reserved = ['admin', 'api', 'dashboard', 'login', 'r', 'www'];
  if (reserved.includes(newSlug)) {
    throw new BadRequestException('This slug is reserved and cannot be used');
  }

  const existing = await prisma.restaurant.findUnique({
    where: { slug: newSlug },
  });
  if (existing && existing.id !== id) {
    throw new ConflictException('Slug is already in use by another restaurant');
  }

  const oldSlug = restaurant.slug;
  const updated = await prisma.restaurant.update({
    where: { id },
    data: { slug: newSlug },
  });

  await auditService.log({
    actorUserId: adminUserId,
    restaurantId: id,
    action: 'RESTAURANT_SLUG_CHANGED',
    entityType: 'restaurant',
    entityId: id,
    details: {
      oldSlug,
      newSlug,
    },
    ipAddress,
  });

  return {
    id: updated.id,
    slug: updated.slug,
    oldSlug,
  };
}

