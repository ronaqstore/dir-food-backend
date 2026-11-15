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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedRestaurantUser } from '../../common/decorators/current-user.decorator.js';
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
  @ApiOperation({
    summary: 'List all menu categories for the current restaurant',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  async getCategories(
    @CurrentUser() user: AuthenticatedRestaurantUser,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    if (
      search === undefined &&
      isActive === undefined &&
      page === undefined &&
      limit === undefined &&
      sortBy === undefined &&
      sortOrder === undefined
    ) {
      return this.categoriesService.getCategories(user.restaurantId);
    }
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.categoriesService.getCategories(
      user.restaurantId,
      search,
      isActiveBool,
      pageNum,
      limitNum,
      sortBy,
      sortOrder,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new menu category' })
  async createCategory(
    @CurrentUser() user: AuthenticatedRestaurantUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.createCategory(user.restaurantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or rename a menu category' })
  async updateCategory(
    @CurrentUser() user: AuthenticatedRestaurantUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(user.restaurantId, id, dto);
  }

  @Put('order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update display ordering of menu categories' })
  async reorderCategories(
    @CurrentUser() user: AuthenticatedRestaurantUser,
    @Body() dto: ReorderCategoriesDto,
  ) {
    return this.categoriesService.reorderCategories(user.restaurantId, dto.ids);
  }
}
