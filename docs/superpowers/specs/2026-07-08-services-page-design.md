# Services Page + Admin CMS — Design Spec

**Date:** 2026-07-08
**Status:** Approved, ready for implementation plan

## Goal

Add a public **Services** page to the MoBax storefront listing physical in-store
services (film application), with a location map, fully editable by admins through
the existing admin panel. Also: add a "Services" nav link, and (already done in this
session) delete the Protection Films category and change the hero badge copy.

## Scope

### Already completed (trivial edits, this session)
- Hero badge: `100% Original · Tbilisi` → `5+ Years of Experience` / `5+ წლიანი გამოცდილება`
  ([app/[locale]/(shop)/page.tsx](../../../app/[locale]/(shop)/page.tsx))
- Deleted `protection-films` category (definition + union type) from
  [lib/mock-data.ts](../../../lib/mock-data.ts). No products referenced it.

### This spec covers
1. Nav link "Services" (desktop navbar, mobile menu, footer)
2. Public Services storefront page
3. Admin editing (services CRUD + page-level content)
4. Seed data

## Architecture

Follows the existing DB-backed admin CMS pattern (MongoDB + Mongoose + `requireAdmin`).
The storefront currently reads mock-data for products; the Services feature is the
first storefront surface to read live from Mongo. That is intentional and correct.

### Data models (MongoDB / Mongoose)

**`models/Service.ts`** — one document per service (full CRUD, orderable):
```
{
  titleEn: string (required)
  titleKa: string (required)
  descriptionEn: string (default '')
  descriptionKa: string (default '')
  image: string (URL, default '')       // Cloudinary URL via existing uploader
  order: number (default 0)             // sort ascending
  isActive: boolean (default true)      // hide without deleting
  timestamps: true
}
```

**`models/ServicePage.ts`** — single-document page-level content (heading + map).
Enforced single-doc by a fixed `key: 'services'` unique field, upserted like `Page`:
```
{
  key: 'services' (unique, const)
  headingEn: string    // main message, e.g. "Invisible protection for your beloved device"
  headingKa: string
  introEn: string (default '')   // optional supporting paragraph
  introKa: string (default '')
  mapEmbedUrl: string  // Google Maps iframe src
  addressEn: string    // text address shown near map
  addressKa: string
  updatedBy: string
  timestamps: true
}
```

### Validation ([lib/validations.ts](../../../lib/validations.ts))
Add Zod schemas mirroring existing product/category schemas:
- `CreateServiceSchema` / `UpdateServiceSchema` (partial)
- `UpdateServicePageSchema` — validates heading/intro/map/address; `mapEmbedUrl`
  must be a Google Maps embed URL (starts with `https://www.google.com/maps/embed`)
  or empty string.

### API routes (admin, guarded by `requireAdmin({ module: 'content' })`)
Reuse existing `ok`/`fail` helpers, `connectDB`, `logActivity`.

- `app/api/admin/services/route.ts` — `GET` (list all incl. inactive), `POST` (create)
- `app/api/admin/services/[id]/route.ts` — `PUT`/`PATCH` (update), `DELETE`
- `app/api/admin/service-page/route.ts` — `GET`, `PUT` (upsert single doc)

No public API route needed — the storefront page is a server component that reads
Mongo directly (same as admin GETs but filtered to `isActive: true`, ordered).

### Storefront page
**`app/[locale]/(shop)/services/page.tsx`** — server component, inherits `(shop)`
layout (navbar + footer). Reads:
- `ServicePage` doc (heading, intro, map, address) — falls back to sane defaults if absent
- `Service` list where `isActive: true`, sorted by `order`

Layout (matches existing storefront design tokens — cobalt/ink, Playfair display, rounded-2xl cards):
1. **Hero** — `heading` (display font, large) + `intro` paragraph
2. **Services grid** — responsive cards: image, title, description. Bilingual via `locale`.
3. **Location section** — Google Maps `<iframe>` (from `mapEmbedUrl`), address text,
   "Get directions" link opening the maps place in a new tab.

Bilingual: reads `locale` from route, picks `*En`/`*Ka` fields. Static UI strings
(section labels, "Get directions") added to `messages/en.json` + `messages/ka.json`
under a new `services` namespace.

### Navigation (Part 1)
- **Navbar** ([components/layout/Navbar.tsx](../../../components/layout/Navbar.tsx)) —
  add "Services" / "სერვისები" link after the Categories mega-menu, before search.
  Plain link (no dropdown) → `/${locale}/services`. Include in mobile menu.
- **Footer** ([components/layout/Footer.tsx](../../../components/layout/Footer.tsx)) —
  add Services link in the appropriate column.

### Admin UI
- **`app/admin/services/page.tsx`** + **`ServicesClient.tsx`** — client component:
  - Services table: image thumb, title (EN), active toggle, order, edit/delete actions
  - Add / edit form (modal or inline): EN+KA title, EN+KA description, image
    (reuse [components/admin/SingleImageUploader.tsx](../../../components/admin/SingleImageUploader.tsx)),
    order, isActive
  - Reorder: numeric `order` field (drag-reorder is out of scope — YAGNI)
  - Separate "Page content" form card: headingEn/Ka, introEn/Ka, mapEmbedUrl, addressEn/Ka
- **Nav registration** ([components/admin/nav-config.ts](../../../components/admin/nav-config.ts)) —
  add `{ label: 'Services', href: '/admin/services', icon: <pick>, module: 'content', group: 'Storefront' }`.
  Reuses existing `content` module permission — no `lib/rbac.ts` change.

### Seed ([scripts/seed.ts](../../../scripts/seed.ts))
- 2 services: "Applying Screen Films" / "ეკრანის ფილმის დაფენა",
  "Applying Leather Films" / "ტყავის ფილმის დაფენა" (placeholder images + descriptions)
- ServicePage doc:
  - heading: "Invisible protection for your beloved device" /
    "უხილავი დაცვა თქვენი საყვარელი მოწყობილობისთვის"
  - mapEmbedUrl: the real MOBAX embed (Tbilisi, `0x40446d0060083acf:0x7925389d80f40bdd`,
    lat 41.7930 / lng 44.8153):
    `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2409.147724542609!2d44.815260175260974!3d41.792993271251156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1783496076755!5m2!1sen!2sge`
  - address: MOBAX store, Tbilisi (admin can refine)

## Error handling
- Storefront page: if `ServicePage` doc absent → render with hardcoded default heading +
  empty map section (no crash). If no active services → show empty-state message.
- Admin API: same `AdminAuthError` → `fail(status)` pattern as existing routes; Zod
  parse failures → 422 with first issue message.
- Map iframe: `mapEmbedUrl` validated to Google Maps embed prefix to prevent arbitrary
  iframe injection (basic SSRF/clickjacking guard). Empty → hide map section.

## Testing / verification
No test suite in project (Phase 1). Verify by:
- `npm run seed` populates services + page doc
- Storefront `/en/services` + `/ka/services` render: hero, 2 cards, map iframe
- Admin `/admin/services`: create/edit/delete a service, edit page content, reload
  storefront reflects changes
- Nav link appears + routes correctly in both locales

## Out of scope (YAGNI)
- Drag-and-drop reorder (numeric order field instead)
- Booking/scheduling a service appointment
- Per-service pricing
- Wiring the rest of the storefront (products/categories) to Mongo — unchanged, stays mock
