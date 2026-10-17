import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  ForbiddenException,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UseGuards } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('me/restaurant')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard)
export class RestaurantMeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getMyRestaurant(@CurrentUser() user: AuthenticatedUser) {
    if (!user.restaurantId) {
      throw new ForbiddenException('No restaurant linked to this account');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      include: {
        hours: true,
        deliveryAreas: {
          include: {
            area: true,
          },
        },
        _count: {
          select: {
            items: { where: { isActive: true } },
            categories: { where: { isActive: true } },
          },
        },
      },
    });

    return restaurant;
  }
}
