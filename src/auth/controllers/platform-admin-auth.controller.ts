import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Param,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Platform Admin Auth')
@ApiBearerAuth('bearer')
@Controller('platform-admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users/:userId/password-setup-link')
  @ApiOperation({
    summary: 'Generate a single-use password setup link for a restaurant owner',
  })
  @HttpCode(HttpStatus.OK)
  async issuePasswordSetupLink(@Param('userId') userId: string) {
    return this.authService.issuePasswordSetupLink(userId);
  }

  @Post('change-password')
  @ApiOperation({
    summary: 'Change password for authenticated platform admin',
  })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }
}
