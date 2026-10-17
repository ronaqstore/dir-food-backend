import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { RegisterRestaurantDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { normalizePhone, isValidPakistaniMobile, slugify } from '../../common/utils/phone.js';
import { RestaurantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { AuditService } from '../../audit/audit.service.js';

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  restaurantId?: string | null;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigurationService,
    private readonly auditService: AuditService,
  ) {}

  async registerRestaurant(dto: RegisterRestaurantDto, ipAddress?: string) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!isValidPakistaniMobile(normalizedPhone)) {
      throw new BadRequestException('Invalid Pakistani mobile number for owner');
    }

    let normalizedWa: string | undefined = undefined;
    if (dto.whatsappNumber) {
      normalizedWa = normalizePhone(dto.whatsappNumber);
      if (!isValidPakistaniMobile(normalizedWa)) {
        throw new BadRequestException('Invalid Pakistani mobile number for WhatsApp');
      }
    }

    // Check if phone is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingUser) {
      throw new ConflictException('A user with this phone number already exists');
    }

    // Generate base slug
    let baseSlug = slugify(dto.restaurantName);
    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = `rest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    // Reserved slugs check
    const reserved = ['admin', 'api', 'dashboard', 'login', 'r', 'www'];
    if (reserved.includes(baseSlug)) {
      baseSlug = `${baseSlug}-food`;
    }

    // Find unique slug
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.restaurant.findUnique({ where: { slug } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Transaction to create restaurant and owner atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName.trim(),
          slug,
          description: dto.description?.trim() ?? null,
          whatsappNumber: normalizedWa ?? null,
          cuisines: dto.cuisines ?? [],
          status: RestaurantStatus.PENDING,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.ownerName.trim(),
          phone: normalizedPhone,
          passwordHash,
          role: UserRole.RESTAURANT_OWNER,
          status: UserStatus.ACTIVE,
          restaurantId: restaurant.id,
        },
      });

      return { restaurant, user };
    });

    await this.auditService.log({
      actorUserId: result.user.id,
      restaurantId: result.restaurant.id,
      action: 'RESTAURANT_SELF_REGISTERED',
      entityType: 'restaurant',
      entityId: result.restaurant.id,
      details: {
        name: result.restaurant.name,
        slug: result.restaurant.slug,
        ownerPhone: normalizedPhone,
      },
      ipAddress,
    });

    // Safe return, never expose password hash
    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status,
      },
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
        slug: result.restaurant.slug,
        status: result.restaurant.status,
      },
    };
  }

  async login(dto: LoginDto, _ipAddress?: string) {
    const normalizedPhone = normalizePhone(dto.phone);

    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Phone or password is incorrect');
    }

    // Check account lockout
    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        },
        HttpStatus.LOCKED,
      );
    }

    // Check password
    const isPasswordValid = user.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!isPasswordValid) {
      const newAttempts = user.failedLoginCount + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + this.LOCKOUT_MINUTES * 60 * 1000);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newAttempts,
          lockedUntil,
        },
      });

      if (lockedUntil) {
        throw new HttpException(
          {
            code: 'ACCOUNT_LOCKED',
            message: `Too many failed attempts. Account locked for ${this.LOCKOUT_MINUTES} minutes.`,
          },
          HttpStatus.LOCKED,
        );
      }

      throw new UnauthorizedException('Phone or password is incorrect');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginCount > 0 || user.lockedUntil !== null) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Your account has been disabled. Contact support.');
    }

    // Generate JWT
    const payload: AuthTokenPayload = {
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const token = jwt.sign(payload, this.configService.jwtSecret, {
      expiresIn: '12h',
    });

    let subscriptionStatus = 'VALID';
    if (user.restaurant) {
      if (!user.restaurant.subscriptionEndsAt || user.restaurant.subscriptionEndsAt <= now) {
        subscriptionStatus = 'EXPIRED';
      }
    }

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      restaurant: user.restaurant
        ? {
            id: user.restaurant.id,
            name: user.restaurant.name,
            slug: user.restaurant.slug,
            status: user.restaurant.status,
            subscriptionStatus,
          }
        : null,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            trialStartedAt: true,
            subscriptionEndsAt: true,
            whatsappNumber: true,
            contactPhone: true,
            manualStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
