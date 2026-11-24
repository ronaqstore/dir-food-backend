import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicAreasService } from '../services/public-areas.service.js';

@ApiTags('Public - Areas')
@Controller('public/areas')
@Public()
export class PublicAreasController {
  constructor(private readonly areasService: PublicAreasService) {}

  @Get()
  @Header(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  )
  @ApiOperation({
    summary: 'Get active delivery areas for public restaurant discovery',
  })
  @ApiQuery({
    name: 'cityId',
    required: false,
    description: 'Optional City UUID filter',
  })
  @ApiResponse({ status: 200, description: 'List of available delivery areas' })
  async getAreas(@Query('cityId') cityId?: string) {
    return this.areasService.getAreas(cityId);
  }
}
