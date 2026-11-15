import { describe, it, expect } from 'vitest';
import {
  filterRestaurantsByCuisine,
  buildRestaurantCard,
  sortRestaurantCards,
  transformPublicMenuCategories,
} from './public-catalog.helper.js';

describe('public-catalog.helper', () => {
  const dummyRestaurant = {
    id: 'res-1',
    slug: 'burger-haven',
    name: 'Burger Haven',
    cuisines: ['Fast Food'],
    logoUrl: null,
    minOrderAmount: 50000n,
    manualStatus: 'AUTO',
    unavailableNote: null,
    hours: [
      {
        dayOfWeek: new Date().getDay(),
        openTime: new Date('1970-01-01T00:00:00.000Z'),
        closeTime: new Date('1970-01-01T23:59:00.000Z'),
      },
    ],
    categories: [{ name: 'Burgers' }],
    items: [{ name: 'Zinger burger' }],
  };

  it('filters restaurants by cuisine in cuisines array', () => {
    const list = [dummyRestaurant];
    const filtered = filterRestaurantsByCuisine(list, 'fast-food');
    expect(filtered).toHaveLength(1);
  });

  it('filters restaurants by cuisine in category names', () => {
    const list = [dummyRestaurant];
    const filtered = filterRestaurantsByCuisine(list, 'burgers');
    expect(filtered).toHaveLength(1);
  });

  it('filters restaurants by item name matching cuisine keyword', () => {
    const list = [
      {
        ...dummyRestaurant,
        cuisines: [],
        categories: [],
      },
    ];
    const filtered = filterRestaurantsByCuisine(list, 'burger');
    expect(filtered).toHaveLength(1);
  });

  it('returns empty array when cuisine does not match', () => {
    const list = [dummyRestaurant];
    const filtered = filterRestaurantsByCuisine(list, 'Biryani');
    expect(filtered).toHaveLength(0);
  });

  it('builds restaurant card with active categories fallback for empty cuisines', () => {
    const card = buildRestaurantCard(
      {
        ...dummyRestaurant,
        cuisines: [],
      },
      new Date(),
    );
    expect(card.cuisines).toEqual(['Burgers']);
    expect(card.name).toBe('Burger Haven');
    expect(card.isOpenNow).toBe(true);
  });

  it('sorts restaurant cards correctly by name and min order', () => {
    const cardA = {
      slug: 'a',
      name: 'Alpha',
      cuisines: [],
      logoUrl: null,
      minOrderAmount: 1000n,
      isOpenNow: true,
      availabilityText: 'Open',
      nextOpenAt: null,
    };
    const cardB = {
      slug: 'b',
      name: 'Beta',
      cuisines: [],
      logoUrl: null,
      minOrderAmount: 2000n,
      isOpenNow: true,
      availabilityText: 'Open',
      nextOpenAt: null,
    };

    const sortedDesc = sortRestaurantCards([cardA, cardB], 'name_desc');
    expect(sortedDesc[0].name).toBe('Beta');

    const sortedMinDesc = sortRestaurantCards([cardA, cardB], 'min_order_desc');
    expect(sortedMinDesc[0].name).toBe('Beta');
  });

  it('transforms public menu categories properly', () => {
    const transformed = transformPublicMenuCategories([
      {
        id: 'cat-1',
        name: 'Fast Food',
        items: [
          {
            id: 'item-1',
            name: 'Zinger',
            description: 'Crispy',
            imageUrl: null,
            basePrice: 50000n,
            originalPrice: null,
            isDeal: false,
            isAvailable: true,
            variants: [],
            addons: [],
          },
        ],
      },
    ]);
    expect(transformed).toHaveLength(1);
    expect(transformed[0].items[0].price).toBe(50000n);
  });
});

