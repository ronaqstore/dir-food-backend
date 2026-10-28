import { Module } from '@nestjs/common';
import { MenuCategoriesController } from './controllers/menu-categories.controller.js';
import { MenuCategoriesService } from './services/menu-categories.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MenuCategoriesController],
  providers: [MenuCategoriesService],
  exports: [MenuCategoriesService],
})
export class MenuCategoriesModule {}
