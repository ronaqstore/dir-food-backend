import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfigurationService } from './app-configuration/app-configuration.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigurationService);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.listen(config.port);
}
await bootstrap();
