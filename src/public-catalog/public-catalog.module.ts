import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicAreasController } from './controllers/public-areas.controller.js';
import { PublicCitiesController } from './controllers/public-cities.controller.js';
import { PublicRestaurantsController } from './controllers/public-restaurants.controller.js';
import { PublicAreasService } from './services/public-areas.service.js';
import { PublicCitiesService } from './services/public-cities.service.js';
import { PublicRestaurantsService } from './services/public-restaurants.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicCitiesController,
    PublicAreasController,
    PublicRestaurantsController,
  ],
  providers: [
    PublicCitiesService,
    PublicAreasService,
    PublicRestaurantsService,
  ],
  exports: [
    PublicCitiesService,
    PublicAreasService,
    PublicRestaurantsService,
  ],
})
export class PublicCatalogModule {}

