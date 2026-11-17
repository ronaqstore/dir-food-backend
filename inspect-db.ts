import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const p = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const users = await p.user.findMany({ select: { id: true, name: true, phone: true, role: true } });
    const restaurants = await p.restaurant.findMany({ select: { id: true, name: true } });
    const orderIntents = await p.orderIntent.count();
    const menuItems = await p.menuItem.count();
    const categories = await p.menuCategory.count();
    const cuisines = await p.cuisine.count();
    const cities = await p.city.count();
    const areas = await p.area.count();
    const auditLogs = await p.auditLog.count();

    console.log({
      users,
      restaurants,
      orderIntents,
      menuItems,
      categories,
      cuisines,
      cities,
      areas,
      auditLogs,
    });
  } finally {
    await p.$disconnect();
    await pool.end();
  }
}

main();
