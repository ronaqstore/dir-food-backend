import { randomUUID } from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { RestaurantStatus } from '../../generated/prisma/enums.js';
import { normalizePhone } from '../../common/utils/phone.js';
import { R2StorageService } from '../../uploads/services/r2-storage.service.js';
import { ImageProcessorService } from '../../uploads/services/image-processor.service.js';
import type { UpdateRestaurantProfileDto } from '../dto/update-restaurant-profile.dto.js';
import type { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly r2Storage: R2StorageService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  async getMyRestaurant(restaurantId?: string | null) {
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant linked to this account');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        hours: true,
        deliveryAreas: {
          include: {
            area: true,
          },
        },
        _count: {
          select: {
            items: { where: { isActive: true } },
            categories: { where: { isActive: true } },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async updateProfile(
    restaurantId: string,
    dto: UpdateRestaurantProfileDto,
    userId?: string,
    ipAddress?: string,
  ) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!existing) {
      throw new NotFoundException('Restaurant not found');
    }

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.cuisines !== undefined) data.cuisines = dto.cuisines;
    if (dto.addressText !== undefined) data.addressText = dto.addressText.trim() || null;
    if (dto.contactPhone !== undefined) {
      data.contactPhone = dto.contactPhone ? normalizePhone(dto.contactPhone) : null;
    }
    if (dto.minOrderAmount !== undefined) {
      data.minOrderAmount = dto.minOrderAmount !== null ? BigInt(dto.minOrderAmount) : null;
    }

    let whatsappChanged = false;
    let oldWhatsapp = existing.whatsappNumber;
    let newWhatsapp = existing.whatsappNumber;

    if (dto.whatsappNumber !== undefined) {
      const normalizedWhatsapp = dto.whatsappNumber
        ? normalizePhone(dto.whatsappNumber)
        : null;
      if (normalizedWhatsapp !== existing.whatsappNumber) {
        whatsappChanged = true;
        oldWhatsapp = existing.whatsappNumber;
        newWhatsapp = normalizedWhatsapp;
        data.whatsappNumber = normalizedWhatsapp;
      }
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data,
    });

    if (whatsappChanged) {
      await this.auditService.log({
        actorUserId: userId ?? null,
        restaurantId,
        action: 'RESTAURANT_WHATSAPP_CHANGED',
        entityType: 'restaurant',
        entityId: restaurantId,
        details: {
          oldWhatsapp,
          newWhatsapp,
        },
        ipAddress,
      });
    }

    return updated;
  }

  async updateAvailability(restaurantId: string, dto: UpdateAvailabilityDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!existing) {
      throw new NotFoundException('Restaurant not found');
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        manualStatus: dto.manualStatus,
        unavailableNote: dto.unavailableNote?.trim() || null,
      },
    });

    return updated;
  }

  async uploadRestaurantImage(
    restaurantId: string,
    kind: 'logo' | 'cover',
    file?: { buffer?: Buffer; size?: number; mimetype?: string },
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, logoUrl: true, coverUrl: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const processed = await this.imageProcessor.process(file);
    const key = `restaurants/${restaurantId}/profile/${kind}-${randomUUID()}.${processed.ext}`;
    const url = await this.r2Storage.put(
      key,
      processed.buffer,
      processed.contentType,
    );

    const oldUrl = kind === 'logo' ? restaurant.logoUrl : restaurant.coverUrl;
    const field = kind === 'logo' ? 'logoUrl' : 'coverUrl';

    try {
      const updated = await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          [field]: url,
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

  async deleteRestaurantImage(
    restaurantId: string,
    kind: 'logo' | 'cover',
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, logoUrl: true, coverUrl: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const oldUrl = kind === 'logo' ? restaurant.logoUrl : restaurant.coverUrl;
    const field = kind === 'logo' ? 'logoUrl' : 'coverUrl';

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        [field]: null,
      },
    });

    if (oldUrl) {
      await this.r2Storage.deleteByUrl(oldUrl, restaurantId);
    }

    return updated;
  }

  async getPublishReadiness(restaurantId?: string | null) {
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant linked to this account');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        hours: true,
        _count: {
          select: {
            items: { where: { isActive: true } },
            deliveryAreas: { where: { isActive: true } },
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const missingPrerequisites: string[] = [];
    if (!restaurant.whatsappNumber) {
      missingPrerequisites.push('A valid WhatsApp contact number is required');
    }
    if (restaurant.hours.length === 0) {
      missingPrerequisites.push('Configured opening hours are required');
    }
    if (restaurant._count.items === 0) {
      missingPrerequisites.push('At least one active menu item is required');
    }
    if (restaurant._count.deliveryAreas === 0) {
      missingPrerequisites.push('At least one active delivery area is required');
    }

    return {
      isReadyToPublish: missingPrerequisites.length === 0,
      missingPrerequisites,
      checks: {
        whatsapp: Boolean(restaurant.whatsappNumber),
        hours: restaurant.hours.length > 0,
        items: restaurant._count.items > 0,
        deliveryAreas: restaurant._count.deliveryAreas > 0,
      },
    };
  }

  async publishRestaurant(
    restaurantId: string | null | undefined,
    userId?: string,
    ipAddress?: string,
  ) {
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant linked to this account');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        hours: true,
        items: { where: { isActive: true } },
        deliveryAreas: { where: { isActive: true } },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.status === RestaurantStatus.ACTIVE) {
      throw new ConflictException({
        code: 'ALREADY_ACTIVE',
        message: 'Restaurant is already active and published',
      });
    }

    if (
      restaurant.status === RestaurantStatus.SUSPENDED ||
      restaurant.status === RestaurantStatus.DEACTIVATED
    ) {
      throw new ForbiddenException(
        `Cannot publish restaurant with status ${restaurant.status}`,
      );
    }

    const missingPrerequisites: string[] = [];
    if (!restaurant.whatsappNumber) {
      missingPrerequisites.push('A valid WhatsApp contact number is required');
    }
    if (restaurant.hours.length === 0) {
      missingPrerequisites.push('Configured opening hours are required');
    }
    if (restaurant.items.length === 0) {
      missingPrerequisites.push('At least one active menu item is required');
    }
    if (restaurant.deliveryAreas.length === 0) {
      missingPrerequisites.push('At least one active delivery area is required');
    }

    if (missingPrerequisites.length > 0) {
      throw new UnprocessableEntityException({
        code: 'PUBLISH_PREREQUISITES_NOT_MET',
        message: 'Cannot publish restaurant: prerequisites not satisfied',
        details: missingPrerequisites,
      });
    }

    const now = new Date();
    const subscriptionEndsAt =
      restaurant.subscriptionEndsAt && restaurant.subscriptionEndsAt > now
        ? restaurant.subscriptionEndsAt
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const trialStartedAt = restaurant.trialStartedAt ?? now;

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: RestaurantStatus.ACTIVE,
        statusChangedAt: now,
        trialStartedAt,
        subscriptionEndsAt,
      },
    });

    await this.auditService.log({
      actorUserId: userId ?? null,
      restaurantId: restaurant.id,
      action: 'RESTAURANT_SELF_PUBLISHED',
      entityType: 'restaurant',
      entityId: restaurant.id,
      details: {
        oldStatus: restaurant.status,
        newStatus: RestaurantStatus.ACTIVE,
        trialStartedAt,
        subscriptionEndsAt,
      },
      ipAddress,
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      status: updated.status,
      trialStartedAt: updated.trialStartedAt,
      subscriptionEndsAt: updated.subscriptionEndsAt,
    };
  }
}

