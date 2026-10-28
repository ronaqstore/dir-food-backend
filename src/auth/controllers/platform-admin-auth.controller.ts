import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service.js';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard.js';

@ApiTags('Platform Admin Auth')
@ApiBearerAuth('bearer')
@Controller('platform-admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users/:userId/password-setup-link')
  @ApiOperation({ summary: 'Generate a single-use password setup link for a restaurant owner' })
  @HttpCode(HttpStatus.OK)
  async issuePasswordSetupLink(@Param('userId') userId: string) {
    return this.authService.issuePasswordSetupLink(userId);
  }
}

