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
import { RestaurantStatus, UserStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class RestaurantAuthGuard implements CanActivate {
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
      AuthTokenType.RESTAURANT_OWNER,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub ?? payload.userId },
      include: { restaurant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Your account has been disabled. Contact support.',
      );
    }

    if (!user.restaurant || !user.restaurantId) {
      throw new UnauthorizedException(
        'User is not associated with any restaurant',
      );
    }

    if (user.restaurant.status === RestaurantStatus.DEACTIVATED) {
      throw new ForbiddenException('This restaurant has been deactivated.');
    }

    if (user.restaurant.status === RestaurantStatus.SUSPENDED) {
      const isMutation =
        request.method !== 'GET' &&
        request.method !== 'HEAD' &&
        request.method !== 'OPTIONS';
      if (isMutation) {
        throw new ForbiddenException(
          'Restaurant is suspended. Modifying settings or menu is blocked.',
        );
      }
    }

    request.user = {
      userId: user.id,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    return true;
  }
}
