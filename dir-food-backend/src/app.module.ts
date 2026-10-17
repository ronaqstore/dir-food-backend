import { Module } from '@nestjs/common';
import { AppConfigurationModule } from './app-configuration/app-configuration.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [AppConfigurationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
