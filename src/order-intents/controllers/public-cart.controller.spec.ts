import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicCartController } from './public-cart.controller.js';
import { CartValidationService } from '../services/cart-validation.service.js';

describe('PublicCartController', () => {
  let controller: PublicCartController;
  let cartValidationService: any;

  beforeEach(() => {
    cartValidationService = {
      validateCart: vi.fn(),
    };
    controller = new PublicCartController(
      cartValidationService as CartValidationService,
    );
  });

  it('delegates validation to cartValidationService', async () => {
    cartValidationService.validateCart.mockResolvedValue({
      lines: [],
      subtotal: 1000n,
    });

    const res = await controller.validateCart({
      restaurantSlug: 'hotel-al-noor',
      items: [{ menuItemId: 'item-1', quantity: 2 }],
      deliveryAreaId: 'area-1',
    });

    expect(cartValidationService.validateCart).toHaveBeenCalledWith(
      'hotel-al-noor',
      [{ menuItemId: 'item-1', quantity: 2 }],
      'area-1',
    );
    expect(res).toEqual({ lines: [], subtotal: 1000n });
  });
});

