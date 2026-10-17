import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminOperationsService } from '../services/platform-admin-operations.service.js';
import { QueryAdminOrdersDto } from '../dto/query-admin-orders.dto.js';
import { QueryActivityDto } from '../dto/query-activity.dto.js';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';

@ApiTags('Platform Admin Operations')
@ApiBearerAuth('bearer')
@Controller('admin')
@Roles(UserRole.PLATFORM_ADMIN)
@UseGuards(RolesGuard)
export class PlatformAdminOperationsController {
  constructor(private readonly operationsService: PlatformAdminOperationsService) {}

  @Get('order-intents')
  @ApiOperation({ summary: 'Search order intents by reference code or customer details for support' })
  async searchOrderIntents(@Query() query: QueryAdminOrdersDto) {
    return this.operationsService.searchOrderIntents(query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Platform-wide 7-day or 30-day activity summary' })
  async getActivitySummary(@Query() query: QueryActivityDto) {
    return this.operationsService.getActivitySummary(query.range);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View paginated platform audit logs with filtering' })
  async getAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.operationsService.getAuditLogs(query);
  }
}

