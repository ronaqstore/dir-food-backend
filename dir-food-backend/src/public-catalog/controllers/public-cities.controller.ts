import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicCitiesService } from '../services/public-cities.service.js';

@ApiTags('Public - Cities')
@Controller('public/cities')
@Public()
export class PublicCitiesController {
  constructor(private readonly citiesService: PublicCitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get active cities/districts for public restaurant discovery' })
  @ApiResponse({ status: 200, description: 'List of available cities' })
  async getCities() {
    return this.citiesService.getCities();
  }
}

