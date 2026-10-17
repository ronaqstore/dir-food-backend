import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicAreasController } from './controllers/public-areas.controller.js';
import { PublicRestaurantsController } from './controllers/public-restaurants.controller.js';
import { PublicAreasService } from './services/public-areas.service.js';
import { PublicRestaurantsService } from './services/public-restaurants.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PublicAreasController, PublicRestaurantsController],
  providers: [PublicAreasService, PublicRestaurantsService],
  exports: [PublicAreasService, PublicRestaurantsService],
})
export class PublicCatalogModule {}

