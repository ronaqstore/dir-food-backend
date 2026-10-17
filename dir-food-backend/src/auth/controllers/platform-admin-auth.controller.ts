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

@Controller('platform-admin')
@UseGuards(PlatformAdminGuard)
export class PlatformAdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users/:userId/password-setup-link')
  @HttpCode(HttpStatus.OK)
  async issuePasswordSetupLink(@Param('userId') userId: string) {
    return this.authService.issuePasswordSetupLink(userId);
  }
}

