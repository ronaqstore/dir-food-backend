import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { MenuItemsService } from '../services/menu-items.service.js';
import { CreateMenuItemDto } from '../dto/create-item.dto.js';
import { UpdateMenuItemDto } from '../dto/update-item.dto.js';
import { ReorderMenuItemsDto } from '../dto/reorder-items.dto.js';
import { ReplaceVariantsDto } from '../dto/replace-variants.dto.js';

@ApiTags('Restaurant Owner - Menu Items')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/items')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class MenuItemsController {
  constructor(private readonly itemsService: MenuItemsService) {}

  @Get()
  @ApiOperation({ summary: 'List menu items for current restaurant with variants' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getItems(
    @CurrentUser() user: AuthenticatedUser,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.itemsService.getItems(
      user.restaurantId!,
      categoryId,
      pageNum,
      limitNum,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu item with basePrice or variants' })
  async createItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.itemsService.createItem(user.restaurantId!, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update menu item details, availability, or category' })
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.itemsService.updateItem(user.restaurantId!, id, dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder menu items within a category' })
  async reorderItems(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderMenuItemsDto,
  ) {
    return this.itemsService.reorderItems(
      user.restaurantId!,
      dto.categoryId,
      dto.ids,
    );
  }

  @Put(':id/variants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replace size variants for a menu item' })
  async replaceVariants(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReplaceVariantsDto,
  ) {
    return this.itemsService.replaceVariants(user.restaurantId!, id, dto);
  }
}
