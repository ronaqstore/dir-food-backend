# 🚀 Deploying NestJS + Prisma + Swagger to Vercel (Reference Guide)

This guide explains the exact issues that occur when deploying a **NestJS + Prisma + Swagger** backend to **Vercel** and how to configure the project so it works both locally and on Vercel Serverless.

---

## 1. Vercel Project Settings

- **Application Preset:** Select **`NestJS`** (or **`Other`**).  
  > ⚠️ **Never select `Vite`:** If your backend has `vitest` installed in `devDependencies`, Vercel may mistakenly auto-detect `Vite`. Selecting `Vite` treats the backend as a static frontend SPA and breaks routing.
- **Root Directory:** Set to your backend directory (e.g., `dir-food-backend`).

---

## 2. Issue #1: Build Fails with Missing Prisma Types (`TS2307` / `TS2339`)

### Why it happens:
- Prisma generates TypeScript models and enums into `src/generated/prisma/`.
- Because `src/generated/` is listed in `.gitignore`, those files are not pushed to GitHub.
- When Vercel clones the repository and runs `"build": "nest build"`, the `src/generated/prisma` folder does not exist yet, causing hundreds of TypeScript errors.

### How to fix (`package.json`):
Always run `prisma generate` before `nest build` in [`package.json`](../dir-food-backend/package.json):

```json
{
  "scripts": {
    "build": "prisma generate && nest build"
  }
}
```

---

## 3. Issue #2: `500 INTERNAL_FUNCTION_INVOCATION_FAILED` (60-Second Timeout)

### Why it happens:
- **Locally:** NestJS runs as a persistent Node.js server listening on a TCP port (`await app.listen(4000)`).
- **On Vercel:** Vercel uses **Serverless Functions** instead of a persistent port listener. When a request arrives, Vercel imports your entry file (`src/main.ts`) and looks for an exported default handler (`export default async function handler(req, res)`).
- If `src/main.ts` only calls `await app.listen(config.port)` inside a top-level `await bootstrap()`, NestJS sits listening on port `4000` while Vercel waits 60 seconds for a `default` handler to finish the HTTP response—and then kills the function at the 60s timeout.

### How to fix (`src/main.ts`):
Export a `default` `(req, res)` handler for Vercel, and only call `app.listen()` when `!process.env.VERCEL`.

---

## 4. Issue #3: Swagger UI (`/api/docs`) Shows a Blank White Screen

### Why it happens:
- `@nestjs/swagger` normally serves `swagger-ui.css`, `swagger-ui-bundle.js`, and `swagger-ui-standalone-preset.js` from `node_modules/swagger-ui-dist`.
- Vercel's serverless bundler skips static `.css` and `.js` assets inside `node_modules`, so `/api/docs/swagger-ui-bundle.js` returns `404 Not Found` and the browser shows a blank white page.

### How to fix (`src/main.ts`):
Pass `customCssUrl` and `customJs` pointing to the official `unpkg.com/swagger-ui-dist` CDN inside `SwaggerModule.setup()`.

---

## 5. Complete Production-Ready `src/main.ts` Template

```typescript
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

// Local development: start TCP listener on configured port
if (!process.env.VERCEL) {
  const app = await createApp();
  const config = app.get(AppConfigurationService);
  await app.listen(config.port);
}

// Vercel Serverless: pass incoming (req, res) to cached Express instance
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
```

---

## 6. Vercel Environment Variables Checklist

### ✅ Variables to ADD in Vercel:

| Variable | Example / Recommended Value | Notes |
| :--- | :--- | :--- |
| **`DATABASE_URL`** | `postgresql://user:pass@ep-xyz-pooler.aws.neon.tech/neondb?sslmode=require` | Must include `?sslmode=require`. Do **not** wrap in quotes `"..."`. |
| **`NODE_ENV`** | `production` | Enables production security checks and secure cookies. |
| **`JWT_SECRET`** | `your_strong_secret_key_min_16_chars` | Minimum 16 characters required by validation. |
| **`CORS_ORIGINS`** | `https://your-web.vercel.app,https://your-admin.vercel.app,http://localhost:3000` | Comma-separated exact URLs. **Never use `*` in production.** |
| **`APP_BASE_URL`** | `https://your-web.vercel.app` | Frontend base URL used for setup links. |
| **`R2_STORAGE_ENABLED`** | `true` (or `false`) | If `true`, also set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL_BASE`. |

### ❌ Variables to AVOID in Vercel:
- **`CORS_ORIGINS=*`** — Crashes startup validation when `NODE_ENV=production`.
- **`PORT`** — Vercel manages routing automatically.
- **`SEED_ADMIN_*` / `SEED_OWNER_*`** — Local development seeding only.

