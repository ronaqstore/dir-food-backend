import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service.js';
import { UpdateRestaurantStatusDto } from './dto/update-status.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { UserRole } from '../generated/prisma/enums.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('admin')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminController {
  constructor(private readonly adminService: PlatformAdminService) {}

  @Get('restaurants/pending')
  async getPendingRestaurants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.adminService.getPendingRestaurants(pageNum, limitNum);
  }

  @Get('restaurants/:id')
  async getRestaurantDetail(@Param('id') id: string) {
    return this.adminService.getRestaurantDetail(id);
  }

  @Patch('restaurants/:id/status')
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
}
