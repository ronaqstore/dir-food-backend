import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { slugify } from '../../common/utils/phone.js';
import { CreateAreaDto } from '../dto/create-area.dto.js';
import { UpdateAreaDto } from '../dto/update-area.dto.js';
import { ApproveAreaDto } from '../dto/approve-area.dto.js';

@Injectable()
export class PlatformAdminAreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all areas (active and inactive) with restaurant count.
   */
  async listAreas(cityId?: string) {
    const areas = await this.prisma.area.findMany({
      where: cityId ? { cityId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        city: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            restaurantAreas: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    return areas.map((area) => ({
      id: area.id,
      cityId: area.cityId,
      cityName: area.city.name,
      citySlug: area.city.slug,
      name: area.name,
      slug: area.slug,
      sortOrder: area.sortOrder,
      isActive: area.isActive,
      isVerified: area.isVerified,
      isCustomCreated: area.isCustomCreated,
      activeRestaurantsCount: area._count.restaurantAreas,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
    }));
  }

  /**
   * Create a new delivery area.
   */
  async createArea(
    dto: CreateAreaDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Area name cannot be empty');
    }

    const slug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(name);
    if (!slug) {
      throw new BadRequestException('Invalid area slug');
    }

    let cityId = dto.cityId;
    if (!cityId) {
      const defaultCity = await this.prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      if (!defaultCity) {
        throw new BadRequestException('No active city found');
      }
      cityId = defaultCity.id;
    } else {
      const cityExists = await this.prisma.city.findUnique({
        where: { id: cityId },
      });
      if (!cityExists) {
        throw new NotFoundException(`City with ID "${cityId}" not found`);
      }
    }

    const existingName = await this.prisma.area.findUnique({
      where: { cityId_name: { cityId, name } },
    });
    if (existingName) {
      throw new ConflictException(`Area with name "${name}" already exists in this city`);
    }

    const existingSlug = await this.prisma.area.findUnique({
      where: { cityId_slug: { cityId, slug } },
    });
    if (existingSlug) {
      throw new ConflictException(`Area with slug "${slug}" already exists in this city`);
    }

    const area = await this.prisma.area.create({
      data: {
        cityId,
        name,
        slug,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_CREATED',
      entityType: 'area',
      entityId: area.id,
      details: {
        cityId: area.cityId,
        name: area.name,
        slug: area.slug,
        sortOrder: area.sortOrder,
        isActive: area.isActive,
      },
      ipAddress,
    });

    return area;
  }

  /**
   * Update an existing delivery area.
   */
  async updateArea(
    id: string,
    dto: UpdateAreaDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) {
      throw new NotFoundException('Area not found');
    }

    const data: any = {};
    const targetCityId = dto.cityId || area.cityId;

    if (dto.cityId && dto.cityId !== area.cityId) {
      const cityExists = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
      });
      if (!cityExists) {
        throw new NotFoundException(`City with ID "${dto.cityId}" not found`);
      }
      data.cityId = dto.cityId;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Area name cannot be empty');
      if (name !== area.name || targetCityId !== area.cityId) {
        const existing = await this.prisma.area.findUnique({
          where: { cityId_name: { cityId: targetCityId, name } },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Area with name "${name}" already exists in this city`);
        }
        data.name = name;
      }
    }

    if (dto.slug !== undefined) {
      const slug = slugify(dto.slug.trim());
      if (!slug) throw new BadRequestException('Invalid area slug');
      if (slug !== area.slug || targetCityId !== area.cityId) {
        const existing = await this.prisma.area.findUnique({
          where: { cityId_slug: { cityId: targetCityId, slug } },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Area with slug "${slug}" already exists in this city`);
        }
        data.slug = slug;
      }
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await this.prisma.area.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_UPDATED',
      entityType: 'area',
      entityId: id,
      details: {
        old: { name: area.name, slug: area.slug, isActive: area.isActive },
        updated: data,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Delete a delivery area if it has no customer orders.
   */
  async deleteArea(id: string, adminUserId: string, ipAddress?: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            restaurantAreas: true,
          },
        },
      },
    });

    if (!area) {
      throw new NotFoundException('Area not found');
    }

    const orderCount = await this.prisma.orderIntent.count({
      where: {
        deliveryAreaId: id,
      },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete area "${area.name}" because it is associated with ${orderCount} customer order(s). You can deactivate it instead.`
      );
    }

    await this.prisma.$transaction([
      this.prisma.restaurantDeliveryArea.deleteMany({
        where: { areaId: id },
      }),
      this.prisma.area.delete({
        where: { id },
      }),
    ]);

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_DELETED',
      entityType: 'area',
      entityId: id,
      details: {
        name: area.name,
        slug: area.slug,
        cityId: area.cityId,
      },
      ipAddress,
    });

    return { success: true, message: `Area "${area.name}" deleted successfully` };
  }

  /**
   * Approve an unverified area and publish it. Optionally clean up its display name.
   */
  async approveArea(
    id: string,
    dto: ApproveAreaDto | undefined,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const area = await this.prisma.area.findUnique({ where: { id } });
    if (!area) {
      throw new NotFoundException('Area not found');
    }

    const data: any = { isVerified: true, isActive: true };

    if (dto?.name && dto.name.trim() !== area.name) {
      const cleanName = dto.name.trim();
      const slug = slugify(cleanName);
      if (!slug) throw new BadRequestException('Invalid area name');

      const existingSlug = await this.prisma.area.findUnique({
        where: { cityId_slug: { cityId: area.cityId, slug } },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`An area with name "${cleanName}" already exists in this city`);
      }

      data.name = cleanName;
      data.slug = slug;
    }

    const updated = await this.prisma.area.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_APPROVED',
      entityType: 'area',
      entityId: id,
      details: {
        name: updated.name,
        slug: updated.slug,
        cityId: updated.cityId,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Merge a duplicate/misspelled area into a canonical target area.
   * Re-links all restaurants, stores source spelling into AreaAlias, and deletes source area.
   */
  async mergeArea(
    sourceAreaId: string,
    targetAreaId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    if (sourceAreaId === targetAreaId) {
      throw new BadRequestException('Source area and target area cannot be the same');
    }

    const [sourceArea, targetArea] = await Promise.all([
      this.prisma.area.findUnique({
        where: { id: sourceAreaId },
        include: { restaurantAreas: true },
      }),
      this.prisma.area.findUnique({
        where: { id: targetAreaId },
      }),
    ]);

    if (!sourceArea) throw new NotFoundException('Source area not found');
    if (!targetArea) throw new NotFoundException('Target area not found');

    if (sourceArea.cityId !== targetArea.cityId) {
      throw new BadRequestException('Cannot merge areas belonging to different districts/cities');
    }

    const cleanAlias = sourceArea.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    await this.prisma.$transaction(async (tx) => {
      // 1. Move restaurant delivery area configurations to target area
      for (const rda of sourceArea.restaurantAreas) {
        await tx.restaurantDeliveryArea.upsert({
          where: {
            restaurantId_areaId: {
              restaurantId: rda.restaurantId,
              areaId: targetArea.id,
            },
          },
          create: {
            restaurantId: rda.restaurantId,
            areaId: targetArea.id,
            deliveryFee: rda.deliveryFee,
            minOrderAmount: rda.minOrderAmount,
            isActive: rda.isActive,
          },
          update: {
            isActive: rda.isActive,
          },
        });
      }

      // 2. Delete restaurant delivery areas for source
      await tx.restaurantDeliveryArea.deleteMany({
        where: { areaId: sourceArea.id },
      });

      // 3. Update any order intents to target area if they exist
      await tx.orderIntent.updateMany({
        where: { deliveryAreaId: sourceArea.id },
        data: { deliveryAreaId: targetArea.id },
      });

      // 4. Save source name as alias permanently
      if (cleanAlias) {
        await tx.areaAlias.upsert({
          where: {
            cityId_normalized: {
              cityId: targetArea.cityId,
              normalized: cleanAlias,
            },
          },
          create: {
            areaId: targetArea.id,
            cityId: targetArea.cityId,
            alias: sourceArea.name,
            normalized: cleanAlias,
          },
          update: {
            areaId: targetArea.id,
            alias: sourceArea.name,
          },
        });
      }

      // 5. Delete source area
      await tx.area.delete({
        where: { id: sourceArea.id },
      });
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_MERGED',
      entityType: 'area',
      entityId: targetArea.id,
      details: {
        mergedAreaId: sourceArea.id,
        mergedAreaName: sourceArea.name,
        targetAreaId: targetArea.id,
        targetAreaName: targetArea.name,
        cityId: targetArea.cityId,
      },
      ipAddress,
    });

    return {
      success: true,
      message: `Successfully merged "${sourceArea.name}" into "${targetArea.name}".`,
    };
  }
}

