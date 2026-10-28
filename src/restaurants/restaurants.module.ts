import { Module } from '@nestjs/common';
import { RestaurantMeController } from './controllers/restaurant-me.controller.js';
import { RestaurantsService } from './services/restaurants.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [PrismaModule, AuditModule, UploadsModule],
  controllers: [RestaurantMeController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
