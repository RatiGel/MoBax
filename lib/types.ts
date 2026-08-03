/**
 * Canonical storefront data types.
 *
 * These live apart from both lib/mock-data.ts (seed fixtures) and models/*.ts
 * (Mongoose documents) so the storefront components depend on neither. The DB
 * is the runtime source; the fixtures only seed it.
 */

export type CategorySlug =
  // ── parents ──
  | 'most-popular'
  | 'phone-protection'
  | 'chargers'
  | 'headphones-speakers'
  | 'car-accessories'
  | 'computer-accessories'
  | 'original'
  // ── phone-protection ──
  | 'screen-shields'
  | 'phone-cases'
  // ── chargers ──
  | 'adapters'
  | 'cables'
  | 'charger-complect'
  // ── headphones-speakers ──
  | 'wireless-headphones'
  | 'wired-headphones'
  | 'bluetooth-speakers'
  | 'aux-converters'
  // ── car-accessories ──
  | 'phone-holders'
  | 'modulators'
  | 'car-chargers'
  // ── computer-accessories ──
  | 'keyboards'
  | 'mouse'
  | 'usb-flash-drives'
  // ── original ──
  | 'apple'
  | 'samsung'
  | 'google';

export interface Category {
  id: string;
  slug: CategorySlug;
  nameEn: string;
  nameKa: string;
  icon: string;
  image: string;
  parentSlug?: CategorySlug;
}

export interface Product {
  id: string;
  slug: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  price: number;
  originalPrice?: number;
  /** Active sale price. Set => the product is discounted. See lib/catalog.ts. */
  salePrice?: number;
  category: CategorySlug;
  brand: string;
  images: string[];
  inStock: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  rating: number;
  reviewCount: number;
  specs: Record<string, string>;
  sku: string;
}

/**
 * `device` brands are phone makers — selecting one returns products made by
 * the brand AND third-party accessories compatible with its devices.
 * `maker` brands are accessory manufacturers — match on the product's brand only.
 */
export interface Brand {
  slug: string;
  name: string;
  type: 'device' | 'maker';
  /** Extra terms (besides `name`) to look for in specs.Compatibility. */
  compatTerms?: string[];
}

export interface ProductFilter {
  category?: CategorySlug;
  brand?: string;
  featured?: boolean;
  isNew?: boolean;
  onSale?: boolean;
  limit?: number;
}
