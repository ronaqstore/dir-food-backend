import { Module } from '@nestjs/common';
import { RestaurantMeController } from './restaurant-me.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantMeController],
})
export class RestaurantsModule {}
