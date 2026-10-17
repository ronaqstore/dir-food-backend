import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicAreasService } from '../services/public-areas.service.js';

@ApiTags('Public - Areas')
@Controller('public/areas')
@Public()
export class PublicAreasController {
  constructor(private readonly areasService: PublicAreasService) {}

  @Get()
  @ApiOperation({ summary: 'Get active delivery areas for public restaurant discovery' })
  @ApiResponse({ status: 200, description: 'List of available delivery areas' })
  async getAreas() {
    return this.areasService.getAreas();
  }
}

