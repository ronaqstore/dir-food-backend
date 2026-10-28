import { describe, it, expect, vi } from 'vitest';
import {
  seedRestaurantDefaults,
  DEFAULT_DELIVERY_FEE_PAISA,
} from './restaurant-defaults.js';

describe('restaurant-defaults utility (unit)', () => {
  it('seeds 7 days of default operating hours and connects active master areas', async () => {
    const mockTx: any = {
      restaurantHours: {
        createMany: vi.fn().mockResolvedValue({ count: 7 }),
      },
      area: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'area-1' },
          { id: 'area-2' },
        ]),
      },
      restaurantDeliveryArea: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };

    await seedRestaurantDefaults(mockTx, 'rest-123');

    expect(mockTx.restaurantHours.createMany).toHaveBeenCalledTimes(1);
    const hoursCall = mockTx.restaurantHours.createMany.mock.calls[0][0];
    expect(hoursCall.data).toHaveLength(7);
    expect(hoursCall.data[0].dayOfWeek).toBe(0);
    expect(hoursCall.data[6].dayOfWeek).toBe(6);
    expect(hoursCall.data[0].restaurantId).toBe('rest-123');
    expect(hoursCall.skipDuplicates).toBe(true);

    expect(mockTx.area.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
    });

    expect(mockTx.restaurantDeliveryArea.createMany).toHaveBeenCalledWith({
      data: [
        {
          restaurantId: 'rest-123',
          areaId: 'area-1',
          deliveryFee: DEFAULT_DELIVERY_FEE_PAISA,
          isActive: true,
        },
        {
          restaurantId: 'rest-123',
          areaId: 'area-2',
          deliveryFee: DEFAULT_DELIVERY_FEE_PAISA,
          isActive: true,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('safely handles when no active master delivery areas exist', async () => {
    const mockTx: any = {
      restaurantHours: {
        createMany: vi.fn().mockResolvedValue({ count: 7 }),
      },
      area: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      restaurantDeliveryArea: {
        createMany: vi.fn(),
      },
    };

    await seedRestaurantDefaults(mockTx, 'rest-456');

    expect(mockTx.restaurantHours.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.area.findMany).toHaveBeenCalledTimes(1);
    expect(mockTx.restaurantDeliveryArea.createMany).not.toHaveBeenCalled();
  });
});
