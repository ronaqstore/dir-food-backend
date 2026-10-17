import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RestaurantOrderIntentsController } from './restaurant-order-intents.controller.js';
import { OrderIntentsService } from '../services/order-intents.service.js';
import { UserRole } from '../../generated/prisma/enums.js';

describe('RestaurantOrderIntentsController', () => {
  let controller: RestaurantOrderIntentsController;
  let service: any;

  beforeEach(() => {
    service = {
      getOwnerOrderIntents: vi.fn(),
      getOwnerOrderIntentDetail: vi.fn(),
      getOwnerStats: vi.fn(),
    };
    controller = new RestaurantOrderIntentsController(
      service as OrderIntentsService,
    );
  });

  const mockUser = {
    userId: 'user-1',
    role: UserRole.RESTAURANT_OWNER,
    restaurantId: 'rest-1',
  };

  it('delegates getOrderIntents with user.restaurantId', async () => {
    service.getOwnerOrderIntents.mockResolvedValue({ data: [], meta: { total: 0 } });

    const query: any = { page: 1, limit: 20 };
    const res = await controller.getOrderIntents(mockUser, query);

    expect(service.getOwnerOrderIntents).toHaveBeenCalledWith('rest-1', query);
    expect(res).toEqual({ data: [], meta: { total: 0 } });
  });

  it('delegates getOrderIntentDetail with user.restaurantId and id', async () => {
    service.getOwnerOrderIntentDetail.mockResolvedValue({ id: 'intent-1' });

    const res = await controller.getOrderIntentDetail(mockUser, 'intent-1');

    expect(service.getOwnerOrderIntentDetail).toHaveBeenCalledWith('rest-1', 'intent-1');
    expect(res).toEqual({ id: 'intent-1' });
  });

  it('delegates getStats with user.restaurantId and range', async () => {
    service.getOwnerStats.mockResolvedValue({ range: '7d', requestsCreated: 10 });

    const res = await controller.getStats(mockUser, { range: '7d' });

    expect(service.getOwnerStats).toHaveBeenCalledWith('rest-1', '7d');
    expect(res).toEqual({ range: '7d', requestsCreated: 10 });
  });
});

