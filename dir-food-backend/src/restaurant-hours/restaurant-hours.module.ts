import { Module } from '@nestjs/common';
import { RestaurantHoursController } from './controllers/restaurant-hours.controller.js';
import { RestaurantHoursService } from './services/restaurant-hours.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantHoursController],
  providers: [RestaurantHoursService],
  exports: [RestaurantHoursService],
})
export class RestaurantHoursModule {}
