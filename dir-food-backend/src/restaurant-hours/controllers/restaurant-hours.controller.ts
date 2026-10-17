import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { RestaurantHoursService } from '../services/restaurant-hours.service.js';
import { UpdateRestaurantHoursDto } from '../dto/update-hours.dto.js';

@ApiTags('Restaurant Owner - Operating Hours')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/hours')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class RestaurantHoursController {
  constructor(private readonly hoursService: RestaurantHoursService) {}

  @Get()
  @ApiOperation({ summary: 'Get current weekly operating hours' })
  async getHours(@CurrentUser() user: AuthenticatedUser) {
    return this.hoursService.getHours(user.restaurantId!);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace full weekly operating hours schedule' })
  async updateHours(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRestaurantHoursDto,
  ) {
    return this.hoursService.updateHours(user.restaurantId!, dto);
  }
}
