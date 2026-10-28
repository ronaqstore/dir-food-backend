import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { slugify } from '../../common/utils/phone.js';
import { CreateCityDto } from '../dto/create-city.dto.js';
import { UpdateCityDto } from '../dto/update-city.dto.js';

@Injectable()
export class PlatformAdminCitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listCities() {
    const cities = await this.prisma.city.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            areas: true,
            restaurants: true,
          },
        },
      },
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      slug: city.slug,
      sortOrder: city.sortOrder,
      isActive: city.isActive,
      areasCount: city._count.areas,
      restaurantsCount: city._count.restaurants,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
    }));
  }

  async createCity(
    dto: CreateCityDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('City name cannot be empty');
    }

    const slug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(name);
    if (!slug) {
      throw new BadRequestException('Invalid city slug');
    }

    const existingName = await this.prisma.city.findUnique({ where: { name } });
    if (existingName) {
      throw new ConflictException(`City with name "${name}" already exists`);
    }

    const existingSlug = await this.prisma.city.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictException(`City with slug "${slug}" already exists`);
    }

    const city = await this.prisma.city.create({
      data: {
        name,
        slug,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'CITY_CREATED',
      entityType: 'city',
      entityId: city.id,
      details: {
        name: city.name,
        slug: city.slug,
        sortOrder: city.sortOrder,
        isActive: city.isActive,
      },
      ipAddress,
    });

    return city;
  }

  async updateCity(
    id: string,
    dto: UpdateCityDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException('City not found');
    }

    const data: any = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('City name cannot be empty');
      if (name !== city.name) {
        const existing = await this.prisma.city.findUnique({ where: { name } });
        if (existing && existing.id !== id) {
          throw new ConflictException(`City with name "${name}" already exists`);
        }
        data.name = name;
      }
    }

    if (dto.slug !== undefined) {
      const slug = slugify(dto.slug.trim());
      if (!slug) throw new BadRequestException('Invalid city slug');
      if (slug !== city.slug) {
        const existing = await this.prisma.city.findUnique({ where: { slug } });
        if (existing && existing.id !== id) {
          throw new ConflictException(`City with slug "${slug}" already exists`);
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

    const updated = await this.prisma.city.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'CITY_UPDATED',
      entityType: 'city',
      entityId: id,
      details: {
        old: { name: city.name, slug: city.slug, isActive: city.isActive },
        updated: data,
      },
      ipAddress,
    });

    return updated;
  }
}
