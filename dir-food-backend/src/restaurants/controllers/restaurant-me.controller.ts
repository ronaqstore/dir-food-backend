import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { RestaurantsService } from '../services/restaurants.service.js';

@Controller('me/restaurant')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard)
export class RestaurantMeController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  async getMyRestaurant(@CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.getMyRestaurant(user.restaurantId);
  }
}
