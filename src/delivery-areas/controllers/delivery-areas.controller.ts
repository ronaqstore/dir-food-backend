import {
  Controller,
  Get,
  Put,
  Post,
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
import { DeliveryAreasService } from '../services/delivery-areas.service.js';
import { UpdateDeliveryAreasDto } from '../dto/update-delivery-areas.dto.js';
import { CreateCustomDeliveryAreaDto } from '../dto/create-custom-delivery-area.dto.js';

@ApiTags('Restaurant Owner - Delivery Areas')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/delivery-areas')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class DeliveryAreasController {
  constructor(private readonly areasService: DeliveryAreasService) {}

  @Get()
  @ApiOperation({ summary: 'Get all platform areas with restaurant served and fee status' })
  async getDeliveryAreas(@CurrentUser() user: AuthenticatedUser) {
    return this.areasService.getDeliveryAreas(user.restaurantId!);
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure served delivery areas and delivery fees' })
  async updateDeliveryAreas(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDeliveryAreasDto,
  ) {
    return this.areasService.updateDeliveryAreas(user.restaurantId!, dto);
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a custom delivery area in restaurant city and activate for delivery' })
  async createCustomArea(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomDeliveryAreaDto,
  ) {
    return this.areasService.createCustomArea(user.restaurantId!, dto);
  }
}
