import 'server-only';

/**
 * Storefront read layer.
 *
 * The single path from public pages to product data. Storefront code must not
 * import lib/mock-data.ts at runtime — those fixtures now only seed the DB.
 *
 * Every query filters isActive so an admin unpublishing a product hides it.
 * When a query returns nothing, callers render their empty state; there is
 * deliberately no fixture fallback, because a silent fallback reproduces the
 * "I edited it and nothing changed" confusion this layer exists to remove.
 */

import { connectDB } from '@/lib/mongodb';
import ProductModel from '@/models/Product';
import CategoryModel from '@/models/Category';
import BrandModel from '@/models/Brand';
import { mapProduct, mapCategory, mapBrand, isOnSale } from '@/lib/catalog-map';
import type { Product, Category, Brand, CategorySlug, ProductFilter } from '@/lib/types';

/**
 * Mongo predicate for an active sale. Mirrors isOnSale() in catalog-map.ts.
 * Exported so admin/products' "On sale" list filter uses the exact same
 * boundary operators as the storefront — divergence here would let a product
 * show on-sale in one place and not the other.
 */
export function activeSaleQuery(now: Date = new Date()) {
  return {
    salePrice: { $ne: null, $exists: true },
    $and: [
      { $or: [{ salePriceStart: null }, { salePriceStart: { $exists: false } }, { salePriceStart: { $lte: now } }] },
      { $or: [{ salePriceEnd: null }, { salePriceEnd: { $exists: false } }, { salePriceEnd: { $gt: now } }] },
    ],
  };
}

export async function getProducts(filter: ProductFilter = {}): Promise<Product[]> {
  await connectDB();
  const query: Record<string, unknown> = { isActive: true };
  if (filter.category) query.categorySlug = filter.category;
  if (filter.brand) query.brand = filter.brand;
  if (filter.featured) query.isFeatured = true;
  if (filter.isNew) query.isNewProduct = true;
  if (filter.onSale) Object.assign(query, activeSaleQuery());

  let q = ProductModel.find(query).sort({ createdAt: -1 }).lean();
  if (filter.limit) q = q.limit(filter.limit);
  const docs = await q;
  // The Mongo sale predicate and isOnSale() must agree; re-check so a
  // salePrice >= price row can never leak into the discounts page.
  const mapped = docs.map((d) => mapProduct(d as never));
  return filter.onSale ? mapped.filter((p) => typeof p.salePrice === 'number') : mapped;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await connectDB();
  const doc = await ProductModel.findOne({ slug, isActive: true }).lean();
  return doc ? mapProduct(doc as never) : null;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({
    isActive: true,
    slug: { $ne: product.slug },
    categorySlug: product.category,
  })
    .sort({ rating: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => mapProduct(d as never));
}

export async function getCategories(): Promise<Category[]> {
  await connectDB();
  const docs = await CategoryModel.find({ isActive: true }).lean();
  return docs.map((d) => mapCategory(d as never));
}

export async function getParentCategories(): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((c) => !c.parentSlug);
}

export async function getSubcategories(parentSlug: CategorySlug): Promise<Category[]> {
  const all = await getCategories();
  return all.filter((c) => c.parentSlug === parentSlug);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await connectDB();
  const doc = await CategoryModel.findOne({ slug, isActive: true }).lean();
  return doc ? mapCategory(doc as never) : null;
}

export async function getBrands(): Promise<Brand[]> {
  await connectDB();
  const docs = await BrandModel.find({}).sort({ order: 1, name: 1 }).lean();
  return docs.map((d) => mapBrand(d as never));
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  await connectDB();
  const doc = await BrandModel.findOne({ slug }).lean();
  return doc ? mapBrand(doc as never) : null;
}

/**
 * Products for a brand.
 * - maker brand  → products manufactured by that brand
 * - device brand → those, plus products whose specs.Compatibility mentions the
 *   brand name or any of its compatTerms
 */
export async function getProductsByBrand(slug: string): Promise<Product[]> {
  const brand = await getBrandBySlug(slug);
  if (!brand) return [];
  await connectDB();

  if (brand.type === 'maker') {
    const docs = await ProductModel.find({
      isActive: true,
      brand: new RegExp(`^${escapeRegex(brand.name)}$`, 'i'),
    }).lean();
    return docs.map((d) => mapProduct(d as never));
  }

  const terms = [brand.name, ...(brand.compatTerms ?? [])];
  const docs = await ProductModel.find({ isActive: true }).lean();
  return docs
    .map((d) => mapProduct(d as never))
    .filter((p) => {
      if (p.brand.toLowerCase() === brand.name.toLowerCase()) return true;
      const compat = p.specs.Compatibility ?? '';
      return terms.some((t) => compat.toLowerCase().includes(t.toLowerCase()));
    });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return getProducts({ featured: true, limit });
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  return getProducts({ isNew: true, limit });
}

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ isActive: true })
    .sort({ reviewCount: -1, rating: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => mapProduct(d as never));
}

/** The Discounts virtual category: every product with an active sale price. */
export async function getDiscountedProducts(): Promise<Product[]> {
  const products = await getProducts({ onSale: true });
  return products.sort((a, b) => {
    const da = (a.price - (a.salePrice ?? a.price)) / a.price;
    const db = (b.price - (b.salePrice ?? b.price)) / b.price;
    return db - da;
  });
}

/** Brand slug → product count, for the mega-menu. One pass, not one query per brand. */
export async function getBrandProductCounts(): Promise<Record<string, number>> {
  const brands = await getBrands();
  const entries = await Promise.all(
    brands.map(async (b) => [b.slug, (await getProductsByBrand(b.slug)).length] as const),
  );
  return Object.fromEntries(entries);
}
