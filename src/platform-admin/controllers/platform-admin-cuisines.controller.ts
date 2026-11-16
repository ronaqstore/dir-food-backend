import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { PlatformAdminCuisinesService } from '../services/platform-admin-cuisines.service.js';
import { CreateCuisineDto } from '../dto/create-cuisine.dto.js';
import { UpdateCuisineDto } from '../dto/update-cuisine.dto.js';
import { QueryCuisinesDto } from '../dto/query-cuisines.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Platform Admin Cuisines')
@ApiBearerAuth('bearer')
@Controller('admin/cuisines')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminCuisinesController {
  constructor(private readonly cuisinesService: PlatformAdminCuisinesService) {}

  @Get()
  @ApiOperation({
    summary: 'List cuisines with filtering, pagination and sorting',
  })
  async listCuisines(@Query() query: QueryCuisinesDto) {
    return this.cuisinesService.listCuisines(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cuisine' })
  async createCuisine(
    @Body() dto: CreateCuisineDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.cuisinesService.createCuisine(dto, adminUser.userId, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing cuisine' })
  async updateCuisine(
    @Param('id') id: string,
    @Body() dto: UpdateCuisineDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.cuisinesService.updateCuisine(
      id,
      dto,
      adminUser.userId,
      ipAddress,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cuisine' })
  async deleteCuisine(
    @Param('id') id: string,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.cuisinesService.deleteCuisine(id, adminUser.userId, ipAddress);
  }
}
