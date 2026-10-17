import { Module } from '@nestjs/common';
import { RestaurantMeController } from './controllers/restaurant-me.controller.js';
import { RestaurantsService } from './services/restaurants.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [RestaurantMeController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
