import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Ip,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RegisterRestaurantDto } from '../dto/register.dto.js';
import { OwnerLoginDto } from '../dto/owner-login.dto.js';
import { PlatformAdminLoginDto } from '../dto/platform-admin-login.dto.js';
import { SetupPasswordDto } from '../dto/setup-password.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new restaurant and owner account atomically' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterRestaurantDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.registerRestaurant(dto, ipAddress);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Restaurant owner login' })
  @HttpCode(HttpStatus.OK)
  async ownerLogin(
    @Body() dto: OwnerLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.restaurantOwnerLogin(dto, ipAddress);

    // Set httpOnly cookie for web security
    res.cookie('dir_food_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    return {
      token: result.accessToken,
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
      restaurantId: result.restaurantId,
      restaurant: result.restaurant,
    };
  }

  @Public()
  @Post('platform-admin/login')
  @ApiOperation({ summary: 'Platform admin login' })
  @HttpCode(HttpStatus.OK)
  async platformAdminLogin(
    @Body() dto: PlatformAdminLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.platformAdminLogin(dto, ipAddress);

    // Set httpOnly cookie for web security
    res.cookie('dir_food_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    return {
      token: result.accessToken,
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      admin: result.admin,
    };
  }

  @Public()
  @Post('setup-password')
  @ApiOperation({ summary: 'First-time password setup via one-time link token' })
  @HttpCode(HttpStatus.OK)
  async setupPassword(@Body() dto: SetupPasswordDto) {
    return this.authService.setupPassword(dto);
  }

  @Post('change-password')
  @UseGuards(RestaurantAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Change password for authenticated restaurant owner' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Log out and clear session cookie' })
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('dir_food_token');
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current authenticated user profile and restaurant info' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }
}
