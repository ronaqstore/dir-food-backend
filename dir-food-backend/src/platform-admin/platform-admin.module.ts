import { Module } from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service.js';
import { PlatformAdminController } from './platform-admin.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [PlatformAdminService],
  controllers: [PlatformAdminController],
  exports: [PlatformAdminService],
})
export class PlatformAdminModule {}
