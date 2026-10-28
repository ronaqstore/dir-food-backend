import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AuthTokenType,
  extractRawToken,
  verifyTokenOfType,
} from './auth-token.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';
import { UserRole, UserStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigurationService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const token = extractRawToken(request);
    const payload = await verifyTokenOfType(
      this.jwtService,
      this.configService.jwtSecret,
      token,
      AuthTokenType.PLATFORM_ADMIN,
    );

    const admin = await this.prisma.user.findUnique({
      where: { id: payload.sub ?? payload.userId },
    });

    if (!admin || admin.role !== UserRole.PLATFORM_ADMIN) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (admin.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Admin account is disabled.');
    }

    request.user = {
      userId: admin.id,
      role: admin.role,
      restaurantId: null,
    };

    return true;
  }
}
