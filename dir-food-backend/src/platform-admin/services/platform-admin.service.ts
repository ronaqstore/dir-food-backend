import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RestaurantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { AuthService } from '../../auth/services/auth.service.js';
import { normalizePhone, isValidPakistaniMobile, slugify } from '../../common/utils/phone.js';
import { seedRestaurantDefaults } from '../../common/utils/restaurant-defaults.js';
import { UpdateRestaurantStatusDto } from '../dto/update-status.dto.js';
import { QueryRestaurantsDto } from '../dto/query-restaurants.dto.js';
import { CreateRestaurantAdminDto } from '../dto/create-restaurant-admin.dto.js';
import { UpdateRestaurantAdminDto } from '../dto/update-restaurant-admin.dto.js';
import { ExtendSubscriptionDto } from '../dto/extend-subscription.dto.js';
import { ShortenSubscriptionDto } from '../dto/shorten-subscription.dto.js';
import { UpdateSlugDto } from '../dto/update-slug.dto.js';

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  /**
   * List all restaurants with filtering by status, search keyword, and pagination.
   */
  async listRestaurants(query: QueryRestaurantsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
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

  /**
   * Admin-assisted restaurant onboarding: creates restaurant + owner account atomically
   * and builds a single-use password setup link for the owner.
   */
  async createRestaurant(
    dto: CreateRestaurantAdminDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const normalizedOwnerPhone = normalizePhone(dto.owner.phone);
    if (!isValidPakistaniMobile(normalizedOwnerPhone)) {
      throw new BadRequestException('Invalid Pakistani mobile number for owner');
    }

    const normalizedContact = normalizePhone(dto.contactPhone);
    if (!isValidPakistaniMobile(normalizedContact)) {
      throw new BadRequestException('Invalid Pakistani mobile number for contactPhone');
    }

    let normalizedWa: string | undefined = undefined;
    if (dto.whatsappNumber) {
      normalizedWa = normalizePhone(dto.whatsappNumber);
      if (!isValidPakistaniMobile(normalizedWa)) {
        throw new BadRequestException('Invalid Pakistani mobile number for whatsappNumber');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedOwnerPhone },
    });
    if (existingUser) {
      throw new ConflictException('A user with this phone number already exists');
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
      const city = await this.prisma.city?.findUnique({ where: { id: cityId } });
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

  /**
   * Backward-compatible alias for existing tests / calls.
   */
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

  /**
   * Full restaurant detail including completeness warnings for onboarding approval.
   */
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
      missingPrerequisites.push('At least one active delivery area is required');
    }

    return {
      ...restaurant,
      completeness: {
        isReadyForApproval: missingPrerequisites.length === 0,
        missingPrerequisites,
      },
    };
  }

  /**
   * Edit restaurant profile (support edits and admin notes).
   */
  async updateRestaurant(
    id: string,
    dto: UpdateRestaurantAdminDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let normalizedContact = restaurant.contactPhone;
    if (dto.contactPhone) {
      normalizedContact = normalizePhone(dto.contactPhone);
      if (!isValidPakistaniMobile(normalizedContact)) {
        throw new BadRequestException('Invalid Pakistani mobile number for contactPhone');
      }
    }

    let normalizedWa = restaurant.whatsappNumber;
    if (dto.whatsappNumber !== undefined) {
      if (dto.whatsappNumber === null || dto.whatsappNumber.trim() === '') {
        normalizedWa = null;
      } else {
        normalizedWa = normalizePhone(dto.whatsappNumber);
        if (!isValidPakistaniMobile(normalizedWa)) {
          throw new BadRequestException('Invalid Pakistani mobile number for whatsappNumber');
        }
      }
    }

    const minOrder =
      dto.minOrderAmount !== undefined
        ? dto.minOrderAmount !== null
          ? BigInt(dto.minOrderAmount)
          : null
        : undefined;

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() ?? null;
    if (dto.cuisines !== undefined) data.cuisines = dto.cuisines;
    if (dto.addressText !== undefined) data.addressText = dto.addressText?.trim() ?? null;
    if (dto.contactPhone !== undefined) data.contactPhone = normalizedContact;
    if (dto.whatsappNumber !== undefined) data.whatsappNumber = normalizedWa;
    if (minOrder !== undefined) data.minOrderAmount = minOrder;
    if (dto.adminNotes !== undefined) data.adminNotes = dto.adminNotes?.trim() ?? null;
    if (dto.cityId !== undefined) {
      if (dto.cityId) {
        const city = await this.prisma.city.findUnique({ where: { id: dto.cityId } });
        if (!city) {
          throw new BadRequestException('Invalid city/district ID');
        }
        data.cityId = dto.cityId;
      } else {
        data.cityId = null;
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

  /**
   * Approve, suspend, or deactivate a restaurant.
   */
  async updateRestaurantStatus(
    restaurantId: string,
    dto: UpdateRestaurantStatusDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
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

    // Rule: DEACTIVATED is terminal through normal workflows
    if (restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ConflictException(
        'Deactivated restaurants cannot be modified or reactivated',
      );
    }

    if (
      (dto.status === RestaurantStatus.SUSPENDED ||
        dto.status === RestaurantStatus.DEACTIVATED) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException(
        'A reason is required when suspending or deactivating a restaurant',
      );
    }

    const oldStatus = restaurant.status;
    const newStatus = dto.status;
    const now = new Date();

    // APPROVAL WORKFLOW: PENDING -> ACTIVE
    if (
      newStatus === RestaurantStatus.ACTIVE &&
      oldStatus === RestaurantStatus.PENDING
    ) {
      const missingPrerequisites: string[] = [];

      if (!restaurant.whatsappNumber) {
        missingPrerequisites.push(
          'A valid WhatsApp contact number is required',
        );
      }
      if (restaurant.hours.length === 0) {
        missingPrerequisites.push('Configured opening hours are required');
      }
      if (restaurant.items.length === 0) {
        missingPrerequisites.push('At least one active menu item is required');
      }
      if (restaurant.deliveryAreas.length === 0) {
        missingPrerequisites.push(
          'At least one active delivery area is required',
        );
      }

      if (missingPrerequisites.length > 0) {
        throw new UnprocessableEntityException({
          code: 'APPROVAL_PREREQUISITES_NOT_MET',
          message: 'Cannot approve restaurant: prerequisites not satisfied',
          details: missingPrerequisites,
        });
      }

      // Starts 30-day trial
      const subscriptionEndsAt = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      const updated = await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          status: RestaurantStatus.ACTIVE,
          statusReason: dto.reason ?? null,
          statusChangedAt: now,
          trialStartedAt: now,
          subscriptionEndsAt,
        },
      });

      await this.auditService.log({
        actorUserId: adminUserId,
        restaurantId: restaurant.id,
        action: 'RESTAURANT_APPROVED',
        entityType: 'restaurant',
        entityId: restaurant.id,
        details: {
          oldStatus,
          newStatus,
          trialStartedAt: now,
          subscriptionEndsAt,
        },
        ipAddress,
      });

      return updated;
    }

    // REACTIVATION: SUSPENDED -> ACTIVE
    if (
      newStatus === RestaurantStatus.ACTIVE &&
      oldStatus === RestaurantStatus.SUSPENDED
    ) {
      // Rule: Reactivating never alters subscription dates.
      const updated = await this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          status: RestaurantStatus.ACTIVE,
          statusReason: dto.reason ?? null,
          statusChangedAt: now,
        },
      });

      await this.auditService.log({
        actorUserId: adminUserId,
        restaurantId: restaurant.id,
        action: 'RESTAURANT_REACTIVATED',
        entityType: 'restaurant',
        entityId: restaurant.id,
        details: {
          oldStatus,
          newStatus,
          reason: dto.reason,
        },
        ipAddress,
      });

      return updated;
    }

    // SUSPEND OR DEACTIVATE
    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        status: newStatus,
        statusReason: dto.reason ?? null,
        statusChangedAt: now,
      },
    });

    const action =
      newStatus === RestaurantStatus.SUSPENDED
        ? 'RESTAURANT_SUSPENDED'
        : 'RESTAURANT_DEACTIVATED';

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId: restaurant.id,
      action,
      entityType: 'restaurant',
      entityId: restaurant.id,
      details: {
        oldStatus,
        newStatus,
        reason: dto.reason,
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Extend a restaurant's subscription after receiving manual offline payment.
   * Rule: Updates only subscription_ends_at; never changes status!
   */
  async extendSubscription(
    id: string,
    dto: ExtendSubscriptionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ConflictException('Cannot extend subscription of a deactivated restaurant');
    }

    if (!restaurant.trialStartedAt) {
      throw new ConflictException(
        'Cannot extend subscription: restaurant has never been approved',
      );
    }

    const hasEndsAt = dto.subscriptionEndsAt !== undefined && dto.subscriptionEndsAt !== null;
    const hasAddDays = dto.addDays !== undefined && dto.addDays !== null;

    if ((hasEndsAt && hasAddDays) || (!hasEndsAt && !hasAddDays)) {
      throw new BadRequestException('Provide exactly one of subscriptionEndsAt or addDays');
    }

    const now = new Date();
    let newEndsAt: Date;

    if (hasAddDays) {
      const currentEnd = restaurant.subscriptionEndsAt
        ? new Date(restaurant.subscriptionEndsAt)
        : now;
      const baseTime = currentEnd.getTime() > now.getTime() ? currentEnd.getTime() : now.getTime();
      newEndsAt = new Date(baseTime + dto.addDays! * 24 * 60 * 60 * 1000);
    } else {
      newEndsAt = new Date(dto.subscriptionEndsAt!);
      if (isNaN(newEndsAt.getTime()) || newEndsAt.getTime() <= now.getTime()) {
        throw new BadRequestException('subscriptionEndsAt must be a valid future ISO timestamp');
      }
      if (
        restaurant.subscriptionEndsAt &&
        newEndsAt.getTime() <= new Date(restaurant.subscriptionEndsAt).getTime()
      ) {
        throw new BadRequestException(
          'subscriptionEndsAt must be later than the current subscription end',
        );
      }
    }

    const oldEndsAt = restaurant.subscriptionEndsAt;

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        subscriptionEndsAt: newEndsAt,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId: id,
      action: 'RESTAURANT_SUBSCRIPTION_EXTENDED',
      entityType: 'restaurant',
      entityId: id,
      details: {
        oldEndsAt,
        newEndsAt,
        addedDays: dto.addDays ?? null,
      },
      ipAddress,
    });

    return {
      restaurantId: updated.id,
      subscriptionEndsAt: updated.subscriptionEndsAt,
      previousSubscriptionEndsAt: oldEndsAt,
    };
  }

  /**
   * Corrective action: move subscription end date earlier.
   */
  async shortenSubscription(
    id: string,
    dto: ShortenSubscriptionDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ConflictException('Cannot modify subscription of a deactivated restaurant');
    }

    if (!restaurant.trialStartedAt) {
      throw new ConflictException('Restaurant has never been approved');
    }

    if (dto.confirm !== true) {
      throw new BadRequestException('confirm must be explicitly true');
    }

    if (!dto.reason?.trim()) {
      throw new BadRequestException('A reason is required to shorten a subscription');
    }

    const newEndsAt = new Date(dto.subscriptionEndsAt);
    if (isNaN(newEndsAt.getTime())) {
      throw new BadRequestException('Invalid subscriptionEndsAt timestamp');
    }

    if (newEndsAt.getTime() < new Date(restaurant.trialStartedAt).getTime()) {
      throw new BadRequestException(
        'subscriptionEndsAt cannot be earlier than initial trialStartedAt',
      );
    }

    if (
      !restaurant.subscriptionEndsAt ||
      newEndsAt.getTime() >= new Date(restaurant.subscriptionEndsAt).getTime()
    ) {
      throw new BadRequestException(
        'Corrective shortening requires a timestamp earlier than current subscriptionEndsAt',
      );
    }

    const oldEndsAt = restaurant.subscriptionEndsAt;

    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        subscriptionEndsAt: newEndsAt,
      },
    });

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId: id,
      action: 'RESTAURANT_SUBSCRIPTION_SHORTENED',
      entityType: 'restaurant',
      entityId: id,
      details: {
        oldEndsAt,
        newEndsAt,
        reason: dto.reason.trim(),
      },
      ipAddress,
    });

    return {
      restaurantId: updated.id,
      subscriptionEndsAt: updated.subscriptionEndsAt,
      previousSubscriptionEndsAt: oldEndsAt,
      reason: dto.reason.trim(),
    };
  }

  /**
   * Change restaurant slug with uniqueness validation and audit logging.
   */
  async changeSlug(
    id: string,
    dto: UpdateSlugDto,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
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

    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: newSlug },
    });
    if (existing && existing.id !== id) {
      throw new ConflictException('Slug is already in use by another restaurant');
    }

    const oldSlug = restaurant.slug;
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: { slug: newSlug },
    });

    await this.auditService.log({
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

  /**
   * Issue a new single-use password setup link for the restaurant owner.
   */
  async issueSetupLink(
    restaurantId: string,
    adminUserId: string,
    ipAddress?: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        users: {
          where: { role: UserRole.RESTAURANT_OWNER },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const owner = restaurant.users[0];
    if (!owner) {
      throw new NotFoundException('No owner user found for this restaurant');
    }

    const res = await this.authService.issuePasswordSetupLink(owner.id);

    await this.auditService.log({
      actorUserId: adminUserId,
      restaurantId,
      action: 'PASSWORD_SETUP_LINK_ISSUED',
      entityType: 'user',
      entityId: owner.id,
      details: {
        userId: owner.id,
        userPhone: owner.phone,
        replacedPreviousLink: res.replacedPreviousLink,
      },
      ipAddress,
    });

    return res;
  }
}
