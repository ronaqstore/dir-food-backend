import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
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
import { MenuCategoriesService } from '../services/menu-categories.service.js';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { UpdateCategoryDto } from '../dto/update-category.dto.js';
import { ReorderCategoriesDto } from '../dto/reorder-categories.dto.js';

@ApiTags('Restaurant Owner - Menu Categories')
@ApiBearerAuth('bearer')
@Controller('me/restaurant/categories')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class MenuCategoriesController {
  constructor(private readonly categoriesService: MenuCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all menu categories for the current restaurant' })
  async getCategories(@CurrentUser() user: AuthenticatedUser) {
    return this.categoriesService.getCategories(user.restaurantId!);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu category' })
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.createCategory(user.restaurantId!, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or rename a menu category' })
  async updateCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(user.restaurantId!, id, dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update display ordering of menu categories' })
  async reorderCategories(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorderCategories(user.restaurantId!, dto.ids);
  }
}
