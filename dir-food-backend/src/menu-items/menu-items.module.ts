import { Module } from '@nestjs/common';
import { MenuItemsController } from './controllers/menu-items.controller.js';
import { MenuItemsService } from './services/menu-items.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}
