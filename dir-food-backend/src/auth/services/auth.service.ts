import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
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
import { normalizePhone, isValidPakistaniMobile, slugify } from '../../common/utils/phone.js';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  isWellFormedToken,
} from '../../common/utils/token.helper.js';
import { RestaurantStatus, UserRole, UserStatus } from '../../generated/prisma/enums.js';
import { AuditService } from '../../audit/services/audit.service.js';
import { AuthTokenType } from '../../common/guards/auth-token.js';

import { JwtService } from '@nestjs/jwt';

/**
 * Pre-computed bcrypt hash of an impossible password, used to ensure
 * invalid phone queries take the same duration as wrong password attempts.
 */
const TIMING_EQUALISER_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QGK2M4Yw1nBqzYlJ0Z7iVfZ1zUq7r2K';

const SETUP_PASSWORD_PATH = '/setup-password';

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

  private async signToken(claims: {
    sub: string;
    userId: string;
    typ: AuthTokenType;
    restaurantId?: string | null;
    role?: string;
  }): Promise<string> {
    return this.jwtService.signAsync(claims, {
      secret: this.configService.jwtSecret,
      expiresIn: '12h',
    });
  }

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

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existingUser) {
      throw new ConflictException('A user with this phone number already exists');
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

  /**
   * Restaurant Owner login endpoint (POST /auth/login).
   * Verifies credentials, applies account lockout on failed attempts,
   * checks restaurant status, and signs an OWNER JWT token.
   */
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
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Phone or password is incorrect');
    }

    if (!user.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Phone or password is incorrect');
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - now.getTime()) / 60000,
      );
      throw new HttpException(
        {
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked. Please try again in ${remainingMinutes} minute(s).`,
        },
        HttpStatus.LOCKED,
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

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
      throw new UnauthorizedException(
        'Your account has been disabled. Contact support.',
      );
    }

    const token = await this.signToken({
      sub: user.id,
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
      typ: AuthTokenType.RESTAURANT_OWNER,
    });

    let subscriptionStatus = 'VALID';
    if (user.restaurant) {
      if (
        !user.restaurant.subscriptionEndsAt ||
        user.restaurant.subscriptionEndsAt <= now
      ) {
        subscriptionStatus = 'EXPIRED';
      }
    }

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: '12h',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      restaurantId: user.restaurantId!,
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

  /**
   * Platform Admin login endpoint (POST /auth/platform-admin/login).
   * Verifies admin credentials and signs a PLATFORM_ADMIN JWT token.
   */
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

    if (!admin || !admin.passwordHash) {
      await bcrypt.compare(dto.password, TIMING_EQUALISER_HASH);
      throw new UnauthorizedException('Phone or password is incorrect');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Phone or password is incorrect');
    }

    if (admin.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your account has been disabled. Contact support.',
      );
    }

    const token = await this.signToken({
      sub: admin.id,
      userId: admin.id,
      role: admin.role,
      typ: AuthTokenType.PLATFORM_ADMIN,
    });

    return {
      accessToken: token,
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

  /**
   * Backward-compatible alias for existing tests / calls.
   */
  async login(dto: LoginDto, ipAddress?: string) {
    const res = await this.restaurantOwnerLogin(dto, ipAddress);
    return {
      token: res.accessToken,
      user: res.user,
      restaurant: res.restaurant,
    };
  }

  /**
   * Admin issues a one-time password setup link for a restaurant owner.
   */
  async issuePasswordSetupLink(
    userId: string,
  ): Promise<PasswordSetupLinkResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const replacedPreviousLink = Boolean(
      user.setupTokenHash &&
        user.setupExpiresAt &&
        user.setupExpiresAt.getTime() > Date.now(),
    );

    const link = await this.buildSetupLink(user.id);

    return {
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      expiresAt: link.expiresAt,
      setupUrl: link.setupUrl,
      replacedPreviousLink,
    };
  }

  /**
   * Helper to build and persist setup token on the user row.
   */
  async buildSetupLink(
    userId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<{ setupUrl: string; expiresAt: Date }> {
    const token = generateOpaqueToken();
    const setupTokenHash = hashOpaqueToken(token);
    const expiresAt = new Date(
      Date.now() + this.configService.passwordSetupTokenTtlMinutes * 60_000,
    );

    await client.user.update({
      where: { id: userId },
      data: {
        setupTokenHash,
        setupExpiresAt: expiresAt,
      },
    });

    const setupUrl = `${this.configService.appBaseUrl}${SETUP_PASSWORD_PATH}?token=${token}`;
    return { setupUrl, expiresAt };
  }

  /**
   * Owner consumes the one-time setup token and sets their password.
   */
  async setupPassword(dto: SetupPasswordDto) {
    if (!isWellFormedToken(dto.token)) {
      throw new BadRequestException('Invalid or expired setup token');
    }

    const tokenHash = hashOpaqueToken(dto.token);

    const user = await this.prisma.user.findFirst({
      where: { setupTokenHash: tokenHash },
    });

    if (!user || !user.setupExpiresAt) {
      throw new BadRequestException('Invalid or expired setup token');
    }

    if (user.setupExpiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invalid or expired setup token');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const consumed = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        setupTokenHash: tokenHash,
        setupExpiresAt: { gt: new Date() },
      },
      data: {
        passwordHash,
        setupTokenHash: null,
        setupExpiresAt: null,
      },
    });

    if (consumed.count !== 1) {
      throw new BadRequestException('Invalid or expired setup token');
    }

    return { success: true, message: 'Password set successfully' };
  }

  /**
   * Owner changes their current password.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.passwordHash) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * GET /auth/me - Cold-start query for current user & restaurant status.
   */
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
