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
import { PlatformAdminAreasService } from '../services/platform-admin-areas.service.js';
import { CreateAreaDto } from '../dto/create-area.dto.js';
import { UpdateAreaDto } from '../dto/update-area.dto.js';
import { ApproveAreaDto } from '../dto/approve-area.dto.js';
import { MergeAreaDto } from '../dto/merge-area.dto.js';
import { QueryAreasDto } from '../dto/query-areas.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Platform Admin Areas')
@ApiBearerAuth('bearer')
@Controller('admin/areas')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminAreasController {
  constructor(private readonly areasService: PlatformAdminAreasService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all delivery areas with active restaurant counts, filtering, sorting and pagination',
  })
  async listAreas(@Query() query: QueryAreasDto) {
    return this.areasService.listAreas(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new master delivery area' })
  async createArea(
    @Body() dto: CreateAreaDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.areasService.createArea(dto, adminUser.userId, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update an existing delivery area (name, slug, sort order, active status)',
  })
  async updateArea(
    @Param('id') id: string,
    @Body() dto: UpdateAreaDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.areasService.updateArea(id, dto, adminUser.userId, ipAddress);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery area if no orders exist' })
  async deleteArea(
    @Param('id') id: string,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.areasService.deleteArea(id, adminUser.userId, ipAddress);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve an unverified area to publish it to customers',
  })
  async approveArea(
    @Param('id') id: string,
    @Body() dto: ApproveAreaDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.areasService.approveArea(id, dto, adminUser.userId, ipAddress);
  }

  @Post(':id/merge')
  @ApiOperation({
    summary: 'Merge a duplicate/misspelled area into a canonical target area',
  })
  async mergeArea(
    @Param('id') id: string,
    @Body() dto: MergeAreaDto,
    @CurrentUser() adminUser: AuthenticatedUser,
    @Ip() ipAddress: string,
  ) {
    return this.areasService.mergeArea(
      id,
      dto.targetAreaId,
      adminUser.userId,
      ipAddress,
    );
  }
}
