/**
 * Mongoose document → storefront type mappers.
 *
 * Kept pure and DB-free so the mapping (the part of the cutover most likely to
 * silently corrupt data) is unit-testable. lib/catalog.ts does the querying and
 * calls these; nothing else should map documents by hand.
 */

import type { Product, Category, Brand, CategorySlug } from './types';

type SpecSource = Map<string, string> | Record<string, string> | undefined;

interface LeanProduct {
  _id: string;
  slug: string;
  nameEn: string; nameKa: string;
  descriptionEn?: string; descriptionKa?: string;
  price: number;
  originalPrice?: number;
  salePrice?: number;
  salePriceStart?: Date; salePriceEnd?: Date;
  sku: string;
  stock?: number;
  categorySlug: string;
  brand: string;
  images?: string[];
  isFeatured?: boolean;
  isNewProduct?: boolean;
  rating?: number;
  reviewCount?: number;
  specs?: SpecSource;
}

interface LeanCategory {
  _id: unknown;
  slug: string;
  nameEn: string; nameKa: string;
  icon?: string; image?: string;
  parentSlug?: string | null;
}

interface LeanBrand {
  slug: string;
  name: string;
  type?: 'device' | 'maker';
  compatTerms?: string[];
}

function specsToObject(specs: SpecSource): Record<string, string> {
  if (!specs) return {};
  if (specs instanceof Map) return Object.fromEntries(specs);
  return { ...specs };
}

/**
 * A product is discounted when salePrice undercuts price and now falls inside
 * the (optional) window. Both bounds are optional: an absent start means the
 * sale has already started, an absent end means it has no expiry.
 */
export function isOnSale(
  doc: { price: number; salePrice?: number; salePriceStart?: Date; salePriceEnd?: Date },
  now: Date = new Date(),
): boolean {
  if (typeof doc.salePrice !== 'number') return false;
  if (doc.salePrice >= doc.price) return false;
  if (doc.salePriceStart && new Date(doc.salePriceStart) > now) return false;
  if (doc.salePriceEnd && new Date(doc.salePriceEnd) <= now) return false;
  return true;
}

export function discountPercent(product: Pick<Product, 'price' | 'salePrice'>): number {
  if (typeof product.salePrice !== 'number' || product.salePrice >= product.price) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}

export function mapProduct(doc: LeanProduct): Product {
  const onSale = isOnSale(doc);
  return {
    id: String(doc._id),
    slug: doc.slug,
    nameEn: doc.nameEn,
    nameKa: doc.nameKa,
    descriptionEn: doc.descriptionEn ?? '',
    descriptionKa: doc.descriptionKa ?? '',
    price: doc.price,
    originalPrice: doc.originalPrice,
    salePrice: onSale ? doc.salePrice : undefined,
    category: doc.categorySlug as CategorySlug,
    brand: doc.brand,
    images: doc.images ?? [],
    inStock: (doc.stock ?? 0) > 0,
    isNew: doc.isNewProduct ?? false,
    isFeatured: doc.isFeatured ?? false,
    rating: doc.rating ?? 0,
    reviewCount: doc.reviewCount ?? 0,
    specs: specsToObject(doc.specs),
    sku: doc.sku,
  };
}

export function mapCategory(doc: LeanCategory): Category {
  return {
    id: String(doc._id),
    slug: doc.slug as CategorySlug,
    nameEn: doc.nameEn,
    nameKa: doc.nameKa,
    icon: doc.icon ?? '',
    image: doc.image ?? '',
    parentSlug: doc.parentSlug ? (doc.parentSlug as CategorySlug) : undefined,
  };
}

export function mapBrand(doc: LeanBrand): Brand {
  return {
    slug: doc.slug,
    name: doc.name,
    type: doc.type ?? 'maker',
    compatTerms: doc.compatTerms ?? [],
  };
}
