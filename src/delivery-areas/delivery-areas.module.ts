import { Module } from '@nestjs/common';
import { DeliveryAreasController } from './controllers/delivery-areas.controller.js';
import { DeliveryAreasService } from './services/delivery-areas.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryAreasController],
  providers: [DeliveryAreasService],
  exports: [DeliveryAreasService],
})
export class DeliveryAreasModule {}
