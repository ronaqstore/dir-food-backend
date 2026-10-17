import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  restaurantId?: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      return null;
    }
    return data ? request.user[data] : request.user;
  },
);
