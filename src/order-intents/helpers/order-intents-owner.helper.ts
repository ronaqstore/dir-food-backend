import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { QueryOrderIntentsDto } from '../dto/query-order-intents.dto.js';

export interface ValidatedLineItem {
  menuItemId: string;
  variantId: string | null;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  addonsSnapshot: Array<{ id: string; name: string; price: number }> | null;
  unitPrice: bigint;
  quantity: number;
  lineTotal: bigint;
  lineNo: number;
}

export interface PriceChangeDetail {
  menuItemId: string;
  variantId: string | null;
  name: string;
  unitPrice: bigint;
  quantity: number;
  lineTotal: bigint;
}

export async function handleGetOwnerOrderIntents(
  prisma: PrismaService,
  restaurantId: string,
  query: QueryOrderIntentsDto,
) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const andConditions: Prisma.OrderIntentWhereInput[] = [
    { restaurantId },
    { createdAt: { gte: thirtyDaysAgo } },
  ];

  if (query.q && query.q.trim()) {
    const q = query.q.trim();
    andConditions.push({
      OR: [
        { publicRef: { contains: q.toUpperCase() } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { deliveryAreaNameSnapshot: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  const where: Prisma.OrderIntentWhereInput = { AND: andConditions };

  const allowedSortFields = new Set([
    'createdAt',
    'subtotal',
    'status',
    'customerName',
  ]);
  let sortField = query.sortBy;
  let sortDirection: 'asc' | 'desc' =
    query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  if (query.sort) {
    const parts = query.sort.split('.');
    if (parts[0]) sortField = parts[0];
    if (
      parts[1]?.toLowerCase() === 'asc' ||
      parts[1]?.toLowerCase() === 'desc'
    ) {
      sortDirection = parts[1].toLowerCase() as 'asc' | 'desc';
    }
  }

  const orderBy: Prisma.OrderIntentOrderByWithRelationInput =
    sortField && allowedSortFields.has(sortField)
      ? { [sortField]: sortDirection }
      : { createdAt: 'desc' };

  const [total, items] = await Promise.all([
    prisma.orderIntent.count({ where }),
    prisma.orderIntent.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
      addons: Array.isArray(i.addonsSnapshot) ? i.addonsSnapshot : null,
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

  const [requestsCreated, whatsappOpened, groupedItems] = await Promise.all([
    prisma.orderIntent.count({
      where: { restaurantId, createdAt: { gte: windowStart } },
    }),
    prisma.orderIntent.count({
      where: {
        restaurantId,
        createdAt: { gte: windowStart },
        whatsappOpenedAt: { not: null },
      },
    }),
    prisma.orderIntentItem.groupBy({
      by: ['itemNameSnapshot', 'variantNameSnapshot'],
      where: {
        orderIntent: { restaurantId, createdAt: { gte: windowStart } },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    }),
  ]);

  const whatsappOpenRate =
    requestsCreated === 0
      ? 0
      : Math.round((whatsappOpened / requestsCreated) * 10000) / 100;

  const topItems = groupedItems.map((item) => ({
    name: item.variantNameSnapshot
      ? `${item.itemNameSnapshot} (${item.variantNameSnapshot})`
      : item.itemNameSnapshot,
    requestedQuantity: item._sum.quantity ?? 0,
  }));

  return {
    range: `${days}d`,
    requestsCreated,
    whatsappOpened,
    whatsappOpenRate,
    topItems,
  };
}

export async function handleGetOwnerOrderIntentDetail(
  prisma: PrismaService,
  restaurantId: string,
  id: string,
) {
  const item = await prisma.orderIntent.findUnique({
    where: {
      id_restaurantId: {
        id,
        restaurantId,
      },
    },
    include: {
      items: {
        orderBy: { lineNo: 'asc' },
      },
    },
  });

  if (!item) {
    throw new NotFoundException('Order intent not found');
  }

  return {
    id: item.id,
    reference: item.publicRef,
    status: item.status,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    deliveryArea: item.deliveryAreaNameSnapshot,
    landmark: item.landmark,
    directions: item.directions,
    mapLat: item.mapLat,
    mapLng: item.mapLng,
    subtotal: item.subtotal,
    deliveryFee: item.deliveryFee,
    deliveryFeeStatus: item.deliveryFeeStatus,
    items: item.items.map((i) => ({
      name: i.itemNameSnapshot,
      variant: i.variantNameSnapshot,
      addons: Array.isArray(i.addonsSnapshot) ? i.addonsSnapshot : null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    createdAt: item.createdAt,
    expiresAt: item.expiresAt,
    isExpired: item.expiresAt.getTime() <= Date.now(),
    whatsappOpenedAt: item.whatsappOpenedAt,
    notConfirmed: true,
  };
}
