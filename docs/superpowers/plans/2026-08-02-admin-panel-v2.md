# MoBax Admin Panel v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin edits appear on the public storefront, add a self-populating Discounts category, and add bulk order actions, a media library, inventory management, and a visual page editor.

**Architecture:** A new server-only data layer (`lib/catalog.ts`) becomes the single path from storefront pages to MongoDB, replacing direct `lib/mock-data.ts` imports. Because three of the four storefront consumers are client components, each gets a thin server wrapper that queries the DB and passes plain data down as props. Pages use ISR (`revalidate = 60`) plus `revalidatePath()` calls from admin mutation routes so edits appear immediately. The four new admin modules follow the existing `page.tsx` + `<Name>Client.tsx` + `/api/admin/<name>` pattern already used by all 15 modules.

**Tech Stack:** Next.js 14 App Router, TypeScript (strict), MongoDB + Mongoose, NextAuth v5, next-intl, Tailwind, shadcn/ui (Radix), Cloudinary, sonner (toasts), Vitest (added in Task 1).

## Global Constraints

- **Bilingual:** every user-facing string needs both `messages/en.json` and `messages/ka.json` entries. Georgian is first-class — check KA for text wrapping and overflow after any layout change.
- **Contrast is a hard requirement:** WCAG 2.1 AA in both themes. Semantic text colors must be var-driven. Pin interactive fills that carry white text to `#2E5BFF`, not `bg-cobalt` (the lifted dark-mode cobalt puts white at ~3.6:1).
- **Motion:** reveal animations enhance an already-visible default. Never gate content behind a viewport/class trigger. Respect `prefers-reduced-motion`.
- **Never run `npm run build` while `npm run dev` is live** — it corrupts `.next` and makes the dev server 500. Stop dev first, or `rm -rf .next` and restart after.
- **Typecheck command:** `npx tsc --noEmit`. **Lint:** `npm run lint`. CI runs lint + typecheck + build.
- **Admin API envelope:** all admin routes return `ok(data, status?)` / `fail(error, status)` from `lib/api.ts`, shaped `{ success, data, error }`.
- **Admin auth:** all admin API routes call `await requireAdmin({ module: '<module>' })` from `lib/admin-auth.ts` inside a `try`, and `catch (err) { if (err instanceof AdminAuthError) return fail(err.message, err.status); ... }`.
- **Real role names** are `SUPER_ADMIN | STORE_MANAGER | CONTENT_EDITOR | CUSTOMER` (`lib/rbac.ts`). Do not use owner/admin/staff — those appear in stale docs.
- **Empty-state rule:** if a DB query returns nothing, render the empty state. Never fall back to `lib/mock-data.ts` at runtime.
- **Verify visually:** for UI changes, screenshot the running page at several widths, in both themes, in EN and KA. Playwright is already a dependency.

---

## File Structure

**New files:**

| File | Responsibility |
|---|---|
| `lib/types.ts` | Canonical `Product`, `Category`, `Brand`, `CategorySlug` types. No data, no DB. |
| `lib/catalog.ts` | Server-only DB reads for storefront. The only path from storefront to product data. |
| `lib/catalog-map.ts` | Pure mapper functions: Mongoose lean doc → storefront type. Unit-tested without a DB. |
| `lib/revalidate.ts` | `revalidateStorefront(scope)` — centralises which paths admin mutations invalidate. |
| `lib/page-sections.ts` | Section kind schemas shared by the admin editor and the storefront renderer. |
| `models/Media.ts` | Media library documents. |
| `app/[locale]/(shop)/products/ProductsPageClient.tsx` | The existing client listing UI, receiving data as props. |
| `app/[locale]/(shop)/products/discounts/page.tsx` | Discounts virtual category page. |
| `app/api/admin/media/route.ts`, `app/api/admin/media/[id]/route.ts` | Media CRUD. |
| `app/api/admin/inventory/route.ts` | Inventory list + stock adjustment. |
| `app/admin/media/page.tsx`, `MediaClient.tsx` | Media library module. |
| `app/admin/inventory/page.tsx`, `InventoryClient.tsx` | Inventory module. |
| `components/admin/SectionEditor.tsx` | Typed per-kind section forms for the content editor. |
| `components/admin/BilingualField.tsx` | EN/KA input pair with an empty-KA warning. |
| `vitest.config.ts`, `tests/` | Test harness (none exists today). |

**Modified files:** `models/Brand.ts`, `models/Product.ts`, `models/Setting.ts`, `scripts/seed.ts`, `lib/mock-data.ts`, `lib/rbac.ts`, `lib/theme.ts`, `lib/assistant/catalog.ts`, `app/[locale]/layout.tsx`, `app/[locale]/(shop)/page.tsx`, `app/[locale]/(shop)/products/page.tsx`, `app/[locale]/(shop)/products/[slug]/page.tsx`, `components/layout/Navbar.tsx`, `components/admin/DataTable.tsx`, `components/admin/ImageUploader.tsx`, `components/admin/SingleImageUploader.tsx`, `components/admin/nav-config.ts`, `app/admin/orders/OrdersClient.tsx`, `app/admin/products/ProductsClient.tsx`, `app/admin/products/ProductForm.tsx`, `app/admin/theme/ThemeClient.tsx`, `app/admin/content/ContentClient.tsx`, `app/api/admin/upload/route.ts`, and the admin product/category/brand mutation routes.

**Deleted:** `components/layout/Navbar 2.tsx`.

---

## Task 1: Test harness + canonical types

No test suite exists. Later tasks test pure mapping logic, so the harness comes first, bundled with the type extraction that everything else imports.

**Files:**
- Create: `vitest.config.ts`, `tests/lib/types.test.ts`, `lib/types.ts`
- Modify: `package.json`, `lib/mock-data.ts:1-65`

**Interfaces:**
- Consumes: nothing.
- Produces: `lib/types.ts` exporting `CategorySlug` (the 25-member union), `Category`, `Product`, `Brand`, and `ProductFilter`. `npm test` runs Vitest.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3: Add the test script to `package.json`**

Add to `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Write the failing test**

Create `tests/lib/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { Product, Category, Brand, CategorySlug } from '@/lib/types';

describe('lib/types', () => {
  it('describes a storefront product', () => {
    const p: Product = {
      id: '1', slug: 'x', nameEn: 'X', nameKa: 'X',
      descriptionEn: '', descriptionKa: '',
      price: 10, category: 'phone-cases' as CategorySlug, brand: 'Apple',
      images: [], inStock: true, rating: 0, reviewCount: 0, specs: {}, sku: 'S1',
    };
    expect(p.slug).toBe('x');
  });

  it('describes a brand with device/maker typing', () => {
    const b: Brand = { slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] };
    expect(b.type).toBe('device');
  });

  it('describes a category', () => {
    const c: Category = {
      id: 'p1', slug: 'phone-cases' as CategorySlug,
      nameEn: 'Cases', nameKa: 'ქეისები', icon: '', image: '', productCount: 0,
    };
    expect(c.nameKa).toBe('ქეისები');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/types`.

- [ ] **Step 6: Create `lib/types.ts`**

Move the type declarations verbatim out of `lib/mock-data.ts` (the `CategorySlug` union at lines 1-33, `Category` at 35-44, `Product` at 46-65, `Brand` at 762-768). Add `ProductFilter`. The file contains types only — no data, no imports.

```ts
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
  productCount: number;
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
```

- [ ] **Step 7: Re-point `lib/mock-data.ts` at the new types**

Delete the four moved declarations from `lib/mock-data.ts` and replace them with a re-export, so every existing importer keeps compiling unchanged:

```ts
import type { CategorySlug, Category, Product, Brand } from './types';
export type { CategorySlug, Category, Brand } from './types';
export type { Product } from './types';
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 3 tests.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. `lib/store.ts`, `lib/assistant/conversation.ts`, and `app/api/chat/route.ts` import these types from `mock-data` and must still resolve through the re-export.

- [ ] **Step 10: Commit**

```bash
git add vitest.config.ts package.json package-lock.json tests/lib/types.test.ts lib/types.ts lib/mock-data.ts
git commit -m "refactor: extract canonical storefront types, add vitest"
```

---

## Task 2: Brand model gains type + compatTerms, seed fixed

`brands` is empty in MongoDB (verified 2026-08-02). `scripts/seed.ts:67-69` derives brands from distinct product `brand` strings, discarding `type` and `compatTerms`. Cutting the Navbar over before fixing this empties the brand mega-menu.

**Files:**
- Modify: `models/Brand.ts`, `scripts/seed.ts:67-70`

**Interfaces:**
- Consumes: `Brand` from `lib/types.ts` (Task 1).
- Produces: `IBrand` with `slug`, `name`, `type: 'device' | 'maker'`, `compatTerms: string[]`, `logoUrl`. A seeded `brands` collection with 8 documents.

- [ ] **Step 1: Rewrite `models/Brand.ts`**

```ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand extends Document {
  slug: string;
  name: string;
  /** device = phone maker (matches by compatibility too); maker = accessory brand. */
  type: 'device' | 'maker';
  /** Extra terms (besides `name`) matched against specs.Compatibility. */
  compatTerms: string[];
  logoUrl?: string;
  order: number;
}

const BrandSchema = new Schema<IBrand>({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['device', 'maker'], default: 'maker' },
  compatTerms: [{ type: String }],
  logoUrl: { type: String, default: '' },
  order: { type: Number, default: 0 },
});

const Brand: Model<IBrand> =
  (mongoose.models.Brand as Model<IBrand>) || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
```

- [ ] **Step 2: Fix the brand seed**

In `scripts/seed.ts`, import `brands as brandFixtures` from `../lib/mock-data` and replace lines 67-70:

```ts
  // ── Brands ──────────────────────────────────────────────────
  // Seeded from the `brands` fixture, not derived from product.brand strings:
  // the fixture carries `type` and `compatTerms`, which the brand mega-menu
  // and getProductsByBrand() both need.
  await Brand.insertMany(
    brandFixtures.map((b, i) => ({
      slug: b.slug,
      name: b.name,
      type: b.type,
      compatTerms: b.compatTerms ?? [],
      order: i,
    }))
  );
  console.log(`Seeded ${brandFixtures.length} brands`);
```

- [ ] **Step 3: Reseed and verify**

Run: `npm run seed`
Then verify the collection is populated with types intact:

```bash
node --env-file=.env.local -e "
const m=require('mongoose');
m.connect(process.env.MONGODB_URI).then(async()=>{
  const d=await m.connection.db.collection('brands').find({}).toArray();
  console.log(d.length, JSON.stringify(d.map(b=>[b.slug,b.type,(b.compatTerms||[]).length])));
  await m.disconnect();
});"
```

Expected: `8` and every entry shows `device` or `maker`, with the four device brands carrying non-zero `compatTerms`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add models/Brand.ts scripts/seed.ts
git commit -m "fix: seed brands with type and compatTerms"
```

---

## Task 3: Document mappers (pure, unit-tested)

The mapping from Mongoose documents to storefront types is where the cutover can silently corrupt data. It is pure, so it is tested without a database.

**Files:**
- Create: `lib/catalog-map.ts`, `tests/lib/catalog-map.test.ts`

**Interfaces:**
- Consumes: `Product`, `Category`, `Brand`, `CategorySlug` from `lib/types.ts`; `IProduct`, `ICategory`, `IBrand` from the models.
- Produces:
  - `mapProduct(doc: LeanProduct): Product`
  - `mapCategory(doc: LeanCategory): Category`
  - `mapBrand(doc: LeanBrand): Brand`
  - `isOnSale(doc: { salePrice?, price, salePriceStart?, salePriceEnd? }, now?: Date): boolean`
  - `discountPercent(product: Product): number`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/catalog-map.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mapProduct, mapCategory, mapBrand, isOnSale, discountPercent } from '@/lib/catalog-map';

const baseDoc = {
  _id: '1',
  slug: 'iphone-case',
  nameEn: 'Case', nameKa: 'ქეისი',
  descriptionEn: 'd', descriptionKa: 'ღ',
  price: 100,
  sku: 'SKU1',
  stock: 5,
  categorySlug: 'phone-cases',
  brand: 'Apple',
  images: ['a.jpg'],
  isActive: true,
  isFeatured: true,
  isNewProduct: false,
  rating: 4.5,
  reviewCount: 10,
  specs: { Color: 'Black' },
};

describe('mapProduct', () => {
  it('maps a document to the storefront shape', () => {
    const p = mapProduct(baseDoc as never);
    expect(p.id).toBe('1');
    expect(p.category).toBe('phone-cases');
    expect(p.isFeatured).toBe(true);
    expect(p.specs).toEqual({ Color: 'Black' });
  });

  it('derives inStock from stock', () => {
    expect(mapProduct({ ...baseDoc, stock: 0 } as never).inStock).toBe(false);
    expect(mapProduct({ ...baseDoc, stock: 3 } as never).inStock).toBe(true);
  });

  it('renames isNewProduct to isNew', () => {
    expect(mapProduct({ ...baseDoc, isNewProduct: true } as never).isNew).toBe(true);
  });

  it('converts a Map of specs to a plain object', () => {
    const withMap = { ...baseDoc, specs: new Map([['Bluetooth', '5.0']]) };
    expect(mapProduct(withMap as never).specs).toEqual({ Bluetooth: '5.0' });
  });

  it('exposes salePrice only when the sale is active', () => {
    const future = new Date(Date.now() + 86400000);
    const past = new Date(Date.now() - 86400000);
    expect(mapProduct({ ...baseDoc, salePrice: 80, salePriceEnd: future } as never).salePrice).toBe(80);
    expect(mapProduct({ ...baseDoc, salePrice: 80, salePriceEnd: past } as never).salePrice).toBeUndefined();
  });

  it('defaults missing optional fields rather than emitting undefined holes', () => {
    const sparse = { _id: '9', slug: 's', nameEn: 'N', nameKa: 'N', price: 1, sku: 'K', categorySlug: 'cables', brand: 'B' };
    const p = mapProduct(sparse as never);
    expect(p.images).toEqual([]);
    expect(p.specs).toEqual({});
    expect(p.rating).toBe(0);
    expect(p.descriptionEn).toBe('');
  });
});

describe('isOnSale', () => {
  const now = new Date('2026-08-02T12:00:00Z');

  it('is false with no salePrice', () => {
    expect(isOnSale({ price: 100 }, now)).toBe(false);
  });

  it('is false when salePrice is not below price', () => {
    expect(isOnSale({ price: 100, salePrice: 100 }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 120 }, now)).toBe(false);
  });

  it('is true for an open-ended sale', () => {
    expect(isOnSale({ price: 100, salePrice: 80 }, now)).toBe(true);
  });

  it('respects the start date', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceStart: new Date('2026-08-03') }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 80, salePriceStart: new Date('2026-08-01') }, now)).toBe(true);
  });

  it('respects the end date', () => {
    expect(isOnSale({ price: 100, salePrice: 80, salePriceEnd: new Date('2026-08-01') }, now)).toBe(false);
    expect(isOnSale({ price: 100, salePrice: 80, salePriceEnd: new Date('2026-08-03') }, now)).toBe(true);
  });
});

describe('discountPercent', () => {
  it('rounds to a whole percent', () => {
    expect(discountPercent({ price: 100, salePrice: 75 } as never)).toBe(25);
    expect(discountPercent({ price: 29.99, salePrice: 19.99 } as never)).toBe(33);
  });

  it('is 0 with no sale', () => {
    expect(discountPercent({ price: 100 } as never)).toBe(0);
  });
});

describe('mapCategory / mapBrand', () => {
  it('maps a category, dropping a null parentSlug', () => {
    const c = mapCategory({ _id: 'x', slug: 'cables', nameEn: 'Cables', nameKa: 'კაბელები', icon: '🔌', image: 'i.jpg', parentSlug: null, productCount: 4 } as never);
    expect(c.parentSlug).toBeUndefined();
    expect(c.slug).toBe('cables');
  });

  it('maps a brand', () => {
    const b = mapBrand({ slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] } as never);
    expect(b).toEqual({ slug: 'apple', name: 'Apple', type: 'device', compatTerms: ['iPhone'] });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/catalog-map`.

- [ ] **Step 3: Implement `lib/catalog-map.ts`**

```ts
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
  productCount?: number;
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
    productCount: doc.productCount ?? 0,
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all `catalog-map` tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog-map.ts tests/lib/catalog-map.test.ts
git commit -m "feat: add pure document mappers for the storefront cutover"
```

---

## Task 4: `lib/catalog.ts` — the storefront data layer

**Files:**
- Create: `lib/catalog.ts`

**Interfaces:**
- Consumes: `mapProduct`, `mapCategory`, `mapBrand`, `isOnSale` (Task 3); `connectDB` from `lib/mongodb`; the `Product`, `Category`, `Brand` models.
- Produces (all `async`, all server-only):
  - `getProducts(filter?: ProductFilter): Promise<Product[]>`
  - `getProductBySlug(slug: string): Promise<Product | null>`
  - `getRelatedProducts(product: Product, limit?: number): Promise<Product[]>`
  - `getCategories(): Promise<Category[]>`
  - `getParentCategories(): Promise<Category[]>`
  - `getSubcategories(parentSlug: CategorySlug): Promise<Category[]>`
  - `getCategoryBySlug(slug: string): Promise<Category | null>`
  - `getBrands(): Promise<Brand[]>`
  - `getBrandBySlug(slug: string): Promise<Brand | null>`
  - `getProductsByBrand(slug: string): Promise<Product[]>`
  - `getFeaturedProducts(limit?: number): Promise<Product[]>`
  - `getNewArrivals(limit?: number): Promise<Product[]>`
  - `getPopularProducts(limit?: number): Promise<Product[]>`
  - `getDiscountedProducts(): Promise<Product[]>`
  - `getBrandProductCounts(): Promise<Record<string, number>>`

- [ ] **Step 1: Implement `lib/catalog.ts`**

```ts
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

/** Mongo predicate for an active sale. Mirrors isOnSale() in catalog-map.ts. */
function activeSaleQuery(now: Date = new Date()) {
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
```

- [ ] **Step 2: Install `server-only` if absent**

```bash
npm ls server-only || npm install server-only
```

- [ ] **Step 3: Smoke-test the layer against the real database**

Create a throwaway script at the project root (module resolution requires it be inside the project, not `/tmp`):

```bash
cat > .smoke.mjs <<'EOF'
const { getProducts, getBrands, getParentCategories, getDiscountedProducts, getProductsByBrand } =
  await import('./lib/catalog.ts');
console.log('products', (await getProducts()).length);
console.log('brands', (await getBrands()).map(b => `${b.slug}:${b.type}`));
console.log('parents', (await getParentCategories()).length);
console.log('apple (device)', (await getProductsByBrand('apple')).length);
console.log('discounted', (await getDiscountedProducts()).length);
process.exit(0);
EOF
npx tsx --env-file=.env.local .smoke.mjs; rm -f .smoke.mjs
```

Expected: `products 24`, 8 brands with correct types, non-zero parents, and a non-zero Apple count. Install `tsx` if missing (`npm i -D tsx`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog.ts package.json package-lock.json
git commit -m "feat: add lib/catalog.ts storefront data layer"
```

---

## Task 5: Revalidation helper wired into admin mutations

With ISR at 60s, an admin edit would otherwise take up to a minute to appear. Targeted revalidation makes it immediate.

**Files:**
- Create: `lib/revalidate.ts`
- Modify: `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`, `app/api/admin/categories/route.ts`, `app/api/admin/categories/[id]/route.ts`, `app/api/admin/brands/route.ts`, `app/api/admin/brands/[id]/route.ts`

**Interfaces:**
- Consumes: `revalidatePath` from `next/cache`.
- Produces: `revalidateStorefront(scope: RevalidateScope, slug?: string): void` where `type RevalidateScope = 'product' | 'category' | 'brand' | 'content' | 'theme'`.

- [ ] **Step 1: Create `lib/revalidate.ts`**

```ts
import { revalidatePath } from 'next/cache';

/**
 * Which storefront paths an admin change invalidates.
 *
 * Storefront pages are ISR at 60s, so without this an edit takes up to a minute
 * to appear. Centralised here so a new page only has to be added in one place.
 */
export type RevalidateScope = 'product' | 'category' | 'brand' | 'content' | 'theme';

const LOCALES = ['en', 'ka'] as const;

export function revalidateStorefront(scope: RevalidateScope, slug?: string): void {
  for (const locale of LOCALES) {
    switch (scope) {
      case 'product':
        revalidatePath(`/${locale}`);
        revalidatePath(`/${locale}/products`);
        revalidatePath(`/${locale}/products/discounts`);
        if (slug) revalidatePath(`/${locale}/products/${slug}`);
        break;
      case 'category':
      case 'brand':
        // Both appear in the Navbar, which lives in the locale layout.
        revalidatePath(`/${locale}`, 'layout');
        revalidatePath(`/${locale}/products`);
        break;
      case 'content':
      case 'theme':
        revalidatePath(`/${locale}`, 'layout');
        break;
    }
  }
}
```

- [ ] **Step 2: Call it from every product mutation**

In `app/api/admin/products/route.ts` (POST) and `app/api/admin/products/[id]/route.ts` (PATCH, DELETE), after the write succeeds and before the `ok(...)` return:

```ts
revalidateStorefront('product', product.slug);
```

Import with `import { revalidateStorefront } from '@/lib/revalidate';`. For DELETE, capture the slug before removing the document.

- [ ] **Step 3: Call it from category and brand mutations**

Same pattern in the four category/brand routes, using `revalidateStorefront('category')` and `revalidateStorefront('brand')` respectively.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/revalidate.ts app/api/admin/products app/api/admin/categories app/api/admin/brands
git commit -m "feat: revalidate storefront paths on admin catalog writes"
```

---

## Task 6: Cut the home page over to the database

`app/[locale]/(shop)/page.tsx` is currently a **sync** component using `useTranslations`. Awaiting DB calls requires making it `async`, which means swapping to `getTranslations` from `next-intl/server`.

**Files:**
- Modify: `app/[locale]/(shop)/page.tsx`

**Interfaces:**
- Consumes: `getFeaturedProducts`, `getNewArrivals`, `getParentCategories` from `lib/catalog.ts` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: Change the imports**

Replace the `lib/mock-data` import block (lines 10-14) with:

```ts
import { getFeaturedProducts, getNewArrivals, getParentCategories } from '@/lib/catalog';
```

Replace `import { useTranslations } from 'next-intl';` with:

```ts
import { getTranslations, setRequestLocale } from 'next-intl/server';
```

and delete the now-duplicate `setRequestLocale` import from `next-intl/server`.

- [ ] **Step 2: Make the component async and add ISR**

Add above the component:

```ts
// Storefront reads the DB; ISR keeps it cheap. Admin catalog writes call
// revalidateStorefront(), so edits land immediately rather than within 60s.
export const revalidate = 60;
```

Change the signature and data fetching:

```ts
export default async function HomePage({ params: { locale } }: HomePageProps) {
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const [featured, newArrivals, allParents] = await Promise.all([
    getFeaturedProducts(),
    getNewArrivals(),
    getParentCategories(),
  ]);
  // Exclude the "most-popular" pseudo-category — it's a /products filter,
  // not a real product group, so it doesn't belong in the home grid.
  const categories = allParents.filter((c) => c.slug !== 'most-popular');
```

The rest of the body is unchanged: `heroProducts` still derives from `newArrivals` with the `featured` fallback, and `t(...)` calls work identically.

- [ ] **Step 3: Guard the empty case**

Wherever the page maps `featured` into the grid, wrap the section so an empty result renders nothing rather than an empty bordered shell:

```tsx
{featured.length > 0 && (
  /* ...existing featured section... */
)}
```

Do the same for `newArrivals` and `categories`. Per the global constraints, do not fall back to fixtures.

- [ ] **Step 4: Typecheck and run**

```bash
npx tsc --noEmit
npm run dev
```

- [ ] **Step 5: Verify in a browser**

Open `http://localhost:3000/en` and `http://localhost:3000/ka`. Screenshot at 390px, 768px, and 1440px, in light and dark. Confirm the featured grid, category grid, and new-arrivals rail are populated — per `CLAUDE.md`, a blank featured grid is a bug this codebase has shipped before.

Then edit a product name in `/admin/products` and reload `/en`: the new name must appear immediately.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(shop)/page.tsx"
git commit -m "feat: read home page catalog data from the database"
```

---

## Task 7: Cut the Navbar over (server wrapper for a client component)

`components/layout/Navbar.tsx` is `'use client'` (line 1) — it cannot query Mongoose. It already accepts a `branding` prop from `app/[locale]/layout.tsx`, so catalog data arrives the same way.

**Files:**
- Modify: `components/layout/Navbar.tsx:15,34-41`, `app/[locale]/layout.tsx:29-45`
- Delete: `components/layout/Navbar 2.tsx`

**Interfaces:**
- Consumes: `getParentCategories`, `getBrands`, `getBrandProductCounts` from `lib/catalog.ts`.
- Produces: `Navbar` accepting `{ branding?: NavbarBranding; categories: Category[]; brands: Brand[]; brandCounts: Record<string, number> }`.

- [ ] **Step 1: Change the Navbar props**

Replace the `lib/mock-data` import (line 15) with a type-only import:

```ts
import type { Category, Brand } from '@/lib/types';
```

Change the signature:

```tsx
export function Navbar({
  branding,
  categories,
  brands,
  brandCounts,
}: {
  branding?: NavbarBranding;
  categories: Category[];
  brands: Brand[];
  brandCounts: Record<string, number>;
}) {
```

- [ ] **Step 2: Delete the client-side derivations**

Remove lines 34-41 (`deviceBrands`, `makerBrands`, and the `brandCounts` `useMemo`) and replace with:

```tsx
  const deviceBrands = brands.filter((b) => b.type === 'device');
  const makerBrands = brands.filter((b) => b.type === 'maker');
```

`brandCounts` now arrives as a prop, so the `useMemo` and its `getProductsByBrand` call go away. Remove `useMemo` from the React import if it becomes unused. Every other reference (`brands.map` at line 371, the category menu, `getParentCategories()`) now reads the props.

- [ ] **Step 3: Fetch in the layout**

In `app/[locale]/layout.tsx`, add to the imports:

```ts
import { getParentCategories, getBrands, getBrandProductCounts } from '@/lib/catalog';
```

Inside `LocaleLayout`, alongside the existing theme fetch:

```ts
  const [navCategories, navBrands, brandCounts] = await Promise.all([
    getParentCategories(),
    getBrands(),
    getBrandProductCounts(),
  ]);
```

And pass them down:

```tsx
<Navbar branding={branding} categories={navCategories} brands={navBrands} brandCounts={brandCounts} />
```

- [ ] **Step 4: Delete the stray duplicate**

```bash
git rm "components/layout/Navbar 2.tsx"
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify in a browser**

With `npm run dev` running, open the brands mega-menu and the categories menu at 1440px and on mobile (390px), in EN and KA, in both themes. Confirm both menus are populated and the per-brand counts are non-zero. An empty brand menu means Task 2's seed did not run.

- [ ] **Step 7: Commit**

```bash
git add components/layout/Navbar.tsx "app/[locale]/layout.tsx"
git commit -m "feat: feed the navbar categories and brands from the database"
```

---

## Task 8: Cut the product listing page over

`app/[locale]/(shop)/products/page.tsx` is `'use client'` and filters the full fixture array in the browser. The client UI is preserved verbatim and moved into a child component; a new server page fetches and passes the data.

**Files:**
- Create: `app/[locale]/(shop)/products/ProductsPageClient.tsx`
- Modify: `app/[locale]/(shop)/products/page.tsx`

**Interfaces:**
- Consumes: `getProducts`, `getBrands`, `getCategories` from `lib/catalog.ts`; `getProductsByBrand` for the brand-landing case.
- Produces: `ProductsPageClient` accepting `{ products: Product[]; categories: Category[]; brands: Brand[]; brandProducts: Record<string, string[]> }` where `brandProducts` maps a brand slug to the product slugs it covers (precomputed server-side because the device-brand match needs `compatTerms`).

- [ ] **Step 1: Move the client UI**

`git mv` the current file's contents into `app/[locale]/(shop)/products/ProductsPageClient.tsx`. Keep `'use client'`, keep the `Suspense` wrapper and `ProductsPageInner`, and rename the default export to a named `export function ProductsPageClient(props)`.

Replace the `lib/mock-data` import block (lines 10-20) with:

```ts
import type { Product, Category, Brand, CategorySlug } from '@/lib/types';
```

- [ ] **Step 2: Replace the fixture calls with props**

Inside `ProductsPageInner`, thread the props through:

- `products` → `props.products`
- `getParentCategories()` → `props.categories.filter((c) => !c.parentSlug)`
- `getSubcategories(slug)` → `props.categories.filter((c) => c.parentSlug === slug)`
- `brandRegistry` → `props.brands`
- `getBrandBySlug(slug)` → `props.brands.find((b) => b.slug === slug)`
- `getProductsByBrand(slug)` → `props.products.filter((p) => props.brandProducts[slug]?.includes(p.slug))`
- `getPopularProducts()` → `[...props.products].sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating).slice(0, 8)`

Pass the props from `ProductsPageClient` down into `ProductsPageInner`.

- [ ] **Step 3: Write the new server page**

Replace `app/[locale]/(shop)/products/page.tsx` with:

```tsx
import { setRequestLocale } from 'next-intl/server';
import { getProducts, getCategories, getBrands, getProductsByBrand } from '@/lib/catalog';
import { ProductsPageClient } from './ProductsPageClient';

export const revalidate = 60;

interface ProductsPageProps {
  params: { locale: string };
}

export default async function ProductsPage({ params: { locale } }: ProductsPageProps) {
  setRequestLocale(locale);

  const [products, categories, brands] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
  ]);

  // Brand → product slugs, resolved server-side: a device brand also matches on
  // specs.Compatibility via compatTerms, which the client has no access to.
  const brandProductEntries = await Promise.all(
    brands.map(async (b) => [b.slug, (await getProductsByBrand(b.slug)).map((p) => p.slug)] as const),
  );

  return (
    <ProductsPageClient
      products={products}
      categories={categories}
      brands={brands}
      brandProducts={Object.fromEntries(brandProductEntries)}
    />
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify in a browser**

Open `/en/products`. Exercise every filter: each category, each subcategory, each brand (both a device brand like Apple and a maker brand like Hoco), and each sort option. Confirm counts match what `/admin/products` shows. Check `?brand=apple` and `?category=phone-cases` deep links still work. Repeat at 390px and in KA.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(shop)/products"
git commit -m "feat: read the product listing from the database"
```

---

## Task 9: Cut the product detail page and the assistant over

**Files:**
- Modify: `app/[locale]/(shop)/products/[slug]/page.tsx`, `lib/assistant/catalog.ts`
- Check: `app/api/chat/route.ts`

**Interfaces:**
- Consumes: `getProductBySlug`, `getRelatedProducts`, `getProducts`, `getCategories`, `getSubcategories` from `lib/catalog.ts`.
- Produces: `lib/assistant/catalog.ts` exports keep their existing names and signatures, but each becomes `async`.

- [ ] **Step 1: Rewire the detail page**

Replace its `lib/mock-data` imports with `lib/catalog` equivalents. If the page is sync, make it `async` and await `getProductBySlug(params.slug)` and `getRelatedProducts(product)`. Add `export const revalidate = 60;`. Where the page currently returns `notFound()` for a missing fixture product, keep that behaviour for a `null` DB result.

If the file has a `generateStaticParams`, change it to read slugs from the DB:

```ts
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}
```

- [ ] **Step 2: Rewire the assistant retrieval**

In `lib/assistant/catalog.ts`, replace the `lib/mock-data` import (lines 1-7) with:

```ts
import { getProducts, getCategories, getSubcategories } from '@/lib/catalog';
import type { CategorySlug, Product } from '@/lib/types';
```

Make each exported function `async`, awaiting `getProducts()` / `getCategories()` where it previously read the module-level `products` / `categories` arrays. The ranking logic is unchanged — this is a data-source swap, not a behaviour change.

- [ ] **Step 3: Await the assistant calls**

In `app/api/chat/route.ts`, add `await` to every now-async call from `lib/assistant/catalog`. Its `CategorySlug` type import moves to `@/lib/types`. Do the same in `lib/assistant/conversation.ts`.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. A missing `await` surfaces here as a `Promise<Product[]>` assigned to `Product[]`.

- [ ] **Step 5: Verify in a browser**

Open a product detail page; confirm images, specs, price, and related products render. Then open the support chat and ask for a product recommendation — it must name products that exist in `/admin/products`. Change a product's price in admin and confirm the chat quotes the new price.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(shop)/products/[slug]/page.tsx" lib/assistant app/api/chat/route.ts
git commit -m "feat: read product detail and assistant catalog from the database"
```

---

## Task 10: Demote `lib/mock-data.ts` to seed fixtures

The cutover is only complete once nothing on the storefront can accidentally read fixtures again.

**Files:**
- Modify: `lib/mock-data.ts`, `lib/store.ts:5`, `components/shop/ProductCard.tsx`, `components/shop/HeroProduct.tsx`, `.eslintrc.json`

- [ ] **Step 1: Re-point the remaining type imports**

`lib/store.ts:5`, `components/shop/ProductCard.tsx`, and `components/shop/HeroProduct.tsx` import types from `mock-data`. Change each to `from '@/lib/types'`.

- [ ] **Step 2: Add the file header**

At the top of `lib/mock-data.ts`:

```ts
/**
 * SEED FIXTURES ONLY.
 *
 * scripts/seed.ts is the only runtime consumer. The storefront reads MongoDB
 * through lib/catalog.ts — importing this module from a page or component puts
 * stale data on the live site. Canonical types live in lib/types.ts.
 */
```

- [ ] **Step 3: Enforce it with a lint rule**

In `.eslintrc.json`, add an override that bans the import everywhere except the seed script:

```json
{
  "overrides": [
    {
      "files": ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.ts"],
      "excludedFiles": ["lib/mock-data.ts"],
      "rules": {
        "no-restricted-imports": [
          "error",
          {
            "patterns": [
              {
                "group": ["**/mock-data", "@/lib/mock-data"],
                "message": "Storefront data comes from lib/catalog.ts. lib/mock-data.ts is seed fixtures only."
              }
            ]
          }
        ]
      }
    }
  ]
}
```

Merge into the existing config rather than replacing it.

- [ ] **Step 4: Run lint and fix any remaining importer**

Run: `npm run lint`
Expected: no `no-restricted-imports` errors. Any hit is a storefront file still on fixtures — rewire it through `lib/catalog.ts`.

- [ ] **Step 5: Full check**

```bash
npx tsc --noEmit
npm test
```

Stop `npm run dev` first, then:

```bash
npm run build
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add lib/mock-data.ts lib/store.ts components/shop .eslintrc.json
git commit -m "refactor: demote mock-data to seed fixtures, ban storefront imports"
```

---

## Task 11: Discounts virtual category — storefront

**Files:**
- Create: `app/[locale]/(shop)/products/discounts/page.tsx`
- Modify: `components/shop/ProductCard.tsx`, `messages/en.json`, `messages/ka.json`, `app/[locale]/layout.tsx` (nav data)

**Interfaces:**
- Consumes: `getDiscountedProducts` from `lib/catalog.ts`; `discountPercent` from `lib/catalog-map.ts`.
- Produces: the route `/[locale]/products/discounts`; `ProductCard` renders a sale badge and struck-through price when `product.salePrice` is set.

- [ ] **Step 1: Add the translation keys**

`messages/en.json`, under a new `discounts` namespace:

```json
"discounts": {
  "title": "Discounts",
  "subtitle": "Every product currently on sale",
  "empty": "No discounted products right now. Check back soon.",
  "badge": "-{percent}%",
  "count": "{count} products on sale"
}
```

`messages/ka.json`:

```json
"discounts": {
  "title": "ფასდაკლებები",
  "subtitle": "ყველა პროდუქტი ფასდაკლებით",
  "empty": "ამჟამად ფასდაკლებული პროდუქტი არ არის. შემოგვიარეთ მოგვიანებით.",
  "badge": "-{percent}%",
  "count": "{count} პროდუქტი ფასდაკლებით"
}
```

- [ ] **Step 2: Show the sale on `ProductCard`**

Where the price renders, when `product.salePrice` is set, show the sale price as the primary figure with the original struck through beside it, plus a percentage badge on the image corner:

```tsx
{product.salePrice !== undefined ? (
  <div className="flex items-baseline gap-2">
    <span className="font-semibold text-ink dark:text-white">₾{product.salePrice.toFixed(2)}</span>
    <span className="text-sm text-graphite line-through">₾{product.price.toFixed(2)}</span>
  </div>
) : (
  <span className="font-semibold text-ink dark:text-white">₾{product.price.toFixed(2)}</span>
)}
```

The badge uses the pinned fill required by the global constraints, since it carries white text:

```tsx
{product.salePrice !== undefined && (
  <span className="absolute left-3 top-3 rounded-full bg-[#2E5BFF] px-2 py-0.5 text-xs font-semibold text-white">
    -{discountPercent(product)}%
  </span>
)}
```

Match the currency formatting already used elsewhere in the card rather than inventing a new one.

- [ ] **Step 3: Create the page**

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ProductCard } from '@/components/shop/ProductCard';
import { getDiscountedProducts } from '@/lib/catalog';

export const revalidate = 60;

interface DiscountsPageProps {
  params: { locale: string };
}

export default async function DiscountsPage({ params: { locale } }: DiscountsPageProps) {
  setRequestLocale(locale);
  const t = await getTranslations('discounts');
  const products = await getDiscountedProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-white">{t('title')}</h1>
      <p className="mt-3 text-graphite">{t('subtitle')}</p>

      {products.length === 0 ? (
        <p className="mt-12 text-graphite">{t('empty')}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-graphite">{t('count', { count: products.length })}</p>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

Match `ProductCard`'s actual prop signature — read it before writing this.

- [ ] **Step 3b: Link it from the navigation**

In `app/[locale]/layout.tsx`, alongside the other nav fetches, add `const discountCount = (await getDiscountedProducts()).length;` and pass `showDiscounts={discountCount > 0}` to `Navbar`. In `Navbar`, when `showDiscounts` is true, render a Discounts entry in the categories menu linking to `/${locale}/products/discounts`. Per the spec, the entry is hidden when no product qualifies.

- [ ] **Step 4: Verify in a browser**

Set a sale price on two products via `/admin/products`, then open `/en/products/discounts`. Both must appear, sorted by discount percentage descending, with badges and struck-through prices. Clear one sale and confirm it disappears. With zero sales, the nav entry must vanish and the page must show the empty message, not a blank grid. Check KA for text wrapping on the badge and title.

- [ ] **Step 5: Commit**

```bash
git add "app/[locale]/(shop)/products/discounts" components/shop/ProductCard.tsx messages "app/[locale]/layout.tsx" components/layout/Navbar.tsx
git commit -m "feat: add the discounts virtual category"
```

---

## Task 12: Row selection in `DataTable`

Groundwork for both bulk order actions and bulk sale pricing. `components/ui/checkbox.tsx` already exists and is unused by admin.

**Files:**
- Modify: `components/admin/DataTable.tsx`

**Interfaces:**
- Consumes: `Checkbox` from `components/ui/checkbox`.
- Produces: `DataTable` gains optional props `selectable?: boolean`, `selectedIds?: string[]`, `onSelectionChange?: (ids: string[]) => void`, `getRowId?: (row: T) => string`. When `selectable` is false or omitted, rendering is byte-identical to today.

- [ ] **Step 1: Add the props**

Extend the props interface, defaulting `getRowId` to `(row) => String((row as { id?: string; _id?: string }).id ?? (row as { _id?: string })._id)`.

- [ ] **Step 2: Render the checkbox column**

When `selectable`, prepend a `<th>` holding a select-all checkbox and a `<td>` per row. Select-all covers the rows currently rendered (the current page), not the whole result set — the header label must say so if a count is shown. Indeterminate state when some but not all page rows are selected.

- [ ] **Step 3: Accessibility**

Each row checkbox needs an `aria-label` naming the row (`Select order ${id}`), and the header checkbox `aria-label="Select all rows on this page"`. Checkbox fills carrying a white check must use `#2E5BFF`, per the global constraints.

- [ ] **Step 4: Typecheck and verify no regression**

Run: `npx tsc --noEmit`. Then open three existing list modules (`/admin/products`, `/admin/customers`, `/admin/reviews`) and confirm they look and behave exactly as before — none pass `selectable`.

- [ ] **Step 5: Commit**

```bash
git add components/admin/DataTable.tsx
git commit -m "feat: add optional row selection to DataTable"
```

---

## Task 13: Bulk order actions + address visibility

`PATCH /api/admin/orders/bulk` (`{ids[], status}`, restoring stock for CANCELLED and REFUNDED) exists and is the only unreachable admin endpoint.

**Files:**
- Modify: `app/admin/orders/OrdersClient.tsx`

**Interfaces:**
- Consumes: `DataTable` selection props (Task 12); `PATCH /api/admin/orders/bulk`; `ConfirmDialog` from `components/admin/ConfirmDialog`.

- [ ] **Step 1: Wire selection state**

Add `const [selectedIds, setSelectedIds] = useState<string[]>([])` and pass `selectable`, `selectedIds`, `onSelectionChange={setSelectedIds}`, and `getRowId={(o) => o._id}` to `DataTable`. Clear the selection whenever the page, filter, or search changes — otherwise a bulk action can hit rows the user can no longer see.

- [ ] **Step 2: Add the bulk action bar**

Rendered only when `selectedIds.length > 0`: a count ("3 orders selected"), a status `Select`, an Apply button, and a Clear button. It must not shift the table's layout when it appears — reserve the space or overlay it.

- [ ] **Step 3: Confirm before applying**

Use `ConfirmDialog`, naming both the count and the target status: "Change 3 orders to CANCELLED? Cancelling restores stock for every item in those orders." That stock consequence is real (`app/api/admin/orders/bulk/route.ts:29-30`) and must be stated.

- [ ] **Step 4: Submit and refresh**

```ts
const res = await fetch('/api/admin/orders/bulk', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: selectedIds, status: bulkStatus }),
});
const json = await res.json();
if (!json.success) { toast.error(json.error); return; }
toast.success(`Updated ${selectedIds.length} orders`);
setSelectedIds([]);
await loadOrders();
```

Match the existing fetch/toast idiom in the file rather than introducing a new one.

- [ ] **Step 5: Add customer and address columns**

Add a customer column (name, or the guest email) and a shipping-address column showing city plus a truncated street, with the full address in a `title` attribute. Source both from the order's `addressSnapshot`. This answers "who ordered what, to what address" from the list, per the spec.

- [ ] **Step 6: Verify in a browser**

Select three orders, apply a status, confirm the toast and the refreshed rows. Select a paid order and set it to CANCELLED, then check the product's stock in `/admin/products` went up. Confirm select-all covers only the current page. Check the new columns do not overflow at 1280px.

- [ ] **Step 7: Commit**

```bash
git add app/admin/orders/OrdersClient.tsx
git commit -m "feat: bulk order status actions and address columns"
```

---

## Task 14: Bulk sale pricing in the products module

The admin half of the Discounts feature.

**Files:**
- Modify: `app/admin/products/ProductsClient.tsx`, `app/api/admin/products/route.ts`

**Interfaces:**
- Consumes: `DataTable` selection (Task 12); `revalidateStorefront` (Task 5).
- Produces: `PATCH /api/admin/products` accepting `{ ids: string[]; action: 'setSale'; mode: 'percent' | 'fixed'; value: number; startsAt?: string; endsAt?: string }` or `{ ids: string[]; action: 'clearSale' }`, returning `{ updated: number }`.

- [ ] **Step 1: Add the bulk endpoint**

Add a `PATCH` handler to `app/api/admin/products/route.ts`:

```ts
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });
    await connectDB();
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) return fail('No products selected', 400);

    if (body.action === 'clearSale') {
      const res = await ProductModel.updateMany(
        { _id: { $in: ids } },
        { $unset: { salePrice: '', salePriceStart: '', salePriceEnd: '' } },
      );
      revalidateStorefront('product');
      return ok({ updated: res.modifiedCount });
    }

    if (body.action === 'setSale') {
      const value = Number(body.value);
      if (!Number.isFinite(value) || value <= 0) return fail('Invalid sale value', 400);
      if (body.mode === 'percent' && value >= 100) return fail('Percent must be below 100', 400);

      const products = await ProductModel.find({ _id: { $in: ids } }).lean();
      let updated = 0;
      for (const p of products) {
        const salePrice =
          body.mode === 'percent'
            ? Math.round(p.price * (1 - value / 100) * 100) / 100
            : value;
        // A sale that doesn't undercut the price would never satisfy isOnSale(),
        // so reject it here rather than writing a row that silently never shows.
        if (salePrice >= p.price) continue;
        await ProductModel.updateOne(
          { _id: p._id },
          {
            $set: {
              salePrice,
              salePriceStart: body.startsAt ? new Date(body.startsAt) : null,
              salePriceEnd: body.endsAt ? new Date(body.endsAt) : null,
            },
          },
        );
        updated += 1;
      }
      revalidateStorefront('product');
      return ok({ updated, skipped: ids.length - updated });
    }

    return fail('Unknown action', 400);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/products PATCH]', err);
    return fail('Failed to update products', 500);
  }
}
```

- [ ] **Step 2: Add selection and the sale dialog**

Wire `DataTable` selection as in Task 13. When rows are selected, show a bar with **Set sale** and **Clear sale**. **Set sale** opens a dialog with a percent/fixed toggle, a value input, and optional start and end date inputs. Show the resulting price for the first selected product as a live preview so the user can see what they are about to write.

- [ ] **Step 3: Add the sale column and filter**

Add a Sale column rendering the sale price and percentage, or an em dash. Add an "On sale" option to the existing status filter, sending `onSale=true` to the list endpoint; add that filter to the route's `GET` using the same active-sale predicate as `lib/catalog.ts`.

- [ ] **Step 4: Report skipped rows**

If the response reports a non-zero `skipped`, surface it: `toast.warning('${updated} updated, ${skipped} skipped — the sale price was not below the current price')`. Silently dropping rows is what makes bulk tools untrustworthy.

- [ ] **Step 5: Verify in a browser**

Select four products, set 20% off with an end date a day out, and confirm the Sale column fills in. Open `/en/products/discounts` — all four appear. Set an end date in the past on one and confirm it drops off the storefront but keeps its admin values. Clear the sale on the rest and confirm the discounts page empties and its nav entry disappears.

- [ ] **Step 6: Commit**

```bash
git add app/admin/products/ProductsClient.tsx app/api/admin/products/route.ts
git commit -m "feat: bulk sale pricing for products"
```

---

## Task 15: Media model, upload recording, and the RBAC/folder fixes

`app/api/admin/upload/route.ts:13` hardcodes `module: 'products'`, so a CONTENT_EDITOR (who has only `content` and `theme`) cannot upload a category or service image. Every upload also lands in `mobax/products` regardless of caller.

**Files:**
- Create: `models/Media.ts`, `app/api/admin/media/route.ts`, `app/api/admin/media/[id]/route.ts`
- Modify: `app/api/admin/upload/route.ts`, `lib/cloudinary.ts`

**Interfaces:**
- Produces:
  - `IMedia` with `url`, `publicId`, `folder`, `width`, `height`, `bytes`, `format`, `alt`, `uploadedBy`, `createdAt`
  - `POST /api/admin/upload` accepting an optional `folder` form field (one of `products | categories | services | content | theme`, defaulting to `products`)
  - `GET /api/admin/media?page&limit&search&folder` → `{ items: IMedia[]; total: number }`
  - `DELETE /api/admin/media/[id]?force=true` → `{ deleted: true }` or 409 `{ error, usedBy }`

- [ ] **Step 1: Create `models/Media.ts`**

```ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export const MEDIA_FOLDERS = ['products', 'categories', 'services', 'content', 'theme'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export interface IMedia extends Document {
  url: string;
  publicId: string;
  folder: MediaFolder;
  width: number;
  height: number;
  bytes: number;
  format: string;
  alt: string;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    folder: { type: String, enum: MEDIA_FOLDERS, default: 'products' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    format: { type: String, default: '' },
    alt: { type: String, default: '' },
    uploadedBy: { type: String },
  },
  { timestamps: true }
);

MediaSchema.index({ folder: 1, createdAt: -1 });
MediaSchema.index({ alt: 'text' });

const Media: Model<IMedia> =
  (mongoose.models.Media as Model<IMedia>) || mongoose.model<IMedia>('Media', MediaSchema);

export default Media;
```

- [ ] **Step 2: Make the Cloudinary folder a parameter**

In `lib/cloudinary.ts`, change `uploadImage(dataUri)` to `uploadImage(dataUri, folder = 'products')`, uploading to `` `mobax/${folder}` ``, and return `width`, `height`, `bytes`, and `format` alongside `url` and `publicId`.

- [ ] **Step 3: Fix the upload route's RBAC and record the upload**

Replace the hardcoded guard. The caller declares its folder; the folder determines the module:

```ts
const FOLDER_MODULE: Record<MediaFolder, AdminModule> = {
  products: 'products',
  categories: 'categories',
  services: 'content',
  content: 'content',
  theme: 'theme',
};

const formData = await req.formData();
const folder = (formData.get('folder') as MediaFolder) ?? 'products';
if (!MEDIA_FOLDERS.includes(folder)) return fail('Invalid folder', 400);
const session = await requireAdmin({ module: FOLDER_MODULE[folder] });
```

`requireAdmin` must still run before any expensive work — read the form data first only because the folder is needed to pick the module; do not touch Cloudinary before the guard returns. After a successful upload, write the `Media` document with `uploadedBy: session.user.id`, then return the uploaded payload as before so existing callers keep working.

Apply the same folder-derived module to `DELETE`.

- [ ] **Step 4: Add the media list and delete routes**

`GET /api/admin/media` — `requireAdmin({ module: 'content' })`, paginated (default 40), optional `search` (case-insensitive regex on `alt` and `publicId`) and `folder` filters, sorted `createdAt: -1`.

`DELETE /api/admin/media/[id]` — before deleting, check for references:

```ts
const [inProducts, inCategories, inServices] = await Promise.all([
  ProductModel.countDocuments({ images: media.url }),
  CategoryModel.countDocuments({ image: media.url }),
  ServiceModel.countDocuments({ image: media.url }),
]);
const usedBy = inProducts + inCategories + inServices;
if (usedBy > 0 && req.nextUrl.searchParams.get('force') !== 'true') {
  return fail(`In use by ${usedBy} item(s). Re-send with force=true to delete anyway.`, 409);
}
```

Then `deleteImage(media.publicId)` and remove the document. Confirm `models/Service.ts`'s image field name before writing this — adjust if it differs.

- [ ] **Step 5: Verify**

Upload an image from `/admin/products` and confirm a `media` document appears with correct dimensions. Sign in as a CONTENT_EDITOR and upload a category image — previously a 403, now it must succeed. Attempt to delete an in-use image and confirm the 409.

- [ ] **Step 6: Commit**

```bash
git add models/Media.ts app/api/admin/media app/api/admin/upload/route.ts lib/cloudinary.ts
git commit -m "feat: record uploads as media, fix upload RBAC and folders"
```

---

## Task 16: Media library module + library picker

**Files:**
- Create: `app/admin/media/page.tsx`, `app/admin/media/MediaClient.tsx`
- Modify: `components/admin/nav-config.ts`, `components/admin/ImageUploader.tsx`, `components/admin/SingleImageUploader.tsx`, `lib/rbac.ts`

**Interfaces:**
- Consumes: the media API (Task 15).
- Produces: `/admin/media`; both uploaders gain a "Choose from library" tab.

- [ ] **Step 1: Add the `media` module to RBAC**

In `lib/rbac.ts`, add `'media'` to `AdminModule` and grant it to `SUPER_ADMIN`, `STORE_MANAGER`, and `CONTENT_EDITOR` (all three upload images).

- [ ] **Step 2: Build the module**

`page.tsx` follows the existing pattern — a server component rendering `<MediaClient />`. `MediaClient` is a grid of image cards (thumbnail, folder badge, dimensions, inline-editable alt text, delete). Add a search input, a folder filter, and pagination. Reuse `EmptyState` and `ConfirmDialog`. On a 409 from delete, show the usage count and offer "Delete anyway", which re-sends with `force=true`.

- [ ] **Step 3: Add the nav entry**

In `components/admin/nav-config.ts`, add to the Storefront group:

```ts
{ label: 'Media', href: '/admin/media', icon: ImageIcon, module: 'media', group: 'Storefront' },
```

importing `Image as ImageIcon` from `lucide-react`.

- [ ] **Step 4: Add the library picker to both uploaders**

Wrap each uploader's body in shadcn `Tabs` with "Upload" (the current UI, unchanged) and "Library" (a compact paginated grid fetching `/api/admin/media`). Selecting an image calls the same `onChange` the upload path calls, so consumers need no changes. Both uploaders also now send their `folder` in the upload form data — `ProductForm` sends `products`, `CategoriesClient` sends `categories`, `ServicesClient` sends `services`.

- [ ] **Step 5: Verify in a browser**

Upload two images, confirm both appear in `/admin/media`. Open `ProductForm`, switch to the Library tab, pick an existing image, and confirm it attaches without a re-upload. Check the grid at 390px and in dark mode.

- [ ] **Step 6: Commit**

```bash
git add app/admin/media components/admin lib/rbac.ts
git commit -m "feat: add the media library module and library picker"
```

---

## Task 17: Inventory module

**Files:**
- Create: `app/api/admin/inventory/route.ts`, `app/admin/inventory/page.tsx`, `app/admin/inventory/InventoryClient.tsx`
- Modify: `models/Product.ts`, `app/admin/products/ProductForm.tsx`, `components/admin/nav-config.ts`, `app/admin/DashboardClient.tsx`

**Interfaces:**
- Produces:
  - `models/Product.ts` gains `lowStockThreshold: number` (default 5)
  - `GET /api/admin/inventory?filter=all|low|out&page&limit` → `{ items, total, lowCount, outCount }`
  - `POST /api/admin/inventory` with `{ productId, delta, reason, note? }` → `{ stock: number }`, where `reason` is one of `restock | damage | correction | return`

- [ ] **Step 1: Add the threshold field**

In `models/Product.ts`, add to the interface and schema:

```ts
  /** Below or equal to this, the product shows in the inventory low-stock list. */
  lowStockThreshold: number;
```
```ts
    lowStockThreshold: { type: Number, default: 5 },
```

Add the field to `ProductForm` as a number input beside Stock, labelled "Low stock threshold".

- [ ] **Step 2: Write the API route**

`GET` — `requireAdmin({ module: 'products' })`, sorted `stock: 1`. The `low` filter uses `$expr: { $lte: ['$stock', '$lowStockThreshold'] }`; `out` uses `stock: { $lte: 0 }`. Return `lowCount` and `outCount` for the dashboard.

`POST` — apply the delta atomically and log it:

```ts
const product = await ProductModel.findById(productId);
if (!product) return fail('Product not found', 404);
const next = product.stock + delta;
if (next < 0) return fail('Adjustment would put stock below zero', 400);
product.stock = next;
await product.save();

await ActivityLog.create({
  userId: session.user.id,
  action: 'inventory.adjust',
  entityType: 'Product',
  entityId: String(product._id),
  metadata: { delta, reason, note: note ?? '', from: next - delta, to: next },
});

revalidateStorefront('product', product.slug);
return ok({ stock: next });
```

Read `models/ActivityLog.ts` first and match its actual field names.

- [ ] **Step 3: Build the module**

A `DataTable` of products sorted by stock ascending, with columns for image, name, SKU, stock, threshold, and status (`StatusBadge`-style: OK / Low / Out). Filter tabs for All / Low / Out with counts. An Adjust action per row opens a dialog with a signed delta input, a reason select, an optional note, and a preview of the resulting stock.

- [ ] **Step 4: Add the nav entry and dashboard link**

Add to the Catalog group:

```ts
{ label: 'Inventory', href: '/admin/inventory', icon: Boxes, module: 'products', group: 'Catalog' },
```

In `DashboardClient`, make the low-stock card link to `/admin/inventory?filter=low` and source its count from the new endpoint so it respects per-product thresholds rather than a single global number.

- [ ] **Step 5: Verify in a browser**

Set one product's threshold to 100 and confirm it appears under Low. Adjust stock by -3 with reason "damage", confirm the new stock and that an `ActivityLog` entry was written. Try an adjustment that would go negative and confirm the 400. Confirm the storefront marks a zeroed product out of stock.

- [ ] **Step 6: Commit**

```bash
git add models/Product.ts app/api/admin/inventory app/admin/inventory app/admin/products/ProductForm.tsx components/admin/nav-config.ts app/admin/DashboardClient.tsx
git commit -m "feat: add the inventory module with logged stock adjustments"
```

---

## Task 18: Shared section schemas + bilingual field

Groundwork for the visual page editor. `ContentClient.tsx:412-419` edits section `content` as raw JSON; its own header comment marks that as MVP. The schema must be shared so the admin form and the storefront renderer cannot drift.

**Files:**
- Create: `lib/page-sections.ts`, `components/admin/BilingualField.tsx`, `tests/lib/page-sections.test.ts`

**Interfaces:**
- Produces:
  - `SECTION_KINDS: readonly ['hero','text','banner','faq','grid']`
  - `SectionFieldSpec = { key: string; label: string; type: 'text' | 'textarea' | 'image' | 'url' | 'number' | 'boolean'; bilingual: boolean }`
  - `SECTION_SCHEMAS: Record<SectionKind, SectionFieldSpec[]>`
  - `emptyContent(kind: SectionKind): Record<string, unknown>`
  - `validateSection(kind: SectionKind, content: unknown): { ok: true } | { ok: false; errors: string[] }`
  - `BilingualField` — an EN/KA input pair showing a warning when KA is empty

- [ ] **Step 1: Write the failing test**

Create `tests/lib/page-sections.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SECTION_SCHEMAS, emptyContent, validateSection } from '@/lib/page-sections';

describe('page sections', () => {
  it('defines a schema for every kind', () => {
    for (const kind of ['hero', 'text', 'banner', 'faq', 'grid'] as const) {
      expect(SECTION_SCHEMAS[kind].length).toBeGreaterThan(0);
    }
  });

  it('builds empty content with a key per bilingual side', () => {
    const c = emptyContent('hero');
    expect(c).toHaveProperty('headingEn');
    expect(c).toHaveProperty('headingKa');
  });

  it('accepts valid content', () => {
    expect(validateSection('text', { bodyEn: 'hi', bodyKa: 'გამარჯობა' }).ok).toBe(true);
  });

  it('rejects a missing required English field', () => {
    const r = validateSection('text', { bodyEn: '', bodyKa: 'გამარჯობა' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('bodyEn');
  });

  it('rejects an unknown kind', () => {
    expect(validateSection('nope' as never, {}).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/page-sections`.

- [ ] **Step 3: Implement `lib/page-sections.ts`**

Define the five schemas. A bilingual field named `heading` produces the keys `headingEn` and `headingKa`.

- `hero`: heading (text, bilingual), subheading (textarea, bilingual), image (image), ctaLabel (text, bilingual), ctaHref (url)
- `text`: body (textarea, bilingual)
- `banner`: heading (text, bilingual), body (textarea, bilingual), image (image), href (url)
- `faq`: intro (textarea, bilingual) — the item list stays in the existing `faq` setting
- `grid`: heading (text, bilingual), columns (number), showCategories (boolean)

`emptyContent` returns every key set to `''`, `0`, or `false` by type. `validateSection` returns an error for each empty English-side field (Georgian is warned about in the UI, not rejected, so a page can be drafted in one language and translated after).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Build `BilingualField`**

A labelled EN input and KA input side by side (stacked below `sm`). When the KA value is empty and the EN value is not, show an inline warning: "Georgian translation missing". Per the global constraints, Georgian is first-class — the warning must be visible, not a subtle tint, and must meet AA contrast in both themes.

- [ ] **Step 6: Commit**

```bash
git add lib/page-sections.ts components/admin/BilingualField.tsx tests/lib/page-sections.test.ts
git commit -m "feat: add shared page-section schemas and a bilingual field"
```

---

## Task 19: Visual page editor replaces the JSON textarea

**Files:**
- Create: `components/admin/SectionEditor.tsx`
- Modify: `app/admin/content/ContentClient.tsx:412-419`, `app/api/admin/pages/[pageKey]/route.ts`

**Interfaces:**
- Consumes: `SECTION_SCHEMAS`, `emptyContent`, `validateSection` (Task 18); `BilingualField`; `SingleImageUploader`.
- Produces: `SectionEditor` with props `{ kind: SectionKind; content: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }`.

- [ ] **Step 1: Build `SectionEditor`**

Render one control per `SECTION_SCHEMAS[kind]` entry: `bilingual` fields use `BilingualField`; `image` uses `SingleImageUploader` with `folder="content"`; `url`, `number`, and `boolean` use `Input`/`Switch`. Unknown keys already present in the stored content are preserved on change, so hand-authored JSON is never silently dropped.

- [ ] **Step 2: Swap it into `ContentClient`**

Replace the raw JSON textarea with `<SectionEditor kind={section.type} content={section.content} onChange={...} />`. Changing a section's type resets its content to `emptyContent(newKind)` after a confirmation, since the fields differ.

Keep an "Edit as JSON" escape hatch behind a collapsible for anyone who needs it, and delete the MVP note at `ContentClient.tsx:23-24`, which no longer describes the file.

- [ ] **Step 3: Validate server-side too**

In `app/api/admin/pages/[pageKey]/route.ts`, run `validateSection` on each incoming section and return `fail` with the collected errors on failure. Client-side validation alone is not a guarantee.

- [ ] **Step 4: Verify in a browser**

Open `/admin/content`, add a hero section, fill EN only, and confirm the missing-Georgian warning appears. Fill KA, save, reload, and confirm the values persisted. Switch a section's type and confirm the reset prompt. Confirm an existing JSON-authored section still opens with its values populated.

- [ ] **Step 5: Commit**

```bash
git add components/admin/SectionEditor.tsx app/admin/content/ContentClient.tsx "app/api/admin/pages/[pageKey]/route.ts"
git commit -m "feat: replace the JSON section editor with typed forms"
```

---

## Task 20: Editable navigation, footer, and typography

**Files:**
- Modify: `models/Setting.ts`, `lib/theme.ts`, `app/admin/theme/ThemeClient.tsx`, `app/admin/content/ContentClient.tsx`, `app/[locale]/layout.tsx`, `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`, `app/api/admin/settings/route.ts`

**Interfaces:**
- Produces:
  - `SETTING_KEYS` gains `NAV: 'nav'`, `FOOTER: 'footer'`, `TYPOGRAPHY: 'typography'`
  - `getNavSettings(): Promise<NavSettings>`, `getFooterSettings(): Promise<FooterSettings>`, `getTypography(): Promise<Typography>` in `lib/theme.ts`
  - `themeOverrideCss` also emits `--font-display`, `--font-body`, and `--font-scale`

- [ ] **Step 1: Add the setting keys and types**

```ts
export interface NavLink { labelEn: string; labelKa: string; href: string; }
export interface NavSettings { links: NavLink[]; }
export interface FooterColumn { titleEn: string; titleKa: string; links: NavLink[]; }
export interface FooterSettings {
  columns: FooterColumn[];
  social: { platform: string; url: string }[];
  contact: { phone: string; email: string; addressEn: string; addressKa: string };
}
export interface Typography {
  displayFont: 'Inter' | 'Manrope' | 'Sora' | 'Georgia';
  bodyFont: 'Inter' | 'Manrope' | 'System';
  scale: number; // 0.9 – 1.15, multiplies the base size
}
```

Each getter reads its `Setting` and falls back to a documented default constant, exactly as `getStoreTheme` does today.

- [ ] **Step 2: Emit typography as CSS variables**

Extend `themeOverrideCss` to append `--font-display`, `--font-body`, and `--font-scale`. Wire `--font-scale` into the `html` font size so the whole type scale moves together. Clamp `scale` to `[0.9, 1.15]` server-side — an unclamped value from a bad write would make the live store unusable.

- [ ] **Step 3: Add the typography panel to `/admin/theme`**

A new "Typography" tab: two font selects and a scale slider, with the existing live preview card reflecting the choice.

- [ ] **Step 4: Add nav and footer editors to `/admin/content`**

New "Navigation" and "Footer" tabs. Each row is a `BilingualField` label plus an href input, with add, remove, and reorder controls, matching the reorder pattern already used by the FAQ manager.

- [ ] **Step 5: Consume the settings**

`app/[locale]/layout.tsx` fetches nav and footer settings and passes them to `Navbar` and `Footer`. Both components render the saved values when present and their current hardcoded defaults when the setting is empty, so nothing disappears before the settings are first saved.

- [ ] **Step 6: Revalidate on save**

The settings route calls `revalidateStorefront('content')` (or `'theme'`) after a successful write.

- [ ] **Step 7: Verify in a browser**

Add a footer column and a nav link, save, and confirm both appear on the storefront immediately. Change the display font and scale and confirm the storefront type changes. Check KA at 390px for wrapping in the new nav entries — per the global constraints, Georgian text is longer and this is where it breaks.

- [ ] **Step 8: Commit**

```bash
git add models/Setting.ts lib/theme.ts app/admin/theme app/admin/content "app/[locale]/layout.tsx" components/layout app/api/admin/settings/route.ts
git commit -m "feat: admin-editable navigation, footer, and typography"
```

---

## Task 21: Polish — logo uploader, theme draft/publish, RBAC split

**Files:**
- Modify: `app/admin/theme/ThemeClient.tsx:113-117`, `app/api/admin/theme/route.ts`, `lib/rbac.ts`, `components/admin/nav-config.ts:37-38`, `lib/theme.ts`

- [ ] **Step 1: Replace the logo text input with an uploader**

`ThemeClient.tsx:113-117` uses a plain text input for `logoUrl` while `SingleImageUploader` exists. Swap it, passing `folder="theme"`. Keep a manual URL entry option for externally hosted logos.

- [ ] **Step 2: Add draft / preview / publish**

`SETTING_KEYS.THEME_DRAFT` is defined with nothing behind it. Save edits to `theme_draft`. Add three actions: **Save draft** (writes `theme_draft`), **Preview** (opens the storefront with `?theme=draft`, which makes `getStoreTheme` read the draft for that request only), and **Publish** (copies the draft to `theme` and calls `revalidateStorefront('theme')`). Show an indicator when a draft differs from the live theme.

Gate the preview on an admin session — an unauthenticated visitor passing `?theme=draft` must get the live theme, not an unpublished one.

- [ ] **Step 3: Split the borrowed RBAC modules**

`nav-config.ts:37-38` gives Brands the `categories` module and Reviews the `products` module, so anyone who can see Products can see Reviews. Add `'brands'` and `'reviews'` to `AdminModule`, grant both to `SUPER_ADMIN` and `STORE_MANAGER`, and update the two nav entries plus the guards in the brands and reviews API routes.

- [ ] **Step 4: Verify**

As a CONTENT_EDITOR, confirm Brands and Reviews are hidden and their APIs return 403. Save a theme draft, preview it, confirm the live store is unchanged, then publish and confirm it updates. Confirm `?theme=draft` while signed out shows the live theme.

- [ ] **Step 5: Commit**

```bash
git add app/admin/theme app/api/admin/theme lib/rbac.ts lib/theme.ts components/admin/nav-config.ts app/api/admin/brands app/api/admin/reviews
git commit -m "feat: theme draft/publish, logo uploader, split brand and review RBAC"
```

---

## Task 22: Full verification pass

**Files:** none — verification only.

- [ ] **Step 1: Static checks**

```bash
npm run lint
npx tsc --noEmit
npm test
```

All three must pass. Stop `npm run dev` before the next step.

- [ ] **Step 2: Production build**

```bash
rm -rf .next && npm run build
```

Expected: clean build. Watch for "Dynamic server usage" errors — a page that accidentally became fully dynamic loses its ISR.

- [ ] **Step 3: Admin-to-storefront round trip**

For each of these, make the change in admin and confirm it on the storefront without restarting the server:

- rename a product → home, listing, and detail pages
- set a sale price → the product card and `/products/discounts`
- deactivate a product → it disappears everywhere
- rename a category → the navbar menu and the listing filters
- add a brand → the brand mega-menu
- change theme colors → the whole storefront
- edit a footer column → the footer
- adjust stock to zero → the product shows out of stock

- [ ] **Step 4: Screenshot matrix**

Screenshot the home, listing, detail, and discounts pages at 390px, 768px, and 1440px, in light and dark, in EN and KA — 48 shots. Check specifically for the failure modes this codebase has shipped before: blank sections, horizontal overflow at 768px, and Georgian text overflowing its container.

- [ ] **Step 5: Accessibility spot-check**

Verify AA contrast on the new sale badge, the bulk action bar, the missing-translation warning, and the inventory status badges, in both themes. Confirm the new checkbox column is keyboard-reachable and that its labels are announced.

- [ ] **Step 6: Update the docs**

In `plan.md`, mark open item #1 (storefront DB cutover) done and Phase 2 ✅. Remove item #6's `Navbar 2.tsx` note. In `CLAUDE.md`, update the "Data layer" section: the storefront now reads MongoDB through `lib/catalog.ts`, and `lib/mock-data.ts` is seed fixtures plus nothing else. Add the four new admin modules to the components list.

- [ ] **Step 7: Commit**

```bash
git add plan.md CLAUDE.md
git commit -m "docs: record the storefront cutover and the new admin modules"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §1 `lib/catalog.ts` data layer | 3, 4 |
| §1 type ownership | 1 |
| §1 files rewired | 6, 7, 8, 9, 10 |
| §1 brand model + seed fix | 2 |
| §1 freshness (ISR + revalidate) | 5, 6, 8 |
| §1 empty-state rule | 4, 6, 11 |
| §1 verification | 6, 7, 8, 9, 22 |
| §2 discounts storefront | 11 |
| §2 discounts admin | 14 |
| §3.1 bulk order actions | 12, 13 |
| §3.2 media library | 15, 16 |
| §3.3 inventory | 17 |
| §3.4 visual page editor | 18, 19 |
| §3.4 nav/footer/typography | 20 |
| §4 polish | 21 |

Every spec section maps to at least one task.

**Type consistency:** `Product`, `Category`, `Brand`, `CategorySlug`, and `ProductFilter` are defined once in Task 1 and imported everywhere after. `mapProduct` / `mapCategory` / `mapBrand` / `isOnSale` / `discountPercent` are defined in Task 3 and used with those exact names in Tasks 4 and 11. `revalidateStorefront` is defined in Task 5 and called with the same signature in Tasks 14, 17, and 20. The `DataTable` selection props defined in Task 12 are consumed unchanged in Tasks 13 and 14. `SECTION_SCHEMAS` / `emptyContent` / `validateSection` are defined in Task 18 and consumed in Task 19.

**Known sequencing constraint:** Task 2 must complete before Task 7, or the brand mega-menu renders empty. Tasks 1–10 are strictly sequential; 11 onward depend on the cutover but are otherwise independent of each other, except 12 → 13, 12 → 14, 15 → 16, and 18 → 19.
