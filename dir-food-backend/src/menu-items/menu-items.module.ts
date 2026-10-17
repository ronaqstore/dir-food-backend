import { Module } from '@nestjs/common';
import { MenuItemsController } from './controllers/menu-items.controller.js';
import { MenuItemsService } from './services/menu-items.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
