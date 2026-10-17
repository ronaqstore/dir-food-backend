import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigurationService } from './app-configuration.service.js';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => AppConfigurationService.validate(config),
    }),
  ],
  providers: [AppConfigurationService],
  exports: [AppConfigurationService],
})
export class AppConfigurationModule {}
