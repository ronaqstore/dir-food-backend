import path from 'node:path';
try {
  delete (path as any).__esModule;
} catch {}
try {
  Object.defineProperty(path, 'default', {
    value: path,
    configurable: true,
    enumerable: true,
    writable: true,
  });
} catch {}

import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';

loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: dbUrl,
    connectionTimeoutMillis: 15_000,
  });
  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}
