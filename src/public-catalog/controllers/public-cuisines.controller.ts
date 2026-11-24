import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicCuisinesService } from '../services/public-cuisines.service.js';

@ApiTags('Public - Cuisines')
@Controller('public/cuisines')
@Public()
export class PublicCuisinesController {
  constructor(private readonly cuisinesService: PublicCuisinesService) {}

  @Get()
  @Header(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  )
  @ApiOperation({
    summary: 'Get active cuisines for restaurant discovery',
  })
  @ApiResponse({ status: 200, description: 'List of available cuisines' })
  async getCuisines() {
    return this.cuisinesService.getCuisines();
  }
}
