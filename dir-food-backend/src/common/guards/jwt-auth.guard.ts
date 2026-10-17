import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: AppConfigurationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = jwt.verify(token, this.configService.jwtSecret) as {
        userId: string;
        role: AuthenticatedUser['role'];
        restaurantId?: string | null;
      };

      request.user = {
        userId: payload.userId,
        role: payload.role,
        restaurantId: payload.restaurantId ?? null,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    // 1. Try httpOnly cookie 'dir_food_token'
    if (request.cookies && request.cookies.dir_food_token) {
      return request.cookies.dir_food_token;
    }

    // 2. Fallback to Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
