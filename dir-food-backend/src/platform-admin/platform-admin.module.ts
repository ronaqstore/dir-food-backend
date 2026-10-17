import { Module } from '@nestjs/common';
import { PlatformAdminService } from './services/platform-admin.service.js';
import { PlatformAdminAreasService } from './services/platform-admin-areas.service.js';
import { PlatformAdminOperationsService } from './services/platform-admin-operations.service.js';
import { PlatformAdminController } from './controllers/platform-admin.controller.js';
import { PlatformAdminAreasController } from './controllers/platform-admin-areas.controller.js';
import { PlatformAdminOperationsController } from './controllers/platform-admin-operations.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    PlatformAdminService,
    PlatformAdminAreasService,
    PlatformAdminOperationsService,
  ],
  controllers: [
    PlatformAdminController,
    PlatformAdminAreasController,
    PlatformAdminOperationsController,
  ],
  exports: [
    PlatformAdminService,
    PlatformAdminAreasService,
    PlatformAdminOperationsService,
  ],
})
export class PlatformAdminModule {}
