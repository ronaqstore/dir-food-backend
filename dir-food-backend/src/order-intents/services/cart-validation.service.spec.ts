import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartValidationService } from './cart-validation.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RestaurantStatus, ManualStatus } from '../../generated/prisma/enums.js';
import { NotFoundException } from '@nestjs/common';

describe('CartValidationService', () => {
  let service: CartValidationService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      menuItem: {
        findMany: vi.fn(),
      },
      restaurantDeliveryArea: {
        findUnique: vi.fn(),
      },
    };
    service = new CartValidationService(prisma as unknown as PrismaService);
  });

  it('throws 404 RESTAURANT_NOT_AVAILABLE if restaurant is missing or subscription expired', async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null);

    await expect(
      service.validateCart('non-existent', [{ menuItemId: 'item-1', quantity: 1 }]),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates cart items with base price and variant prices', async () => {
    const futureDate = new Date(Date.now() + 10 * 86400000);
    prisma.restaurant.findUnique.mockResolvedValue({
      id: 'rest-1',
      name: 'Al Noor',
      slug: 'al-noor',
      status: RestaurantStatus.ACTIVE,
      subscriptionEndsAt: futureDate,
      manualStatus: ManualStatus.AUTO,
      unavailableNote: null,
      whatsappNumber: '03001234567',
      minOrderAmount: 50000n,
      hours: [],
    });

    prisma.menuItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        restaurantId: 'rest-1',
        name: 'Naan',
        basePrice: 3000n,
        isAvailable: true,
        isActive: true,
        variants: [],
      },
      {
        id: 'item-2',
        restaurantId: 'rest-1',
        name: 'Karahi',
        basePrice: null,
        isAvailable: true,
        isActive: true,
        variants: [
          {
            id: 'var-1',
            name: 'Full',
            price: 120000n,
            isActive: true,
          },
        ],
      },
    ]);

    const result = await service.validateCart('al-noor', [
      { menuItemId: 'item-1', quantity: 2 },
      { menuItemId: 'item-2', variantId: 'var-1', quantity: 1 },
    ]);

    expect(result.subtotal).toBe(6000n + 120000n);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].name).toBe('Naan');
    expect(result.lines[0].lineTotal).toBe(6000n);
    expect(result.lines[1].variantName).toBe('Full');
    expect(result.problems).toHaveLength(0);
  });

  it('records problems for out-of-stock items or missing required variants', async () => {
    const futureDate = new Date(Date.now() + 10 * 86400000);
    prisma.restaurant.findUnique.mockResolvedValue({
      id: 'rest-1',
      name: 'Al Noor',
      slug: 'al-noor',
      status: RestaurantStatus.ACTIVE,
      subscriptionEndsAt: futureDate,
      manualStatus: ManualStatus.AUTO,
      hours: [],
    });

    prisma.menuItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        restaurantId: 'rest-1',
        name: 'Cold Drink',
        basePrice: 10000n,
        isAvailable: false, // out of stock
        isActive: true,
        variants: [],
      },
      {
        id: 'item-2',
        restaurantId: 'rest-1',
        name: 'Pizza',
        basePrice: null,
        isAvailable: true,
        isActive: true,
        variants: [
          { id: 'var-1', name: 'Large', price: 150000n, isActive: true },
        ],
      },
    ]);

    const result = await service.validateCart('al-noor', [
      { menuItemId: 'item-1', quantity: 1 },
      { menuItemId: 'item-2', quantity: 1 }, // missing variantId!
    ]);

    expect(result.problems).toContain("Item 'Cold Drink' is currently out of stock");
    expect(result.problems).toContain("Variant is required for 'Pizza'");
  });
});

