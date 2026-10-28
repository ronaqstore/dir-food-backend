import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { AppConfigurationService } from './app-configuration/app-configuration.service.js';

let cachedApp: INestApplication | null = null;

async function createApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Dir Food API')
    .setDescription(
      'Dir Food Backend API — Restaurant discovery and WhatsApp request platform for Timergara / Lower Dir, Pakistan',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (obtained from login)',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5.33.0/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5.33.0/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5.33.0/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  cachedApp = app;
  return app;
}

if (!process.env.VERCEL) {
  const app = await createApp();
  const config = app.get(AppConfigurationService);
  await app.listen(config.port);
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await createApp();
  const instance = app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;
  instance(req, res);
}
