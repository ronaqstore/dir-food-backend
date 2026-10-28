import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { OrderIntentsService } from '../services/order-intents.service.js';
import { QueryOrderIntentsDto, QueryStatsDto } from '../dto/query-order-intents.dto.js';

@ApiTags('Restaurant Owner - Order Intents')
@ApiBearerAuth('bearer')
@Controller('me/restaurant')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class RestaurantOrderIntentsController {
  constructor(private readonly orderIntentsService: OrderIntentsService) {}

  @Get('order-intents')
  @ApiOperation({ summary: 'List incoming WhatsApp order requests for own restaurant (last 30 days)' })
  async getOrderIntents(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryOrderIntentsDto,
  ) {
    return this.orderIntentsService.getOwnerOrderIntents(
      user.restaurantId!,
      query,
    );
  }

  @Get('order-intents/:id')
  @ApiOperation({ summary: 'Get full detail of a specific order intent for own restaurant' })
  async getOrderIntentDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.orderIntentsService.getOwnerOrderIntentDetail(
      user.restaurantId!,
      id,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order intent activity counts and top requested items (7d or 30d)' })
  async getStats(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStatsDto,
  ) {
    return this.orderIntentsService.getOwnerStats(
      user.restaurantId!,
      query.range,
    );
  }
}

