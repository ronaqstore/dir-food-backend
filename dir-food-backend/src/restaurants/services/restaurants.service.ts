import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRestaurant(restaurantId?: string | null) {
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant linked to this account');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
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

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }
}
