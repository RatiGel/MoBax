# Services Page Product Catalog — Design

**Date:** 2026-07-08
**Status:** Approved

## Goal

Add a display-only product catalog to the storefront services page. Each catalog
product shows an image, bilingual name, and a "starts from XX GEL" price. Admins
can create, edit, and delete catalog products and manage their images.

## Non-goals (YAGNI)

- No cart / order / checkout integration — catalog is display-only.
- No SKU, stock, or inventory.
- No per-product detail page.
- No pagination, categories, filtering, or search.
- No reuse of the storefront `Product` model (that model carries cart/SKU/stock
  semantics that don't fit a "starts from" catalog).

## Data model

New Mongoose model `models/CatalogProduct.ts`, mirroring the existing `Service`
model conventions (bilingual fields, `order`, `isActive`, timestamps).

```
CatalogProduct {
  nameEn:        string  (required, trim)
  nameKa:        string  (required, trim)
  descriptionEn: string  (default '')
  descriptionKa: string  (default '')
  images:        string[]        // multi-image; first entry = cover
  priceFrom:     number  (required)   // e.g. 45 → "Starts from 45 ₾"
  order:         number  (default 0)  // ascending sort, lower first
  isActive:      boolean (default true)
  createdAt, updatedAt (timestamps)
}
```

Model guard uses the same `mongoose.models.X || mongoose.model(...)` pattern as
the other models in `models/`.

## Data layer

Extend `lib/services-data.ts` with:

```
getActiveCatalogProducts(): Promise<CatalogProductView[]>
```

- `connectDB()`, then `CatalogProduct.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean()`.
- Map to a plain `CatalogProductView` (stringified `_id`, no Mongoose Document)
  so it crosses the server/client boundary — same treatment as `ServiceView`.

`CatalogProductView` fields: `_id, nameEn, nameKa, descriptionEn, descriptionKa,
images, priceFrom, order`.

## Admin API

Mirror the services routes exactly. Auth via `requireAdmin({ module: 'content' })`
(same module the services routes use). Standard `ok`/`fail` helpers from
`@/lib/api`. `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.

- `app/api/admin/catalog/route.ts`
  - `GET`  → `{ products: CatalogProductView[] }` (all, incl. inactive), sorted by order.
  - `POST` → create from validated body; return created doc.
- `app/api/admin/catalog/[id]/route.ts`
  - `PUT`    → update by id.
  - `DELETE` → remove by id.

Validation: `nameEn`, `nameKa` required (non-empty after trim); `priceFrom` is a
finite number ≥ 0. Reject otherwise with `fail(msg, 400)`.

Image uploads reuse the existing `/api/admin/upload` Cloudinary route — no new
upload endpoint.

## Admin UI

Add a "Product catalog" section to the existing `app/admin/services/ServicesClient.tsx`,
below the current services `DataTable`. Reuses the file's existing primitives
(`PageHeader` action stays for services; catalog gets its own section header,
`DataTable`, `Dialog`, `ConfirmDialog`, `Field` helper).

Catalog table columns: cover thumbnail + name (EN over KA), `priceFrom`
(rendered `45 ₾`), order, status badge, edit/delete actions.

Catalog dialog fields:
- Name (EN) *, Name (KA) *
- Description (EN), Description (KA)
- Price from * — number input
- Images — **`ImageUploader`** (multi-image, `components/admin/ImageUploader.tsx`)
- Order — number
- Active — switch

Create/edit/delete handlers copy the existing service handlers (same
`apiFetch` + `toast` + reload pattern), pointed at `/api/admin/catalog`.

State is kept separate from the services state in the same component
(`catalog`, `catalogDialogOpen`, `editingCatalog`, `catalogValues`, etc.).

## Storefront

In `app/[locale]/(shop)/services/page.tsx`:

- Add `getActiveCatalogProducts()` to the existing `Promise.all`.
- New `<section>` placed **between** the services grid section and the
  "How it works" process section.
- Heading: `t('sectionCatalog')`.
- Responsive card grid (e.g. `grid gap-6 sm:grid-cols-2 lg:grid-cols-3`),
  matching the existing card visual language (rounded-3xl, border, surface bg).
- Each card: cover image (`images[0]`, `next/image`), name, and price line
  `t('startsFrom', { price })` → "Starts from 45 ₾" / "იწყება 45 ₾-დან".
- If a product has no image, fall back to the existing `FALLBACK_IMAGES`
  rotation by index.
- If catalog is empty, the section renders nothing (no empty-state noise on the
  public page).

## i18n

Add to the `services` namespace in both `messages/en.json` and `messages/ka.json`:

- `sectionCatalog` — "Product catalog" / "პროდუქტების კატალოგი"
- `startsFrom` — "Starts from {price} ₾" / "იწყება {price} ₾-დან"

(`noCatalog` not needed — empty catalog renders nothing on storefront.)

## Testing / verification

No automated test suite in repo. Manual verification:
1. Admin: create a catalog product with 2+ images and a price → appears in admin table.
2. Storefront (EN + KA): product shows in new section with correct "starts from" label.
3. Admin: edit price/images, toggle inactive → storefront reflects change (inactive hidden).
4. Admin: delete → removed from both admin table and storefront.
