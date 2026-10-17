import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RestaurantStatus, ManualStatus } from '../../generated/prisma/enums.js';
import { PublicRestaurantsService } from './public-restaurants.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('PublicRestaurantsService', () => {
  let service: PublicRestaurantsService;
  let mockPrisma: {
    restaurant: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  const unexpiredDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // +10 days
  const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // -10 days

  beforeEach(() => {
    mockPrisma = {
      restaurant: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    service = new PublicRestaurantsService(mockPrisma as unknown as PrismaService);
  });

  describe('getRestaurants', () => {
    it('returns eligible active restaurants and excludes private fields', async () => {
      const mockRestaurants = [
        {
          id: 'res-1',
          slug: 'hotel-al-noor',
          name: 'Hotel Al-Noor',
          cuisines: ['Karahi', 'BBQ'],
          logoUrl: 'https://images.example.com/logo.jpg',
          minOrderAmount: 50000n,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [
            {
              dayOfWeek: new Date().getDay(),
              openTime: new Date('1970-01-01T00:00:00.000Z'),
              closeTime: new Date('1970-01-01T23:59:00.000Z'),
            },
          ],
        },
      ];

      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      const res = await service.getRestaurants({});

      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toMatchObject({
        slug: 'hotel-al-noor',
        name: 'Hotel Al-Noor',
        cuisines: ['Karahi', 'BBQ'],
        logoUrl: 'https://images.example.com/logo.jpg',
        minOrderAmount: 50000n,
        isOpenNow: true,
      });
      // Ensure private fields like id are not exposed
      expect((res.data[0] as unknown as { id?: string }).id).toBeUndefined();
      expect(res.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
      });
    });

    it('filters by cuisine case-insensitively', async () => {
      const mockRestaurants = [
        {
          id: 'res-1',
          slug: 'hotel-al-noor',
          name: 'Hotel Al-Noor',
          cuisines: ['Karahi', 'BBQ'],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [],
        },
        {
          id: 'res-2',
          slug: 'pizza-spot',
          name: 'Pizza Spot',
          cuisines: ['Fast Food', 'Pizza'],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [],
        },
      ];

      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      const res = await service.getRestaurants({ cuisine: 'karahi' });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].slug).toBe('hotel-al-noor');
    });

    it('filters by openNow and sorts open restaurants first', async () => {
      const mockRestaurants = [
        {
          id: 'res-closed',
          slug: 'closed-spot',
          name: 'Closed Spot',
          cuisines: ['BBQ'],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.CLOSED,
          unavailableNote: null,
          hours: [],
        },
        {
          id: 'res-open',
          slug: 'open-spot',
          name: 'Open Spot',
          cuisines: ['BBQ'],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [
            {
              dayOfWeek: new Date().getDay(),
              openTime: new Date('1970-01-01T00:00:00.000Z'),
              closeTime: new Date('1970-01-01T23:59:00.000Z'),
            },
          ],
        },
      ];

      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      // Without openNow filter, open restaurants are sorted first
      const allRes = await service.getRestaurants({});
      expect(allRes.data).toHaveLength(2);
      expect(allRes.data[0].slug).toBe('open-spot');
      expect(allRes.data[1].slug).toBe('closed-spot');

      // With openNow filter, closed restaurants are excluded
      const openRes = await service.getRestaurants({ openNow: true });
      expect(openRes.data).toHaveLength(1);
      expect(openRes.data[0].slug).toBe('open-spot');
    });

    it('paginates results', async () => {
      const mockRestaurants = [
        {
          id: 'res-1',
          slug: 'res-1',
          name: 'Res 1',
          cuisines: [],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [],
        },
        {
          id: 'res-2',
          slug: 'res-2',
          name: 'Res 2',
          cuisines: [],
          logoUrl: null,
          minOrderAmount: null,
          manualStatus: ManualStatus.AUTO,
          unavailableNote: null,
          hours: [],
        },
      ];

      mockPrisma.restaurant.findMany.mockResolvedValue(mockRestaurants);

      const res = await service.getRestaurants({ page: 2, limit: 1 });
      expect(res.data).toHaveLength(1);
      expect(res.meta).toEqual({
        page: 2,
        limit: 1,
        total: 2,
      });
    });
  });

  describe('getRestaurantBySlug', () => {
    it('returns public restaurant profile with todayHours and active delivery areas', async () => {
      const mockData = {
        id: 'res-1',
        slug: 'hotel-al-noor',
        name: 'Hotel Al-Noor',
        description: 'Traditional restaurant',
        cuisines: ['Karahi', 'BBQ'],
        logoUrl: 'https://images.example.com/logo.jpg',
        coverUrl: 'https://images.example.com/cover.jpg',
        contactPhone: '923001234567',
        whatsappNumber: '923007654321',
        addressText: 'Main Bazaar',
        minOrderAmount: 50000n,
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: unexpiredDate,
        manualStatus: ManualStatus.AUTO,
        unavailableNote: null,
        hours: [
          {
            dayOfWeek: new Date().getDay(),
            openTime: new Date('1970-01-01T11:00:00.000Z'),
            closeTime: new Date('1970-01-01T23:00:00.000Z'),
          },
        ],
        deliveryAreas: [
          {
            deliveryFee: 15000n,
            area: {
              id: 'area-1',
              name: 'Timergara City',
              sortOrder: 1,
            },
          },
        ],
      };

      mockPrisma.restaurant.findUnique.mockResolvedValue(mockData);

      const res = await service.getRestaurantBySlug('hotel-al-noor');

      expect(res.slug).toBe('hotel-al-noor');
      expect(res.name).toBe('Hotel Al-Noor');
      expect(res.whatsappNumber).toBe('923007654321');
      expect(res.todayHours).toHaveLength(1);
      expect(res.deliveryAreas).toEqual([
        {
          areaId: 'area-1',
          name: 'Timergara City',
          deliveryFee: 15000n,
        },
      ]);
      expect((res as unknown as { id?: string }).id).toBeUndefined();
    });

    it('throws 404 RESTAURANT_NOT_AVAILABLE if restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getRestaurantBySlug('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 RESTAURANT_NOT_AVAILABLE if restaurant is PENDING', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-pending',
        slug: 'pending-res',
        status: RestaurantStatus.PENDING,
        subscriptionEndsAt: unexpiredDate,
      });

      await expect(service.getRestaurantBySlug('pending-res')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 RESTAURANT_NOT_AVAILABLE if restaurant subscription is expired', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue({
        id: 'res-expired',
        slug: 'expired-res',
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: expiredDate,
      });

      await expect(service.getRestaurantBySlug('expired-res')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRestaurantMenu', () => {
    it('returns active categories, active items, and active variants only', async () => {
      const mockData = {
        id: 'res-1',
        status: RestaurantStatus.ACTIVE,
        subscriptionEndsAt: unexpiredDate,
        categories: [
          {
            id: 'cat-1',
            name: 'Karahi',
            items: [
              {
                id: 'item-1',
                name: 'Chicken Karahi',
                description: 'Desi style',
                imageUrl: 'https://images.example.com/item.jpg',
                basePrice: null,
                isAvailable: true,
                variants: [
                  {
                    id: 'var-1',
                    name: 'Half',
                    price: 60000n,
                  },
                  {
                    id: 'var-2',
                    name: 'Full',
                    price: 120000n,
                  },
                ],
              },
              {
                id: 'item-2',
                name: 'Naan',
                description: null,
                imageUrl: null,
                basePrice: 3000n,
                isAvailable: false,
                variants: [],
              },
            ],
          },
        ],
      };

      mockPrisma.restaurant.findUnique.mockResolvedValue(mockData);

      const res = await service.getRestaurantMenu('hotel-al-noor');

      expect(res.categories).toHaveLength(1);
      expect(res.categories[0].name).toBe('Karahi');
      expect(res.categories[0].items).toHaveLength(2);
      expect(res.categories[0].items[0].variants).toHaveLength(2);
      expect(res.categories[0].items[1].isAvailable).toBe(false);
      expect(res.categories[0].items[1].price).toBe(3000n);
    });

    it('throws 404 RESTAURANT_NOT_AVAILABLE if restaurant is expired or missing', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getRestaurantMenu('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

