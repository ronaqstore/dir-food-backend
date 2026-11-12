import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { RegisterRestaurantDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { OwnerLoginDto } from '../dto/owner-login.dto.js';
import { PlatformAdminLoginDto } from '../dto/platform-admin-login.dto.js';
import { SetupPasswordDto } from '../dto/setup-password.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import {
  OwnerLoginResponseDto,
  PlatformAdminLoginResponseDto,
} from '../dto/login-response.dto.js';
import { PasswordSetupLinkResponseDto } from '../dto/password-setup-link-response.dto.js';
import { CheckRestaurantNameResponse } from '../dto/check-restaurant-name.dto.js';
import type { AuthTokenClaims } from '../dto/jwt-claims.dto.js';
import {
  normalizePhone,
  isValidPakistaniMobile,
  slugify,
  isReservedPhoneNumber,
} from '../../common/utils/phone.js';
import { seedRestaurantDefaults } from '../../common/utils/restaurant-defaults.js';
import {
  RestaurantStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { AuthTokenType } from '../../common/guards/auth-token.js';
import { JwtService } from '@nestjs/jwt';
import {
  handleBuildSetupLink,
  handleIssuePasswordSetupLink,
  handleSetupPassword,
  handleChangePassword,
} from '../helpers/auth-password.helper.js';

const TIMING_EQUALISER_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QGK2M4Yw1nBqzYlJ0Z7iVfZ1zUq7r2K';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_MINUTES = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigurationService,
    private readonly auditService: AuditService,
  ) {}

  private async signToken(claims: AuthTokenClaims): Promise<string> {
    return this.jwtService.signAsync(claims, {
      secret: this.configService.jwtSecret,
      expiresIn: '12h',
    });
  }

  async registerRestaurant(dto: RegisterRestaurantDto, ipAddress?: string) {
    const normalizedPhone = normalizePhone(dto.phone);
    if (!isValidPakistaniMobile(normalizedPhone)) {
      throw new BadRequestException(
        'Invalid Pakistani mobile number for owner',
      );
    }
    if (isReservedPhoneNumber(normalizedPhone)) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    let normalizedWa: string | undefined = undefined;
    if (dto.whatsappNumber) {
      normalizedWa = normalizePhone(dto.whatsappNumber);
      if (!isValidPakistaniMobile(normalizedWa)) {
        throw new BadRequestException(
          'Invalid Pakistani mobile number for WhatsApp',
        );
      }
      if (isReservedPhoneNumber(normalizedWa)) {
        throw new ConflictException('This phone number is already in use');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user with this phone number already exists',
      );
    }

    let baseSlug = slugify(dto.restaurantName);
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

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    let cityId = dto.cityId;
    if (cityId) {
      const city = await this.prisma.city?.findUnique({
        where: { id: cityId },
      });
      if (!city) {
        throw new BadRequestException('Invalid city/district ID');
      }
    } else if (this.prisma.city?.findFirst) {
      const defaultCity =
        (await this.prisma.city.findFirst({
          where: { slug: 'lower-dir', isActive: true },
        })) ??
        (await this.prisma.city.findFirst({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }));
      cityId = defaultCity?.id;
    }

    const now = new Date();
    const subscriptionEndsAt = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: dto.restaurantName.trim(),
          slug,
          cityId: cityId ?? null,
          description: dto.description?.trim() ?? null,
          whatsappNumber: normalizedWa ?? null,
          cuisines: dto.cuisines ?? [],
          status: RestaurantStatus.PENDING,
          trialStartedAt: now,
          subscriptionEndsAt,
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

      await seedRestaurantDefaults(tx, restaurant.id, cityId);

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
        phone: normalizedPhone,
      },
      ipAddress,
    });

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
        trialStartedAt: result.restaurant.trialStartedAt,
        subscriptionEndsAt: result.restaurant.subscriptionEndsAt,
      },
    };
  }

  async restaurantOwnerLogin(
    dto: OwnerLoginDto,
    _ipAddress?: string,
  ): Promise<OwnerLoginResponseDto> {
    const normalizedPhone = normalizePhone(dto.phone);

    const user = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        role: UserRole.RESTAURANT_OWNER,
      },
      include: {
        restaurant: true,
      },
    });

    const now = new Date();

    if (!user) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Invalid phone or password');
    }

    if (!user.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException(
        'Password not set. Please use your setup link.',
      );
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - now.getTime()) / 60_000,
      );
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).`,
          lockedUntil: user.lockedUntil.toISOString(),
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const newAttempts = user.failedLoginCount + 1;
      let lockedUntil: Date | null = null;

      if (newAttempts >= this.MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(now.getTime() + this.LOCKOUT_MINUTES * 60_000);
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
            message: `Account has been locked due to too many failed attempts. Try again in ${this.LOCKOUT_MINUTES} minutes.`,
            lockedUntil: lockedUntil.toISOString(),
          },
          HttpStatus.FORBIDDEN,
        );
      }

      throw new UnauthorizedException('Invalid phone or password');
    }

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
      throw new HttpException(
        {
          code: 'USER_INACTIVE',
          message:
            'Your account is inactive or suspended. Please contact support.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    let subscriptionStatus = 'EXPIRED';
    if (user.restaurant) {
      if (
        user.restaurant.subscriptionEndsAt &&
        user.restaurant.subscriptionEndsAt.getTime() > now.getTime()
      ) {
        subscriptionStatus = 'ACTIVE';
      } else if (user.restaurant.status === RestaurantStatus.PENDING) {
        subscriptionStatus = 'PENDING_APPROVAL';
      }
    }

    const accessToken = await this.signToken({
      sub: user.id,
      userId: user.id,
      typ: AuthTokenType.RESTAURANT_OWNER,
      restaurantId: user.restaurantId ?? null,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '12h',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      restaurantId: user.restaurantId ?? '',
      restaurant: user.restaurant
        ? {
            id: user.restaurant.id,
            name: user.restaurant.name,
            slug: user.restaurant.slug,
            status: user.restaurant.status,
            subscriptionStatus,
          }
        : {
            id: '',
            name: '',
            slug: '',
            status: RestaurantStatus.PENDING,
            subscriptionStatus: 'EXPIRED',
          },
    };
  }

  async platformAdminLogin(
    dto: PlatformAdminLoginDto,
    _ipAddress?: string,
  ): Promise<PlatformAdminLoginResponseDto> {
    const normalizedPhone = normalizePhone(dto.phone);

    const admin = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        role: UserRole.PLATFORM_ADMIN,
      },
    });

    const now = new Date();

    if (!admin || !admin.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (admin.status !== UserStatus.ACTIVE) {
      throw new HttpException(
        {
          code: 'USER_INACTIVE',
          message: 'Account is inactive. Access denied.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (admin.failedLoginCount > 0 || admin.lockedUntil !== null) {
      await this.prisma.user.update({
        where: { id: admin.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    }

    const accessToken = await this.signToken({
      sub: admin.id,
      userId: admin.id,
      typ: AuthTokenType.PLATFORM_ADMIN,
      role: admin.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '12h',
      admin: {
        id: admin.id,
        name: admin.name,
        phone: admin.phone,
        role: admin.role,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const res = await this.restaurantOwnerLogin(dto, ipAddress);
    return {
      token: res.accessToken,
      user: res.user,
      restaurant: res.restaurant,
    };
  }

  async issuePasswordSetupLink(
    userId: string,
  ): Promise<PasswordSetupLinkResponseDto> {
    return handleIssuePasswordSetupLink(
      this.prisma,
      this.configService,
      userId,
    );
  }

  async buildSetupLink(
    userId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<{ setupUrl: string; expiresAt: Date }> {
    return handleBuildSetupLink(client, this.configService, userId);
  }

  async setupPassword(dto: SetupPasswordDto) {
    return handleSetupPassword(this.prisma, dto, this.SALT_ROUNDS);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return handleChangePassword(this.prisma, userId, dto, this.SALT_ROUNDS);
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

  async checkRestaurantName(
    name: string,
  ): Promise<CheckRestaurantNameResponse> {
    const trimmed = name?.trim() || '';
    let baseSlug = slugify(trimmed);
    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = `rest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const reserved = ['admin', 'api', 'dashboard', 'login', 'r', 'www'];
    if (reserved.includes(baseSlug)) {
      baseSlug = `${baseSlug}-food`;
    }

    const existing = await this.prisma.restaurant.findUnique({
      where: { slug: baseSlug },
      select: { name: true, addressText: true },
    });

    if (!existing) {
      return {
        available: true,
        collision: false,
        baseSlug,
        suggestedSlug: baseSlug,
      };
    }

    let counter = 1;
    let suggestedSlug = baseSlug;
    while (
      await this.prisma.restaurant.findUnique({
        where: { slug: suggestedSlug },
      })
    ) {
      counter++;
      suggestedSlug = `${baseSlug}-${counter}`;
    }

    return {
      available: false,
      collision: true,
      baseSlug,
      suggestedSlug,
      existingRestaurant: {
        name: existing.name,
        addressText: existing.addressText ?? null,
      },
    };
  }
}
