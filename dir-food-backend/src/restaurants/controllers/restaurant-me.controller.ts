import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Ip,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { RestaurantAuthGuard } from '../../common/guards/restaurant-auth.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { RestaurantsService } from '../services/restaurants.service.js';
import { UpdateRestaurantProfileDto } from '../dto/update-restaurant-profile.dto.js';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto.js';

@ApiTags('Restaurant Owner - Profile')
@ApiBearerAuth('bearer')
@Controller('me/restaurant')
@Roles(UserRole.RESTAURANT_OWNER)
@UseGuards(RolesGuard, RestaurantAuthGuard)
export class RestaurantMeController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current authenticated restaurant profile, hours, and areas' })
  async getMyRestaurant(@CurrentUser() user: AuthenticatedUser) {
    return this.restaurantsService.getMyRestaurant(user.restaurantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update restaurant profile details (name, WhatsApp, description, etc.)' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRestaurantProfileDto,
    @Ip() ipAddress: string,
  ) {
    return this.restaurantsService.updateProfile(
      user.restaurantId!,
      dto,
      user.userId,
      ipAddress,
    );
  }

  @Put('availability')
  @ApiOperation({ summary: 'Update restaurant availability switch (AUTO, CLOSED, TEMP_UNAVAILABLE)' })
  async updateAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.restaurantsService.updateAvailability(user.restaurantId!, dto);
  }

  @Post('images/:kind')
  @ApiOperation({
    summary: 'Upload restaurant logo or cover image',
    description:
      'Uploads a JPEG, PNG, or WebP image (max 3 MB). Strips EXIF metadata, auto-rotates, and resizes up to 1600px.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('kind') kind: string,
    @UploadedFile() file?: { buffer: Buffer; size: number; mimetype: string },
  ) {
    if (kind !== 'logo' && kind !== 'cover') {
      throw new BadRequestException(
        'Invalid image kind. Supported kinds: logo, cover',
      );
    }
    return this.restaurantsService.uploadRestaurantImage(
      user.restaurantId!,
      kind,
      file,
    );
  }

  @Delete('images/:kind')
  @ApiOperation({
    summary: 'Remove restaurant logo or cover image',
    description:
      'Clears the image URL in database and removes the object from storage.',
  })
  async deleteImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('kind') kind: string,
  ) {
    if (kind !== 'logo' && kind !== 'cover') {
      throw new BadRequestException(
        'Invalid image kind. Supported kinds: logo, cover',
      );
    }
    return this.restaurantsService.deleteRestaurantImage(
      user.restaurantId!,
      kind,
    );
  }
}

