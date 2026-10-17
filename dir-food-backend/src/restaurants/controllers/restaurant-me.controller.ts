import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { RestaurantsService } from '../services/restaurants.service.js';
import { UpdateRestaurantProfileDto } from '../dto/update-restaurant-profile.dto.js';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';

@ApiTags('Restaurant Owner - Profile')
@ApiBearerAuth('bearer')
@Controller('me/restaurant')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class RestaurantMeController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current authenticated restaurant profile, hours, and areas' })
  async getMyRestaurant(@CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.getMyRestaurant(user.restaurantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update restaurant profile details (name, WhatsApp, description, etc.)' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRestaurantProfileDto,
    @Ip() ipAddress: string,
  ) {
    return this.restaurantsService.updateProfile(
      user.restaurantId!,
      dto,
      user.userId,
      ipAddress,
    );
  }

  @Put('availability')
  @ApiOperation({ summary: 'Update restaurant availability switch (AUTO, CLOSED, TEMP_UNAVAILABLE)' })
  async updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.restaurantsService.updateAvailability(user.restaurantId!, dto);
  }
}

