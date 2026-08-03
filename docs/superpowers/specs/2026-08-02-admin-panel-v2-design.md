# MoBax Admin Panel v2 — Design

**Date:** 2026-08-02
**Status:** Approved, ready for implementation planning

## Problem

The admin panel is not broken. An audit of `app/admin/` found 15 modules, all
performing real CRUD against real API routes, built on shadcn primitives with
RBAC, dark mode, and a consistent design language. Discounts and promotions
already have a full UI at `/admin/pricing`.

The reason it feels broken is one structural gap: **the admin writes to MongoDB,
but the storefront reads `lib/mock-data.ts`.** Editing a product in admin does
not change the public site. This is `plan.md` open item #1.

Database state verified 2026-08-02:

| Collection | Count |
|---|---|
| products | 24 |
| categories | 25 |
| orders | 60 |
| discounts | 4 |
| users | 12 |
| services | 2 |
| **brands** | **0** |
| pages | 0 |
| settings | 1 (`faq` only) |

Product `_id` values are seed ids (`"1"`, `"2"`…), so the DB matches the
fixtures. The empty `brands` collection is a blocker: `scripts/seed.ts:67-69`
derives brands from distinct product `brand` strings and drops the `type` and
`compatTerms` fields that `lib/mock-data.ts:762-778` defines. Cutting the navbar
over to the DB without fixing this empties the brand mega-menu.

## Goals

1. Admin edits appear on the public storefront.
2. A "Discounts" category that populates itself from sale prices.
3. Order tracking that answers "who ordered what, to what address" from the list
   view.
4. Four capability additions: bulk order actions, media library, inventory, and
   a visual page editor.

## Non-goals

Payment go-live, a test suite, Vercel deployment config, and a full visual
overhaul of the existing 15 modules. The shell and design language stay.

---

## Section 1 — Storefront database cutover

The foundation. Everything else is invisible without it.

### `lib/catalog.ts` — the data layer

One server-side module is the only path from storefront pages to product data.
Storefront files import from here, never from `lib/mock-data.ts`.

```ts
getProducts(filter?: ProductFilter): Promise<Product[]>
getProductBySlug(slug: string): Promise<Product | null>
getCategories(): Promise<Category[]>
getBrands(): Promise<Brand[]>
getProductsByBrand(slug: string): Promise<Product[]>
getFeaturedProducts(): Promise<Product[]>
getNewArrivals(): Promise<Product[]>
getDiscountedProducts(): Promise<Product[]>
```

Each function issues a Mongoose `.lean()` query and maps the document to the
same `Product` / `Category` shapes the storefront components already consume, so
`ProductCard`, `HeroProduct`, and the product detail page need no prop changes.

### Type ownership

The canonical `Product`, `Category`, and `Brand` interfaces move from
`lib/mock-data.ts` to a new `lib/types.ts`. `lib/mock-data.ts` re-exports them
during the transition and is demoted to seed-fixture data only. Its
`getBrandBySlug` / `getProductsByBrand` helpers move to `lib/catalog.ts` with DB
queries behind the same signatures.

### Files rewired

- `app/[locale]/(shop)/page.tsx`
- `app/[locale]/(shop)/products/page.tsx`
- `app/[locale]/(shop)/products/[slug]/page.tsx`
- `components/layout/Navbar.tsx` (categories + brands)
- `components/shop/ProductCard.tsx`, `components/shop/HeroProduct.tsx` (type
  imports only → `lib/types.ts`)
- `lib/assistant/catalog.ts`, `lib/assistant/conversation.ts`,
  `app/api/chat/route.ts` — the shopping assistant currently recommends fixture
  products, the same bug in a different surface
- Delete `components/layout/Navbar 2.tsx` (stray duplicate)

### Brand model and seed fix

`models/Brand.ts` gains `type: 'device' | 'maker'` and `compatTerms: string[]`.
`scripts/seed.ts` seeds brands from the `brands` fixture array rather than
deriving them from product strings, preserving both fields.

`getProductsByBrand` keeps its current semantics: a `maker` brand matches
products whose `brand` field equals the brand name; a `device` brand matches
those plus products whose `specs.Compatibility` contains any `compatTerms`
entry.

### Freshness

Storefront pages set `export const revalidate = 60`. Admin mutation routes call
`revalidatePath()` for the paths their change affects (product → `/[locale]`,
`/[locale]/products`, `/[locale]/products/[slug]`; category/brand → those plus
the navbar-bearing layout), so edits appear immediately rather than within a
minute.

### Empty-state rule

If a DB query returns nothing, the page renders its empty state. It never falls
back to fixtures. Silent fallback reproduces the exact "I edited it and nothing
changed" confusion this work exists to remove.

### Verification

Per `CLAUDE.md`, UI changes are verified in a browser: screenshot the home,
listing, and detail pages at several widths, in both themes, in EN and KA. Then
edit a product in admin and confirm the change appears on the storefront.

---

## Section 2 — Discounts as an automatic virtual category

Automatic, not manual. A product is discounted when:

```
salePrice != null
  AND salePrice < price
  AND (salePriceStart == null OR salePriceStart <= now)
  AND (salePriceEnd   == null OR salePriceEnd   >  now)
```

All four fields already exist on `models/Product.ts`.

### Storefront

- Route `/[locale]/products/discounts` lists qualifying products, sorted by
  discount percentage descending.
- Products keep their real category. No category document is created and nothing
  is moved.
- Cards show the struck-through original price and a percentage badge.
- The category appears in navigation only when at least one product qualifies.

### Admin

- `/admin/products` gains an "On sale" filter.
- A bulk **Set sale** action: select products, then apply either a percentage off
  or a fixed sale price, with optional start and end dates. A **Clear sale**
  action removes it.
- The products table shows a sale column so the discounted set is visible at a
  glance.

---

## Section 3 — New and upgraded modules

### 3.1 Bulk order actions

`PATCH /api/admin/orders/bulk` exists (`{ids[], status}`, with stock restoration
for CANCELLED and REFUNDED) and has no UI — the only unreachable admin endpoint.

- `components/admin/DataTable.tsx` gains optional row selection: a checkbox
  column, a header select-all bound to the current page, and a selection count.
  `components/ui/checkbox.tsx` already exists and is unused by admin.
- `OrdersClient` gets a bulk status-change action bar that appears when rows are
  selected, with a confirmation step naming the count and target status.
- The orders list gains a shipping-address column (city plus a truncated street,
  full value on hover) and a customer column, so "who ordered what, to where"
  reads off the list without opening each order.

### 3.2 Media library

New `/admin/media` module.

- New `models/Media.ts`: `url`, `publicId`, `folder`, `width`, `height`,
  `bytes`, `format`, `alt`, `uploadedBy`, `createdAt`.
- `app/api/admin/upload/route.ts` records a `Media` document on every upload.
  Two bugs are fixed there: the RBAC module is hardcoded to `'products'`, which
  blocks a content editor from uploading category or service images; and every
  upload lands in the `mobax/products` Cloudinary folder regardless of caller.
  Both become caller-supplied.
- `GET /api/admin/media` (paginated, searchable by alt and folder) and
  `DELETE /api/admin/media/[id]`.
- The module is a grid with search, folder filter, alt-text editing, and delete.
  Delete first checks for references in products, categories, and services, and
  warns before proceeding.
- `components/admin/ImageUploader.tsx` and `SingleImageUploader.tsx` gain a
  "Choose from library" tab beside "Upload", so images are reused rather than
  re-uploaded.

### 3.3 Inventory

New `/admin/inventory` module.

- `models/Product.ts` gains `lowStockThreshold` (default 5).
- Stock adjustments are made with a reason — restock, damage, correction, or
  return — and each writes an `ActivityLog` entry, so stock history is
  auditable.
- The module lists products sorted by stock ascending, filterable to
  at-or-below-threshold and out-of-stock.
- The dashboard low-stock card links here and uses the per-product threshold
  rather than a single global number.

### 3.4 Visual page editor

`ContentClient.tsx:412-419` edits section `content` as a raw JSON textarea. Its
own header comment marks this as MVP. Nobody can author a section without
knowing its JSON shape, which is documented nowhere.

- A typed form per section kind — `hero`, `text`, `banner`, `grid`, `faq` —
  replaces the textarea. Section schemas live in one module
  (`lib/page-sections.ts`) so the admin form and the storefront renderer read
  from the same definition.
- Every text field is bilingual: EN and KA inputs side by side, with a visible
  warning when KA is empty. Per `CLAUDE.md`, Georgian is first-class.
- Home page controls become real: hero product and image, which categories
  appear, featured product picks, and trust badges.
- Navigation and footer become editable — menu links, footer columns, social
  links, contact details — stored under new `nav` and `footer` setting keys.
- `/admin/theme` gains typography and spacing: font family choice and a base
  size scale, stored under a new `typography` setting key and emitted by
  `lib/theme.ts` as CSS variables alongside the existing color overrides.

New `SETTING_KEYS` entries: `NAV`, `FOOTER`, `TYPOGRAPHY`.

---

## Section 4 — Polish

Targeted fixes to existing modules. No restyling.

- `/admin/theme`: `logoUrl` is a plain text input while `SingleImageUploader`
  exists two directories away. Swap it.
- `theme_draft` is defined in `SETTING_KEYS` with no flow behind it. Give the
  theme page a draft/preview/publish cycle so brand changes can be reviewed
  before they hit the live store.
- `components/admin/nav-config.ts:37-38`: Brands and Reviews borrow the
  `categories` and `products` RBAC modules, so anyone who can see Products can
  see Reviews. Give both their own modules in `lib/rbac.ts`.

---

## Risks

- **The cutover is the risky change.** It touches every storefront page. The
  empty-state rule means a mistake shows as a blank section rather than stale
  data — visible, not silent. Browser verification at several widths, in both
  themes and locales, is required before it is considered done.
- **`brands` is empty.** Seeding it is a prerequisite for the Navbar rewire, not
  a follow-up.
- **`npm run build` while `npm run dev` is running corrupts `.next`**
  (`CLAUDE.md`). Stop dev first.
- **Contrast is a hard requirement.** New UI uses var-driven semantic colors and
  pins interactive fills carrying white text to `#2E5BFF`, per the design system
  notes in `CLAUDE.md`.

## Implementation order

1. Section 1 — cutover. Nothing else is visible until this lands.
2. Section 2 — discounts.
3. Section 3 — new modules, in the order listed.
4. Section 4 — polish.
