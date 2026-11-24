import type { Prisma } from '../../generated/prisma/client.js';
import { timeStringToDate } from '../../restaurant-hours/utils/opening-hours.util.js';

export const DEFAULT_OPEN_TIME = '10:00';
export const DEFAULT_CLOSE_TIME = '23:00';
export const DEFAULT_DELIVERY_FEE_PAISA = 0n;
export const DEFAULT_MIN_ORDER_AMOUNT_PAISA: bigint | null = null;

export async function seedRestaurantDefaults(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  cityId?: string | null,
): Promise<void> {
  const defaultHours = [];
  for (let day = 0; day <= 6; day++) {
    defaultHours.push({
      restaurantId,
      dayOfWeek: day,
      openTime: timeStringToDate(DEFAULT_OPEN_TIME),
      closeTime: timeStringToDate(DEFAULT_CLOSE_TIME),
    });
  }

  await tx.restaurantHours.createMany({
    data: defaultHours,
    skipDuplicates: true,
  });

  const activeAreas = await tx.area.findMany({
    where: {
      isActive: true,
      ...(cityId ? { cityId } : {}),
    },
    select: { id: true },
  });

  if (activeAreas.length > 0) {
    await tx.restaurantDeliveryArea.createMany({
      data: activeAreas.map((area) => ({
        restaurantId,
        areaId: area.id,
        deliveryFee: DEFAULT_DELIVERY_FEE_PAISA,
        minOrderAmount: DEFAULT_MIN_ORDER_AMOUNT_PAISA,
        isActive: false,
      })),
      skipDuplicates: true,
    });
  }
}
