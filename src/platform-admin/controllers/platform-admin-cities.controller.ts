import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { PlatformAdminCitiesService } from '../services/platform-admin-cities.service.js';
import { CreateCityDto } from '../dto/create-city.dto.js';
import { UpdateCityDto } from '../dto/update-city.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Platform Admin Cities')
@ApiBearerAuth('bearer')
@Controller('admin/cities')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminCitiesController {
  constructor(private readonly citiesService: PlatformAdminCitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List all cities with area and restaurant counts' })
  async listCities() {
    return this.citiesService.listCities();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new city/district' })
  async createCity(
    @Body() dto: CreateCityDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.citiesService.createCity(dto, adminUser.userId, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing city' })
  async updateCity(
    @Param('id') id: string,
    @Body() dto: UpdateCityDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.citiesService.updateCity(id, dto, adminUser.userId, ipAddress);
  }
}
