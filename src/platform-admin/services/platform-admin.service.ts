import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  RestaurantStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { AuthService } from '../../auth/services/auth.service.js';
import {
  normalizePhone,
  isValidPakistaniMobile,
  slugify,
  isReservedPhoneNumber,
} from '../../common/utils/phone.js';
import { seedRestaurantDefaults } from '../../common/utils/restaurant-defaults.js';
import { UpdateRestaurantStatusDto } from '../dto/update-status.dto.js';
import { QueryRestaurantsDto } from '../dto/query-restaurants.dto.js';
import { CreateRestaurantAdminDto } from '../dto/create-restaurant-admin.dto.js';
import { UpdateRestaurantAdminDto } from '../dto/update-restaurant-admin.dto.js';
import { ExtendSubscriptionDto } from '../dto/extend-subscription.dto.js';
import { ShortenSubscriptionDto } from '../dto/shorten-subscription.dto.js';
import { UpdateSlugDto } from '../dto/update-slug.dto.js';
import {
  handleExtendSubscription,
  handleShortenSubscription,
} from '../helpers/platform-admin-subscriptions.helper.js';
import {
  handleUpdateRestaurantStatus,
  handleIssueSetupLink,
} from '../helpers/platform-admin-status.helper.js';
import { handleChangeSlug } from '../helpers/platform-admin-slug.helper.js';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  async listRestaurants(query: QueryRestaurantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RestaurantWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
        { whatsappNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { role: UserRole.RESTAURANT_OWNER },
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              status: true,
            },
          },
          _count: {
            select: {
              items: { where: { isActive: true } },
              deliveryAreas: { where: { isActive: true } },
              hours: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createRestaurant(
    dto: CreateRestaurantAdminDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const normalizedOwnerPhone = normalizePhone(dto.owner.phone);
    if (!isValidPakistaniMobile(normalizedOwnerPhone)) {
      throw new BadRequestException(
        'Invalid Pakistani mobile number for owner',
      );
    }
    if (isReservedPhoneNumber(normalizedOwnerPhone)) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    const normalizedContact = normalizePhone(dto.contactPhone);
    if (!isValidPakistaniMobile(normalizedContact)) {
      throw new BadRequestException(
        'Invalid Pakistani mobile number for contactPhone',
      );
    }
    if (isReservedPhoneNumber(normalizedContact)) {
      throw new ConflictException('This phone number is already in use');
    }

    let normalizedWa: string | undefined = undefined;
    if (dto.whatsappNumber) {
      normalizedWa = normalizePhone(dto.whatsappNumber);
      if (!isValidPakistaniMobile(normalizedWa)) {
        throw new BadRequestException(
          'Invalid Pakistani mobile number for whatsappNumber',
        );
      }
      if (isReservedPhoneNumber(normalizedWa)) {
        throw new ConflictException('This phone number is already in use');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedOwnerPhone },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    let baseSlug = slugify(dto.name);
    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = `rest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const reserved = ['admin', 'api', 'dashboard', 'login', 'r', 'www'];
    if (reserved.includes(baseSlug)) {
      baseSlug = `${baseSlug}-food`;
    }

    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.restaurant.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    let cityId = dto.cityId;
    if (cityId) {
      const city = await this.prisma.city?.findUnique({
        where: { id: cityId },
      });
      if (!city) {
        throw new BadRequestException('Invalid city/district ID');
      }
    } else if (this.prisma.city?.findFirst) {
      const defaultCity = await this.prisma.city.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      cityId = defaultCity?.id;
    }

    const minOrder =
      dto.minOrderAmount !== undefined && dto.minOrderAmount !== null
        ? BigInt(dto.minOrderAmount)
        : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.name.trim(),
          slug,
          cityId: cityId ?? null,
          contactPhone: normalizedContact,
          whatsappNumber: normalizedWa ?? null,
          addressText: dto.addressText?.trim() ?? null,
          cuisines: dto.cuisines ?? [],
          minOrderAmount: minOrder,
          status: RestaurantStatus.PENDING,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.owner.name.trim(),
          phone: normalizedOwnerPhone,
          role: UserRole.RESTAURANT_OWNER,
          status: UserStatus.ACTIVE,
          restaurantId: restaurant.id,
        },
      });

      await seedRestaurantDefaults(tx, restaurant.id, cityId);

      const setupLink = await this.authService.buildSetupLink(user.id, tx);

      return { restaurant, user, setupLink };
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId: result.restaurant.id,
      action: 'RESTAURANT_CREATED_BY_ADMIN',
      entityType: 'restaurant',
      entityId: result.restaurant.id,
      details: {
        name: result.restaurant.name,
        slug: result.restaurant.slug,
        ownerPhone: normalizedOwnerPhone,
      },
      ipAddress,
    });

    return {
      restaurant: result.restaurant,
      owner: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
      },
      setupLink: result.setupLink,
    };
  }

  async getPendingRestaurants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.restaurant.count({
        where: { status: RestaurantStatus.PENDING },
      }),
      this.prisma.restaurant.findMany({
        where: { status: RestaurantStatus.PENDING },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              status: true,
            },
          },
          _count: {
            select: {
              items: { where: { isActive: true } },
              deliveryAreas: { where: { isActive: true } },
              hours: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getRestaurantDetail(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            status: true,
          },
        },
        deliveryAreas: {
          include: {
            area: true,
          },
        },
        hours: {
          orderBy: [{ dayOfWeek: 'asc' }, { openTime: 'asc' }],
        },
        _count: {
          select: {
            items: { where: { isActive: true } },
            categories: { where: { isActive: true } },
            deliveryAreas: { where: { isActive: true } },
            hours: true,
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
      missingPrerequisites.push(
        'At least one active delivery area is required',
      );
    }

    return {
      ...restaurant,
      completeness: {
        isReadyForApproval: missingPrerequisites.length === 0,
        missingPrerequisites,
      },
    };
  }

  async updateRestaurant(
    id: string,
    dto: UpdateRestaurantAdminDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let normalizedContact = restaurant.contactPhone;
    if (dto.contactPhone) {
      normalizedContact = normalizePhone(dto.contactPhone);
      if (!isValidPakistaniMobile(normalizedContact)) {
        throw new BadRequestException(
          'Invalid Pakistani mobile number for contactPhone',
        );
      }
      if (isReservedPhoneNumber(normalizedContact)) {
        throw new ConflictException('This phone number is already in use');
      }
    }

    let normalizedWa = restaurant.whatsappNumber;
    if (dto.whatsappNumber !== undefined) {
      if (dto.whatsappNumber === null || dto.whatsappNumber.trim() === '') {
        normalizedWa = null;
      } else {
        normalizedWa = normalizePhone(dto.whatsappNumber);
        if (!isValidPakistaniMobile(normalizedWa)) {
          throw new BadRequestException(
            'Invalid Pakistani mobile number for whatsappNumber',
          );
        }
        if (isReservedPhoneNumber(normalizedWa)) {
          throw new ConflictException('This phone number is already in use');
        }
      }
    }

    const minOrder =
      dto.minOrderAmount !== undefined
        ? dto.minOrderAmount !== null
          ? BigInt(dto.minOrderAmount)
          : null
        : undefined;

    const data: Prisma.RestaurantUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() ?? null;
    if (dto.cuisines !== undefined) data.cuisines = dto.cuisines;
    if (dto.addressText !== undefined)
      data.addressText = dto.addressText?.trim() ?? null;
    if (dto.contactPhone !== undefined) data.contactPhone = normalizedContact;
    if (dto.whatsappNumber !== undefined) data.whatsappNumber = normalizedWa;
    if (minOrder !== undefined) data.minOrderAmount = minOrder;
    if (dto.adminNotes !== undefined)
      data.adminNotes = dto.adminNotes?.trim() ?? null;
    if (dto.cityId !== undefined) {
      if (dto.cityId) {
        const city = await this.prisma.city.findUnique({
          where: { id: dto.cityId },
        });
        if (!city) {
          throw new BadRequestException('Invalid city/district ID');
        }
        data.city = { connect: { id: dto.cityId } };
      } else {
        data.city = { disconnect: true };
      }
    }

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId: id,
      action: 'RESTAURANT_UPDATED_BY_ADMIN',
      entityType: 'restaurant',
      entityId: id,
      details: {
        updatedFields: Object.keys(data),
      },
      ipAddress,
    });

    return updated;
  }

  async updateRestaurantStatus(
    restaurantId: string,
    dto: UpdateRestaurantStatusDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    return handleUpdateRestaurantStatus(
      this.prisma,
      this.auditService,
      restaurantId,
      dto,
      adminUserId,
      ipAddress,
    );
  }

  async extendSubscription(
    id: string,
    dto: ExtendSubscriptionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    return handleExtendSubscription(
      this.prisma,
      this.auditService,
      id,
      dto,
      adminUserId,
      ipAddress,
    );
  }

  async shortenSubscription(
    id: string,
    dto: ShortenSubscriptionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    return handleShortenSubscription(
      this.prisma,
      this.auditService,
      id,
      dto,
      adminUserId,
      ipAddress,
    );
  }

  async changeSlug(
    id: string,
    dto: UpdateSlugDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    return handleChangeSlug(
      this.prisma,
      this.auditService,
      id,
      dto,
      adminUserId,
      ipAddress,
    );
  }

  async issueSetupLink(
    restaurantId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    return handleIssueSetupLink(
      this.prisma,
      this.authService,
      this.auditService,
      restaurantId,
      adminUserId,
      ipAddress,
    );
  }
}
