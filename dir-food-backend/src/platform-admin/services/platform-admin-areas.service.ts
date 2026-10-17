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

@Injectable()
export class PlatformAdminAreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all areas (active and inactive) with restaurant count.
   */
  async listAreas() {
    const areas = await this.prisma.area.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
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
      name: area.name,
      slug: area.slug,
      sortOrder: area.sortOrder,
      isActive: area.isActive,
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

    const existingName = await this.prisma.area.findUnique({ where: { name } });
    if (existingName) {
      throw new ConflictException(`Area with name "${name}" already exists`);
    }

    const existingSlug = await this.prisma.area.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`Area with slug "${slug}" already exists`);
    }

    const area = await this.prisma.area.create({
      data: {
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
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Area name cannot be empty');
      if (name !== area.name) {
        const existing = await this.prisma.area.findUnique({ where: { name } });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Area with name "${name}" already exists`);
        }
        data.name = name;
      }
    }

    if (dto.slug !== undefined) {
      const slug = slugify(dto.slug.trim());
      if (!slug) throw new BadRequestException('Invalid area slug');
      if (slug !== area.slug) {
        const existing = await this.prisma.area.findUnique({ where: { slug } });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Area with slug "${slug}" already exists`);
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
}

