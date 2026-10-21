import type { Prisma } from '../../generated/prisma/client.js';
import { timeStringToDate } from '../../restaurant-hours/utils/opening-hours.util.js';

export const DEFAULT_OPEN_TIME = '10:00';
export const DEFAULT_CLOSE_TIME = '23:00';
export const DEFAULT_DELIVERY_FEE_PAISA = 5000n; // Rs 50 = 5000 paisa

/**
 * Seeds smart defaults for a newly registered or admin-created restaurant:
 * 1. 7 days of standard operating hours (Sunday=0 to Saturday=6, 10:00 to 23:00).
 * 2. Links to all active master delivery areas (e.g. Timergara) with standard delivery fee (Rs 50).
 */
export async function seedRestaurantDefaults(
  tx: Prisma.TransactionClient,
  restaurantId: string,
): Promise<void> {
  // 1. 7 days of operating hours (Sunday = 0 to Saturday = 6)
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

  // 2. Link all active master delivery areas
  const activeAreas = await tx.area.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeAreas.length > 0) {
    await tx.restaurantDeliveryArea.createMany({
      data: activeAreas.map((area) => ({
        restaurantId,
        areaId: area.id,
        deliveryFee: DEFAULT_DELIVERY_FEE_PAISA,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  }
}

