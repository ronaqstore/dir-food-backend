import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client.js';
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
  assertNotLockedOut,
  handleFailedLoginAttempt,
  checkAndRecordIpLoginThrottle,
} from '../helpers/auth-password.helper.js';
import { handleGetMe } from '../helpers/auth-me.helper.js';

const TIMING_EQUALISER_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QGK2M4Yw1nBqzYlJ0Z7iVfZ1zUq7r2K';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_MINUTES = 15;
  private readonly ipLoginAttempts = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigurationService,
    private readonly auditService: AuditService,
  ) {}

  private async signToken(
    claims: AuthTokenClaims,
    expiresIn = '7d',
  ): Promise<string> {
    return this.jwtService.signAsync(claims, {
      secret: this.configService.jwtSecret,
      expiresIn: expiresIn as
        `${number}d` | `${number}h` | `${number}m` | `${number}s`,
    });
  }

  private computeBaseSlug(name: string): string {
    let slug = slugify(name?.trim() || '');
    if (!slug || slug.length < 3) {
      slug = `rest-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    return ['admin', 'api', 'dashboard', 'login', 'r', 'www'].includes(slug)
      ? `${slug}-food`
      : slug;
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

    const baseSlug = this.computeBaseSlug(dto.restaurantName);

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

    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const restaurant = await tx.restaurant.create({
          data: {
            name: dto.restaurantName.trim(),
            slug,
            cityId: cityId ?? null,
            description: dto.description?.trim() ?? null,
            whatsappNumber: normalizedWa ?? null,
            cuisines: dto.cuisines ?? [],
            status: RestaurantStatus.PENDING,
            trialStartedAt: null,
            subscriptionEndsAt: null,
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
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = (err.meta?.target as string[]) || [];
        const msg = target.includes('phone')
          ? 'A user with this phone number already exists'
          : target.includes('slug')
            ? 'A restaurant with this name or slug already exists'
            : 'A record with these unique details already exists';
        throw new ConflictException(msg);
      }
      throw err;
    }

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
    ipAddress?: string,
  ): Promise<OwnerLoginResponseDto> {
    checkAndRecordIpLoginThrottle(this.ipLoginAttempts, ipAddress);
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

    if (!user || !user.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Invalid phone or password');
    }

    assertNotLockedOut(user.lockedUntil, now);

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await handleFailedLoginAttempt(
        this.prisma,
        user.id,
        user.failedLoginCount,
        now,
        this.MAX_FAILED_ATTEMPTS,
        this.LOCKOUT_MINUTES,
        'Invalid phone or password',
      );
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

    const tokenExpiresIn = dto.rememberMe ? '30d' : '7d';
    const accessToken = await this.signToken(
      {
        sub: user.id,
        userId: user.id,
        typ: AuthTokenType.RESTAURANT_OWNER,
        restaurantId: user.restaurantId ?? null,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
      tokenExpiresIn,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: tokenExpiresIn,
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
            subscriptionEndsAt: user.restaurant.subscriptionEndsAt,
          }
        : {
            id: '',
            name: '',
            slug: '',
            status: RestaurantStatus.PENDING,
            subscriptionStatus: 'EXPIRED',
            subscriptionEndsAt: null,
          },
    };
  }

  async platformAdminLogin(
    dto: PlatformAdminLoginDto,
    ipAddress?: string,
  ): Promise<PlatformAdminLoginResponseDto> {
    checkAndRecordIpLoginThrottle(this.ipLoginAttempts, ipAddress);
    const normalizedPhone = normalizePhone(dto.phone);

    const admin = await this.prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        role: UserRole.PLATFORM_ADMIN,
      },
    });

    if (!admin || !admin.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    assertNotLockedOut(admin.lockedUntil, now);

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      await handleFailedLoginAttempt(
        this.prisma,
        admin.id,
        admin.failedLoginCount,
        now,
        this.MAX_FAILED_ATTEMPTS,
        this.LOCKOUT_MINUTES,
        'Invalid credentials',
      );
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
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }

    const tokenExpiresIn = dto.rememberMe ? '30d' : '7d';
    const accessToken = await this.signToken(
      {
        sub: admin.id,
        userId: admin.id,
        typ: AuthTokenType.PLATFORM_ADMIN,
        role: admin.role,
        tokenVersion: admin.tokenVersion,
      },
      tokenExpiresIn,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: tokenExpiresIn,
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

  async getMe(userId: string, tokenVersion?: number) {
    return handleGetMe(this.prisma, userId, tokenVersion);
  }

  async checkRestaurantName(
    name: string,
  ): Promise<CheckRestaurantNameResponse> {
    const baseSlug = this.computeBaseSlug(name);

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
