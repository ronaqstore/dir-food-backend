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
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RegisterRestaurantDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterRestaurantDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.registerRestaurant(dto, ipAddress);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
  ) {
    const result = await this.authService.login(dto, ipAddress);

    // Set httpOnly cookie for web security
    res.cookie('dir_food_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
    });

    return {
      token: result.token,
      user: result.user,
      restaurant: result.restaurant,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('dir_food_token');
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.userId);
  }
}
