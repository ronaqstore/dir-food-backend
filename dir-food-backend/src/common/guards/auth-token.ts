import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UserRole } from '../../generated/prisma/enums.js';

export enum AuthTokenType {
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export interface OwnerTokenPayload {
  sub: string;
  userId: string;
  role: UserRole;
  restaurantId: string;
  typ: AuthTokenType.RESTAURANT_OWNER;
}

export interface AdminTokenPayload {
  sub: string;
  userId: string;
  role: UserRole;
  typ: AuthTokenType.PLATFORM_ADMIN;
}

export type JwtPayloadClaims = OwnerTokenPayload | AdminTokenPayload;

export interface AuthenticatedOwner {
  userId: string;
  restaurantId: string;
  role: UserRole;
}

export interface AuthenticatedPlatformAdmin {
  userId: string;
  name?: string;
  role: UserRole;
}

export const extractRawToken = (request: Request): string | null => {
  // 1. Try httpOnly cookie 'dir_food_token'
  if (request.cookies && request.cookies.dir_food_token) {
    return request.cookies.dir_food_token;
  }

  // 2. Fallback to Authorization: Bearer <token>
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
};

export const verifyTokenOfType = async (
  jwtService: JwtService,
  secret: string,
  rawToken: string | null,
  expectedType: AuthTokenType,
): Promise<JwtPayloadClaims> => {
  if (!rawToken) {
    throw new UnauthorizedException('Authentication required');
  }

  let payload: any;
  try {
    payload = await jwtService.verifyAsync<JwtPayloadClaims>(rawToken, {
      secret,
    });
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }

  const id = payload?.sub ?? payload?.userId;
  if (!payload || !id) {
    throw new UnauthorizedException('Invalid token');
  }

  if (payload.typ) {
    if (payload.typ !== expectedType) {
      throw new UnauthorizedException('Invalid token type for this endpoint');
    }
  } else {
    if (
      expectedType === AuthTokenType.PLATFORM_ADMIN &&
      payload.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new UnauthorizedException('Invalid token type for this endpoint');
    }
    if (
      expectedType === AuthTokenType.RESTAURANT_OWNER &&
      payload.role !== UserRole.RESTAURANT_OWNER
    ) {
      throw new UnauthorizedException('Invalid token type for this endpoint');
    }
  }

  if (expectedType === AuthTokenType.RESTAURANT_OWNER && !payload.restaurantId) {
    throw new UnauthorizedException('Restaurant token must include a restaurantId');
  }

  return {
    ...payload,
    sub: id,
    userId: id,
  };
};
