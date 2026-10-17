import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AppConfigurationService } from './app-configuration/app-configuration.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigurationService);
  app.enableCors({ origin: config.corsOrigins });
  await app.listen(config.port);
}
await bootstrap();
