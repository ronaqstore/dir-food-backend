import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigurationModule } from './app-configuration/app-configuration.module.js';
import { AppConfigurationService } from './app-configuration/app-configuration.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { PlatformAdminModule } from './platform-admin/platform-admin.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [AppConfigurationModule],
      inject: [AppConfigurationService],
      useFactory: (configService: AppConfigurationService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: '12h',
        },
      }),
    }),
    AppConfigurationModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    PlatformAdminModule,
    RestaurantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
  ],
})
export class AppModule {}
