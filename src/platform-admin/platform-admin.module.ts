import { Module } from '@nestjs/common';
import { PlatformAdminService } from './services/platform-admin.service.js';
import { PlatformAdminAreasService } from './services/platform-admin-areas.service.js';
import { PlatformAdminCitiesService } from './services/platform-admin-cities.service.js';
import { PlatformAdminCuisinesService } from './services/platform-admin-cuisines.service.js';
import { PlatformAdminOperationsService } from './services/platform-admin-operations.service.js';
import { PlatformAdminController } from './controllers/platform-admin.controller.js';
import { PlatformAdminAreasController } from './controllers/platform-admin-areas.controller.js';
import { PlatformAdminCitiesController } from './controllers/platform-admin-cities.controller.js';
import { PlatformAdminCuisinesController } from './controllers/platform-admin-cuisines.controller.js';
import { PlatformAdminOperationsController } from './controllers/platform-admin-operations.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    PlatformAdminService,
    PlatformAdminAreasService,
    PlatformAdminCitiesService,
    PlatformAdminCuisinesService,
    PlatformAdminOperationsService,
  ],
  controllers: [
    PlatformAdminController,
    PlatformAdminAreasController,
    PlatformAdminCitiesController,
    PlatformAdminCuisinesController,
    PlatformAdminOperationsController,
  ],
  exports: [
    PlatformAdminService,
    PlatformAdminAreasService,
    PlatformAdminCitiesService,
    PlatformAdminCuisinesService,
    PlatformAdminOperationsService,
  ],
})
export class PlatformAdminModule {}
