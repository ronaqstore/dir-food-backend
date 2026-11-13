import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { slugify } from '../../common/utils/phone.js';
import { CreateAreaDto } from '../dto/create-area.dto.js';
import { UpdateAreaDto } from '../dto/update-area.dto.js';
import { ApproveAreaDto } from '../dto/approve-area.dto.js';
import { QueryAreasDto } from '../dto/query-areas.dto.js';
import { handleListAreas } from '../helpers/platform-admin-areas-list.helper.js';

@Injectable()
export class PlatformAdminAreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listAreas(query?: QueryAreasDto | string) {
    return handleListAreas(this.prisma, query);
  }

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
      throw new ConflictException(
        `Area with name "${name}" already exists in this city`,
      );
    }

    const existingSlug = await this.prisma.area.findUnique({
      where: { cityId_slug: { cityId, slug } },
    });
    if (existingSlug) {
      throw new ConflictException(
        `Area with slug "${slug}" already exists in this city`,
      );
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

    const data: Prisma.AreaUpdateInput = {};
    const targetCityId = dto.cityId || area.cityId;

    if (dto.cityId && dto.cityId !== area.cityId) {
      const cityExists = await this.prisma.city.findUnique({
        where: { id: dto.cityId },
      });
      if (!cityExists) {
        throw new NotFoundException(`City with ID "${dto.cityId}" not found`);
      }
      data.city = { connect: { id: dto.cityId } };
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Area name cannot be empty');
      }
      if (name !== area.name || (dto.cityId && dto.cityId !== area.cityId)) {
        const existing = await this.prisma.area.findUnique({
          where: { cityId_name: { cityId: targetCityId, name } },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Area with name "${name}" already exists in this city`,
          );
        }
        data.name = name;
      }
    }

    if (dto.slug !== undefined) {
      const slug = slugify(dto.slug.trim());
      if (!slug) {
        throw new BadRequestException('Invalid area slug');
      }
      if (slug !== area.slug || (dto.cityId && dto.cityId !== area.cityId)) {
        const existing = await this.prisma.area.findUnique({
          where: { cityId_slug: { cityId: targetCityId, slug } },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Area with slug "${slug}" already exists in this city`,
          );
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
        updated: data as Record<string, unknown>,
      },
      ipAddress,
    });

    return updated;
  }

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
        `Cannot delete area "${area.name}" because it is associated with ${orderCount} customer order(s). You can deactivate it instead.`,
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

    return {
      success: true,
      message: `Area "${area.name}" deleted successfully`,
    };
  }

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

    const data: Prisma.AreaUpdateInput = { isVerified: true, isActive: true };

    if (dto?.name && dto.name.trim() !== area.name) {
      const cleanName = dto.name.trim();
      const slug = slugify(cleanName);
      if (!slug) throw new BadRequestException('Invalid area name');

      const existingSlug = await this.prisma.area.findUnique({
        where: { cityId_slug: { cityId: area.cityId, slug } },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          `An area with name "${cleanName}" already exists in this city`,
        );
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

  async mergeArea(
    sourceAreaId: string,
    targetAreaId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    if (sourceAreaId === targetAreaId) {
      throw new BadRequestException(
        'Source area and target area cannot be the same',
      );
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

    if (!sourceArea) {
      throw new NotFoundException(
        `Source area with ID "${sourceAreaId}" not found`,
      );
    }
    if (!targetArea) {
      throw new NotFoundException(
        `Target area with ID "${targetAreaId}" not found`,
      );
    }

    if (sourceArea.cityId !== targetArea.cityId) {
      throw new BadRequestException(
        'Cannot merge areas belonging to different districts/cities',
      );
    }

    const cleanAlias = sourceArea.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    await this.prisma.$transaction(async (tx) => {
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

      await tx.restaurantDeliveryArea.deleteMany({
        where: { areaId: sourceArea.id },
      });

      await tx.orderIntent.updateMany({
        where: { deliveryAreaId: sourceArea.id },
        data: { deliveryAreaId: targetArea.id },
      });

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

      await tx.area.delete({
        where: { id: sourceArea.id },
      });
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'AREA_MERGED',
      entityType: 'area',
      entityId: targetAreaId,
      details: {
        sourceAreaId,
        sourceName: sourceArea.name,
        targetAreaId,
        targetName: targetArea.name,
      },
      ipAddress,
    });

    return {
      success: true,
      message: `Area "${sourceArea.name}" merged into "${targetArea.name}" successfully`,
    };
  }
}
