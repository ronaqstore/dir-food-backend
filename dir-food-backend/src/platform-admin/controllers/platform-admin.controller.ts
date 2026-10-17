import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlatformAdminService } from '../services/platform-admin.service.js';
import { UpdateRestaurantStatusDto } from '../dto/update-status.dto.js';
import { QueryRestaurantsDto } from '../dto/query-restaurants.dto.js';
import { CreateRestaurantAdminDto } from '../dto/create-restaurant-admin.dto.js';
import { UpdateRestaurantAdminDto } from '../dto/update-restaurant-admin.dto.js';
import { ExtendSubscriptionDto } from '../dto/extend-subscription.dto.js';
import { ShortenSubscriptionDto } from '../dto/shorten-subscription.dto.js';
import { UpdateSlugDto } from '../dto/update-slug.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Platform Admin Restaurants')
@ApiBearerAuth('bearer')
@Controller('admin')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminController {
  constructor(private readonly adminService: PlatformAdminService) {}

  @Get('restaurants')
  @ApiOperation({ summary: 'List all restaurants with filtering, search, and pagination' })
  async listRestaurants(@Query() query: QueryRestaurantsDto) {
    return this.adminService.listRestaurants(query);
  }

  @Post('restaurants')
  @ApiOperation({ summary: 'Admin-assisted onboarding: create restaurant, owner, and setup link' })
  async createRestaurant(
    @Body() dto: CreateRestaurantAdminDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.createRestaurant(dto, adminUser.userId, ipAddress);
  }

  @Get('restaurants/pending')
  @ApiOperation({ summary: 'List all pending restaurant onboarding applications' })
  async getPendingRestaurants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getPendingRestaurants(pageNum, limitNum);
  }

  @Get('restaurants/:id')
  @ApiOperation({ summary: 'Get full restaurant onboarding detail and verification status' })
  async getRestaurantDetail(@Param('id') id: string) {
    return this.adminService.getRestaurantDetail(id);
  }

  @Patch('restaurants/:id')
  @ApiOperation({ summary: 'Edit restaurant record (support edit and admin notes)' })
  async updateRestaurant(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantAdminDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.updateRestaurant(id, dto, adminUser.userId, ipAddress);
  }

  @Patch('restaurants/:id/status')
  @ApiOperation({ summary: 'Approve, suspend, or deactivate a restaurant (starts 30-day trial on approval)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantStatusDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.updateRestaurantStatus(
      id,
      dto,
      adminUser.userId,
      ipAddress,
    );
  }

  @Post('restaurants/:id/subscription/extend')
  @ApiOperation({ summary: 'Extend subscription following manual offline payment' })
  @HttpCode(HttpStatus.OK)
  async extendSubscription(
    @Param('id') id: string,
    @Body() dto: ExtendSubscriptionDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.extendSubscription(
      id,
      dto,
      adminUser.userId,
      ipAddress,
    );
  }

  @Post('restaurants/:id/subscription/shorten')
  @ApiOperation({ summary: 'Corrective: shorten subscription end date with mandatory reason' })
  @HttpCode(HttpStatus.OK)
  async shortenSubscription(
    @Param('id') id: string,
    @Body() dto: ShortenSubscriptionDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.shortenSubscription(
      id,
      dto,
      adminUser.userId,
      ipAddress,
    );
  }

  @Patch('restaurants/:id/slug')
  @ApiOperation({ summary: 'Change restaurant slug' })
  async changeSlug(
    @Param('id') id: string,
    @Body() dto: UpdateSlugDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.changeSlug(
      id,
      dto,
      adminUser.userId,
      ipAddress,
    );
  }

  @Post('restaurants/:id/setup-link')
  @ApiOperation({ summary: 'Generate a new single-use password setup link for the restaurant owner' })
  @HttpCode(HttpStatus.OK)
  async issueSetupLink(
    @Param('id') id: string,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.issueSetupLink(id, adminUser.userId, ipAddress);
  }
}
