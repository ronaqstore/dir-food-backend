import { isRestaurantOpenNow } from '../../restaurant-hours/utils/opening-hours.util.js';
import type { ManualStatus } from '../../generated/prisma/enums.js';
import type {
  PublicMenuCategory,
  PublicRestaurantCard,
} from '../services/public-restaurants.service.js';

export interface RawRestaurantForCard {
  id: string;
  slug: string;
  name: string;
  cuisines: string[];
  logoUrl: string | null;
  minOrderAmount: bigint | null;
  manualStatus: ManualStatus;
  unavailableNote: string | null;
  hours: Array<{
    dayOfWeek: number;
    openTime: Date;
    closeTime: Date;
  }>;
  categories?: Array<{ name: string }>;
  items?: Array<{ name: string; isDeal?: boolean }>;
}

export function filterRestaurantsByCuisine<T extends RawRestaurantForCard>(
  restaurants: T[],
  cuisineQuery?: string,
): T[] {
  if (!cuisineQuery || !cuisineQuery.trim()) {
    return restaurants;
  }

  const targetCuisine = cuisineQuery.trim().toLowerCase().replace(/[-_]/g, ' ');
  const singleTarget = targetCuisine.replace(/s$/, '');

  return restaurants.filter((r) => {
    const cuisinesList = r.cuisines ?? [];
    const inCuisines = cuisinesList.some((c) => {
      const norm = c.toLowerCase().replace(/[-_]/g, ' ');
      return (
        norm === targetCuisine ||
        norm.includes(targetCuisine) ||
        targetCuisine.includes(norm)
      );
    });
    if (inCuisines) return true;

    const categoriesList = r.categories ?? [];
    const inCategories = categoriesList.some((cat) => {
      const norm = cat.name.toLowerCase().replace(/[-_]/g, ' ');
      return (
        norm === targetCuisine ||
        norm.includes(targetCuisine) ||
        targetCuisine.includes(norm)
      );
    });
    if (inCategories) return true;

    const itemsList = r.items ?? [];
    if (targetCuisine === 'deals' || targetCuisine === 'deal') {
      const hasDealItem = itemsList.some(
        (item) => item.isDeal || item.name.toLowerCase().includes('deal'),
      );
      if (hasDealItem) return true;
    }

    if (singleTarget.length >= 3) {
      const inItems = itemsList.some((item) =>
        item.name.toLowerCase().includes(singleTarget),
      );
      if (inItems) return true;
    }

    return false;
  });
}

export function buildRestaurantCard(
  r: RawRestaurantForCard,
  now: Date,
): PublicRestaurantCard {
  const openStatus = isRestaurantOpenNow(
    r.hours,
    r.manualStatus,
    r.unavailableNote,
    now,
  );
  const activeCategoryNames = (r.categories ?? []).map((c) => c.name);
  const cuisinesList = r.cuisines ?? [];
  const combinedCuisines = (
    cuisinesList.length > 0 ? cuisinesList : activeCategoryNames
  ).slice(0, 5);

  const hasDeals =
    (r.items ?? []).some(
      (item) => item.isDeal || item.name.toLowerCase().includes('deal'),
    ) ||
    (r.categories ?? []).some((c) => c.name.toLowerCase().includes('deal'));

  return {
    slug: r.slug,
    name: r.name,
    cuisines: combinedCuisines,
    logoUrl: r.logoUrl,
    minOrderAmount: r.minOrderAmount,
    isOpenNow: openStatus.isOpenNow,
    availabilityText: openStatus.availabilityText,
    nextOpenAt: openStatus.nextOpenAt,
    hasDeals,
  };
}

export function sortRestaurantCards(
  cards: PublicRestaurantCard[],
  sortBy?: string,
): PublicRestaurantCard[] {
  const sorted = [...cards];

  if (sortBy === 'name_asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name_desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'min_order_asc') {
    sorted.sort((a, b) => {
      const aMin = a.minOrderAmount ?? 0n;
      const bMin = b.minOrderAmount ?? 0n;
      return aMin < bMin ? -1 : aMin > bMin ? 1 : 0;
    });
  } else if (sortBy === 'min_order_desc') {
    sorted.sort((a, b) => {
      const aMin = a.minOrderAmount ?? 0n;
      const bMin = b.minOrderAmount ?? 0n;
      return aMin > bMin ? -1 : aMin < bMin ? 1 : 0;
    });
  } else {
    sorted.sort((a, b) => {
      if (a.isOpenNow === b.isOpenNow) return a.name.localeCompare(b.name);
      return a.isOpenNow ? -1 : 1;
    });
  }

  return sorted;
}

export interface RawCategoryMenuInput {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    basePrice: bigint | null;
    originalPrice: bigint | null;
    isDeal: boolean;
    isAvailable: boolean;
    variants: Array<{ id: string; name: string; price: bigint }>;
    addons: Array<{ id: string; name: string; price: bigint }>;
  }>;
}

export function transformPublicMenuCategories(
  categories: RawCategoryMenuInput[],
): PublicMenuCategory[] {
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
      price: i.basePrice,
      basePrice: i.basePrice,
      originalPrice: i.originalPrice,
      isDeal: i.isDeal,
      isAvailable: i.isAvailable,
      variants: i.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      addons: i.addons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
      })),
    })),
  }));
}
