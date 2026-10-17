import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { normalizePhone } from '../../common/utils/phone.js';
import type { UpdateRestaurantProfileDto } from '../dto/update-restaurant-profile.dto.js';
import type { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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
}

