import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicRestaurantsService } from '../services/public-restaurants.service.js';
import { QueryPublicRestaurantsDto } from '../dto/query-public-restaurants.dto.js';

@ApiTags('Public - Restaurants')
@Controller('public/restaurants')
@Public()
export class PublicRestaurantsController {
  constructor(private readonly restaurantsService: PublicRestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'List publicly discoverable eligible restaurants with filters' })
  @ApiResponse({ status: 200, description: 'List of eligible restaurants' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  async getRestaurants(@Query() query: QueryPublicRestaurantsDto) {
    return this.restaurantsService.getRestaurants(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get public restaurant profile by slug' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug', example: 'hotel-al-noor' })
  @ApiResponse({ status: 200, description: 'Public restaurant profile' })
  @ApiResponse({ status: 404, description: 'Restaurant not available' })
  async getRestaurantBySlug(@Param('slug') slug: string) {
    return this.restaurantsService.getRestaurantBySlug(slug);
  }

  @Get(':slug/menu')
  @ApiOperation({ summary: 'Get active menu catalog for restaurant' })
  @ApiParam({ name: 'slug', description: 'Restaurant URL slug', example: 'hotel-al-noor' })
  @ApiResponse({ status: 200, description: 'Public menu categories and active items' })
  @ApiResponse({ status: 404, description: 'Restaurant not available' })
  async getRestaurantMenu(@Param('slug') slug: string) {
    return this.restaurantsService.getRestaurantMenu(slug);
  }
}

