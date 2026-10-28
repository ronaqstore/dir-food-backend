import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

export default defineConfig({
  // Multi-file schema: point at the DIRECTORY, not a single file, so every
  // `.prisma` under prisma/ (schema.prisma, enums.prisma, models/*.prisma) is loaded.
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
