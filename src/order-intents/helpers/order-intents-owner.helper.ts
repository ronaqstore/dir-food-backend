import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { QueryOrderIntentsDto } from '../dto/query-order-intents.dto.js';

export async function handleGetOwnerOrderIntents(
  prisma: PrismaService,
  restaurantId: string,
  query: QueryOrderIntentsDto,
) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const where: Prisma.OrderIntentWhereInput = {
    restaurantId,
    createdAt: { gte: thirtyDaysAgo },
  };

  if (query.q && query.q.trim()) {
    where.publicRef = {
      contains: query.q.trim().toUpperCase(),
    };
  }

  if (query.status) {
    where.status = query.status;
  }

  const [total, items] = await Promise.all([
    prisma.orderIntent.count({ where }),
    prisma.orderIntent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { lineNo: 'asc' },
        },
      },
    }),
  ]);

  const formatted = items.map((item) => ({
    id: item.id,
    reference: item.publicRef,
    status: item.status,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    deliveryArea: item.deliveryAreaNameSnapshot,
    landmark: item.landmark,
    directions: item.directions,
    subtotal: item.subtotal,
    deliveryFee: item.deliveryFee,
    deliveryFeeStatus: item.deliveryFeeStatus,
    items: item.items.map((i) => ({
      name: i.itemNameSnapshot,
      variant: i.variantNameSnapshot,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    isExpired: item.expiresAt.getTime() <= Date.now(),
    whatsappOpenedAt: item.whatsappOpenedAt,
    notConfirmed: true,
  }));

  return {
    data: formatted,
    meta: {
      page,
      limit,
      total,
    },
  };
}

export async function handleGetOwnerStats(
  prisma: PrismaService,
  restaurantId: string,
  range = '7d',
) {
  const days = range === '30d' ? 30 : 7;
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const intents = await prisma.orderIntent.findMany({
    where: {
      restaurantId,
      createdAt: { gte: windowStart },
    },
    include: {
      items: true,
    },
  });

  const requestsCreated = intents.length;
  const whatsappOpened = intents.filter(
    (i) => i.whatsappOpenedAt !== null,
  ).length;
  const whatsappOpenRate =
    requestsCreated === 0
      ? 0
      : Math.round((whatsappOpened / requestsCreated) * 10000) / 100;

  const itemCounts = new Map<string, number>();
  for (const intent of intents) {
    for (const item of intent.items) {
      const key = item.variantNameSnapshot
        ? `${item.itemNameSnapshot} (${item.variantNameSnapshot})`
        : item.itemNameSnapshot;
      itemCounts.set(key, (itemCounts.get(key) || 0) + item.quantity);
    }
  }

  const topItems = Array.from(itemCounts.entries())
    .map(([name, requestedQuantity]) => ({ name, requestedQuantity }))
    .sort((a, b) => b.requestedQuantity - a.requestedQuantity)
    .slice(0, 10);

  return {
    range: `${days}d`,
    requestsCreated,
    whatsappOpened,
    whatsappOpenRate,
    topItems,
  };
}
