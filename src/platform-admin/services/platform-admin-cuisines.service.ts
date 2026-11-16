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
import { ensureDefaultCuisines } from '../../common/utils/cuisine-defaults.js';
import { CreateCuisineDto } from '../dto/create-cuisine.dto.js';
import { UpdateCuisineDto } from '../dto/update-cuisine.dto.js';
import { QueryCuisinesDto } from '../dto/query-cuisines.dto.js';

@Injectable()
export class PlatformAdminCuisinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listCuisines(query: QueryCuisinesDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(500, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Prisma.CuisineWhereInput = {};

    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const sortOrder =
      query.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';
    let orderBy: Prisma.CuisineOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ];

    if (query.sortBy === 'name') {
      orderBy = [{ name: sortOrder }];
    } else if (query.sortBy === 'sortOrder') {
      orderBy = [{ sortOrder: sortOrder }, { name: 'asc' }];
    } else if (query.sortBy === 'createdAt') {
      orderBy = [{ createdAt: sortOrder }];
    }

    const [total, items] = await Promise.all([
      this.prisma.cuisine.count({ where }),
      this.prisma.cuisine.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    if (total === 0 && !query.q?.trim() && query.isActive === undefined) {
      await ensureDefaultCuisines(this.prisma);
      const [seededTotal, seededItems] = await Promise.all([
        this.prisma.cuisine.count({ where }),
        this.prisma.cuisine.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
      ]);
      return {
        data: seededItems,
        meta: {
          page,
          limit,
          total: seededTotal,
          totalPages: Math.ceil(seededTotal / limit) || 1,
        },
      };
    }

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listActiveCuisines() {
    return this.prisma.cuisine.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCuisine(
    dto: CreateCuisineDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Cuisine name cannot be empty');
    }

    const slug = dto.slug?.trim() ? slugify(dto.slug.trim()) : slugify(name);
    if (!slug) {
      throw new BadRequestException('Invalid cuisine slug');
    }

    const existingName = await this.prisma.cuisine.findUnique({
      where: { name },
    });
    if (existingName) {
      throw new ConflictException(`Cuisine with name "${name}" already exists`);
    }

    const existingSlug = await this.prisma.cuisine.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Cuisine with slug "${slug}" already exists`);
    }

    const cuisine = await this.prisma.cuisine.create({
      data: {
        name,
        slug,
        icon: dto.icon?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'CUISINE_CREATED',
      entityType: 'cuisine',
      entityId: cuisine.id,
      details: {
        name: cuisine.name,
        slug: cuisine.slug,
        sortOrder: cuisine.sortOrder,
        isActive: cuisine.isActive,
      },
      ipAddress,
    });

    return cuisine;
  }

  async updateCuisine(
    id: string,
    dto: UpdateCuisineDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const cuisine = await this.prisma.cuisine.findUnique({ where: { id } });
    if (!cuisine) {
      throw new NotFoundException('Cuisine not found');
    }

    const data: Prisma.CuisineUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Cuisine name cannot be empty');
      if (name !== cuisine.name) {
        const existing = await this.prisma.cuisine.findUnique({
          where: { name },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Cuisine with name "${name}" already exists`,
          );
        }
        data.name = name;
      }
    }

    if (dto.slug !== undefined) {
      const slug = slugify(dto.slug.trim());
      if (!slug) throw new BadRequestException('Invalid cuisine slug');
      if (slug !== cuisine.slug) {
        const existing = await this.prisma.cuisine.findUnique({
          where: { slug },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException(
            `Cuisine with slug "${slug}" already exists`,
          );
        }
        data.slug = slug;
      }
    }

    if (dto.icon !== undefined) {
      data.icon = dto.icon?.trim() || null;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    const updated = await this.prisma.cuisine.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'CUISINE_UPDATED',
      entityType: 'cuisine',
      entityId: id,
      details: {
        old: {
          name: cuisine.name,
          slug: cuisine.slug,
          isActive: cuisine.isActive,
        },
        updated: data as Record<string, unknown>,
      },
      ipAddress,
    });

    return updated;
  }

  async deleteCuisine(id: string, adminUserId: string, ipAddress?: string) {
    const cuisine = await this.prisma.cuisine.findUnique({ where: { id } });
    if (!cuisine) {
      throw new NotFoundException('Cuisine not found');
    }

    await this.prisma.cuisine.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'CUISINE_DELETED',
      entityType: 'cuisine',
      entityId: id,
      details: {
        name: cuisine.name,
        slug: cuisine.slug,
      },
      ipAddress,
    });

    return { success: true };
  }
}
