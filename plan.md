# MoBax — Full Site Plan

> Bilingual (EN/KA) mobile accessories e-commerce for the Georgia market.
> Stack: Next.js 14 App Router · TypeScript strict · MongoDB · Mongoose · NextAuth v5 · Zustand · next-intl · Tailwind

> **Doc status:** refreshed 2026-08-02 against the actual codebase. Phases 1–10
> are built; the remaining work is listed under "Open work" below. Historical
> phase plans are kept as a record of intent, annotated where the shipped
> implementation diverged.

---

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Frontend foundation | ✅ Done |
| 2 | Database + API routes | ✅ MongoDB + Mongoose live; storefront reads the DB through `lib/catalog.ts` |
| 3 | Authentication | ✅ NextAuth v5 Credentials + RBAC (owner/admin/staff) |
| 4 | File uploads + media | ✅ Cloudinary upload (needs API keys to go live) |
| 5 | Order management | ✅ stock reserve, guest tracking, CSV export, bulk + per-order status |
| 6 | Payment integration | 🟡 **Flitt** hosted checkout on sandbox merchant; no Stripe/TBC/BOG |
| 7 | Admin panel | ✅ 14 modules (dashboard + 13 sections) |
| 8 | Search + Reviews | ✅ regex search + navbar bar; reviews w/ moderation + verified purchase |
| 9 | Email + Notifications | ✅ **nodemailer/SMTP** + React Email templates (needs SMTP creds) |
| 10 | Deployment + CI/CD | 🟡 GitHub Actions CI (lint + typecheck + build); Vercel env/domain still manual |

### Divergences from the original plan

The plan below was written before implementation. Where the build went a
different way, the reason is recorded so the choice isn't silently re-litigated:

| Area | Planned | Shipped | Note |
|------|---------|---------|------|
| Database | PostgreSQL + Prisma (Neon) | **MongoDB + Mongoose** | No `prisma/` dir exists. Models in `models/*.ts`. |
| Payments | Stripe + TBC + BOG + COD | **Flitt only** (`PAYMENT_METHODS = ['FLITT']`) | Single Georgian gateway, hosted checkout, SHA1-signed webhook. |
| Email | Resend | **nodemailer/SMTP** | `resend` is still in package.json but `lib/email/send.ts` uses nodemailer. |
| Search | Postgres FTS → Algolia | **Mongo regex** (`app/api/search/route.ts`) | Fine at current catalog size; revisit if it grows. |
| Admin route | `app/[locale]/(admin)/` | **`app/admin/`** (not locale-prefixed) | Admin is English-only by design. |
| Auth roles | `CUSTOMER \| ADMIN` | **owner / admin / staff / customer** | See `lib/rbac.ts` + `models/User.ts`. |

---

## Open work

The highest-value items remaining, in priority order.

1. ~~**Finish Phase 2 — cut the storefront over to the database.**~~ **Done.**
   The storefront now reads MongoDB through `lib/catalog.ts` (`mapProduct` /
   `mapCategory` / `mapBrand`, `getProducts`, `getCategories`, `getBrands`,
   `getDiscountedProducts`, etc.) instead of importing `lib/mock-data.ts`
   directly. An eslint `no-restricted-imports` rule blocks both `@/lib/mock-data`
   and relative-path imports of it from anywhere outside `scripts/seed.ts`, so
   the cutover can't silently regress. `lib/mock-data.ts` is now seed-fixture
   data only (what `scripts/seed.ts` seeds from) plus the canonical `Product` /
   `Category` / `Brand` types. Editing a product, category, brand, or theme
   setting in admin now changes the public site without a redeploy, subject to
   the ISR revalidate window (60s) or an explicit `revalidateStorefront()` call
   on the mutating route.

2. **Payments — go live.** Flitt is wired end-to-end but points at the sandbox
   merchant (`1549901` / `"test"`). Swap `FLITT_MERCHANT_ID` / `FLITT_PAYMENT_KEY`
   to the real merchant — no code change needed. Decide whether Cash on Delivery
   is still wanted; it is in the original plan but not implemented.

3. **Deployment.** Add env vars to Vercel (preview + production), point
   `mobax.ge` + `www.mobax.ge` at it, enable Analytics + Speed Insights.

4. **Tests.** 46 unit tests exist (`vitest`, `npm test`) covering `lib/catalog.ts`,
   `lib/page-sections.ts`, and validation schemas. No integration/e2e suite yet;
   CI runs lint + typecheck + build + test.

5. **Content cleanup.** The live FAQ setting contains a placeholder entry
   (`"awrer"`); because the storefront prefers saved FAQ items over the i18n
   fallbacks, that one entry replaces all five real questions on the home page.

6. **Housekeeping.** `resend` is an unused dependency.

7. **`/[locale]/products/[slug]` is fully dynamic.** It declares `revalidate = 60`
   but has no `generateStaticParams`, so every request hits MongoDB — likely the
   highest-traffic route on the site. Add `generateStaticParams` (top-N by
   view count or featured flag) with `dynamicParams = true` so the long tail
   still resolves on demand.

8. **`Category.productCount` is stale.** No admin route recomputes it on
   product create/update/delete — it only ever reflects the original seed.
   `getBrandProductCounts()` in `lib/catalog.ts` computes brand counts live;
   categories should get the same treatment (or the field should be dropped
   and callers should compute counts on read, matching brands).

### Out-of-plan bugs found and fixed during the admin-panel-v2 build

These were not in the original task list — they surfaced during verification
of unrelated tasks and were fixed with owner approval:

- **Seeded product ids treated as ObjectIds.** `app/api/admin/products/[id]/route.ts`
  validated ids with `ObjectId.isValid()`, but `models/Product.ts` declares
  `_id` as `String` (seeded ids are `"1"`..`"23"`). Every GET/PATCH/DELETE on a
  seeded product 404'd, so editing or deleting a product from admin silently
  did nothing. Fixed to accept string ids (commit `47b9d4f`). Every other admin
  model uses a real `ObjectId` `_id`, so their routes were left unchanged.

- **`.partial()` update schemas silently overwrote data with Zod defaults.**
  Every update schema in `lib/validations.ts` was `CreateXSchema.partial()`.
  `.partial()` only makes keys optional — it does not strip `.default()` — so a
  `PATCH { stock: 5 }` still carried every other field's default through Zod's
  parse and overwrote it: descriptions blanked, tags reset, `isActive` could
  flip back to `true` on a disabled record. This was masked until the id bug
  above was fixed (the routes 404'd before reaching the parse). Fixed with a
  `toUpdateSchema()` helper (uses Zod's `removeDefault()`, which preserves
  `.max()` / `.url()` / enum / nested constraints) applied to all seven update
  schemas — product, category, brand, discount, promotion, service,
  catalogProduct (commits `725f805`, `e3ce3b5`). **Never write
  `CreateXSchema.partial()` for an update schema in this codebase — always use
  `toUpdateSchema()`.**

- **The low-stock inventory filter matched nothing.** Mongoose schema defaults
  only apply to documents written *after* the field is added to the schema,
  and MongoDB's `$lte` never matches a *missing* field — so 22 of the 23 seeded
  products were invisible to the admin Low-stock filter and dashboard count.
  Fixed with an `$ifNull` fallback to `DEFAULT_LOW_STOCK_THRESHOLD` (exported
  from the model so the query and the schema default can't drift) plus an
  idempotent backfill script (commit `b7af0a0`).

---

## Phase 1 — Frontend Foundation ✅

Pages: home, product listing, product detail, cart, checkout, login, register.
Components: Navbar, Footer, LocaleSwitcher, ThemeToggle, ProductCard, CartDrawer.
State: Zustand cart persisted to localStorage (`mobax-cart`).

Since shipped, also: services catalog, search page, account area, guest order
tracking, support chat, before/after comparison slider, FAQ section.

---

## Phase 2 — Database + API Routes ✅

### Shipped: MongoDB + Mongoose (not Prisma/Postgres)

Connection helper: `lib/mongodb.ts`. Models live in `models/`:

```
User            email, passwordHash, firstName, lastName, role, createdAt
Product         slug, nameEn/Ka, descriptionEn/Ka, price, originalPrice?,
                sku, stock, category, brand, isActive, isFeatured, isNew
Category        slug, nameEn/Ka, parentId?, image
Brand           name, slug, type (device | maker), logoUrl?
Order           userId?, guestEmail?, status, subtotal, shippingCost, total,
                addressSnapshot, items[], paymentStatus, trackingNumber
Review          userId, productId, rating(1-5), title, body, isApproved
Setting         key/value store — theme, branding, FAQ, shipping, hours
```

Beyond the original plan: `CatalogProduct`, `Service`, `ServicePage`, `Page`,
`Discount`, `Promotion`, `Invite`, `ActivityLog`, `Conversation`,
`SupportMessage`.

### Enums

```
OrderStatus:  PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED
UserRole:     owner | admin | staff | customer
```

### API routes

```
GET    /api/products                   list + filter + sort + paginate
GET    /api/products/[slug]            single product
GET    /api/categories                 all categories
GET    /api/brands                     all brands
GET    /api/search                     regex search across name/brand/sku

POST   /api/orders                     create order (guest or authed)
GET    /api/orders/[id]                get order by id (owner or admin)

GET    /api/reviews/[productSlug]      reviews for product
POST   /api/reviews                    submit review (authed)

POST   /api/payments/webhook           Flitt callback (SHA1-verified)
GET    /api/payments/success|fail      Flitt redirect targets

POST   /api/admin/upload               Cloudinary upload
POST   /api/chat                       support assistant
POST   /api/support                    support message intake
       /api/admin/*                    per-module admin CRUD
```

### Remaining tasks

- [x] Replace `lib/mock-data.ts` reads in storefront pages with DB calls through `lib/catalog.ts`
- [ ] Loading skeletons on product listing and detail
- [ ] Error boundaries + 404 / empty state pages
- [ ] Rate limiting on POST routes

Done: seed script (`npm run seed` → `scripts/seed.ts`, idempotent, seeds
categories, brands, products, 3-role admin users, customers, date-spread orders
for analytics, discount codes).

---

## Phase 3 — Authentication ✅

NextAuth v5 (Auth.js), Credentials provider, JWT session strategy.

```
auth.ts                        NextAuth config
app/api/auth/[...nextauth]/route.ts
app/api/auth/register/route.ts
lib/admin-auth.ts              server-side admin guards
lib/rbac.ts                    role helpers (canSeeAdminPanel, etc.)
middleware.ts                  locale routing + /account + /admin protection
```

Roles are four-tier (owner / admin / staff / customer) rather than the planned
two, with an invite flow (`models/Invite.ts`, `/admin/setup`) for onboarding
staff. Session carries `id`, `email`, `role`.

Pages: login, register, account (profile, orders, messages), guest order lookup.

---

## Phase 4 — File Uploads + Media ✅

Cloudinary. `lib/cloudinary.ts` + `POST /api/admin/upload`, with a drag-drop
`components/admin/ImageUploader.tsx`. Remote patterns configured in
`next.config.js`. Needs `CLOUDINARY_URL` +
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` to go live.

---

## Phase 5 — Order Management ✅

```
Cart → Checkout (address) → Checkout (payment) → Order created (PENDING)
  → Payment confirmed → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
  → Optional: CANCELLED / REFUNDED
```

Guest checkout by email, no account required; lookup at
`/[locale]/orders/[id]?email=...`. Stock is reserved on order create and
released on cancel. Admin has bulk status updates and CSV export.

---

## Phase 6 — Payment Integration 🟡

### Shipped: Flitt hosted checkout (single provider)

Server-to-server create-order call returns a hosted `checkout_url`; the buyer is
redirected there. Flitt POSTs an authoritative SHA1-signed callback to
`/api/payments/webhook`, which marks the order PAID. Amounts are sent in minor
units (tetri = GEL × 100).

```
lib/payments/index.ts            PAYMENT_METHODS = ['FLITT']
lib/payments/flitt-signature.ts  SHA1 request/callback signing
lib/payments/flitt-status.ts     status mapping
app/api/payments/webhook         authoritative status callback
app/api/payments/success|fail    browser redirect targets
```

- [ ] Swap sandbox merchant (`1549901` / `"test"`) for the real
      `FLITT_MERCHANT_ID` / `FLITT_PAYMENT_KEY` — no code change
- [ ] Decide on Cash on Delivery (planned, not implemented)
- [ ] Refund flow

Stripe / TBC Pay / BOG Pay from the original plan were not built.

---

## Phase 7 — Admin Panel ✅

Route: `app/admin/` (not locale-prefixed — admin is English-only).
Guarded in `middleware.ts` plus a server-side check on each page;
`/admin/setup` stays public for invite redemption.

```
/admin                dashboard: revenue, orders, low stock, activity
/admin/products       + ProductForm (images, specs, pricing, stock)
/admin/categories     /admin/brands        /admin/orders
/admin/customers      /admin/pricing       /admin/content
/admin/team           /admin/settings      /admin/reviews
/admin/services       /admin/theme         /admin/messages
/admin/media          /admin/inventory
```

Components: `DataTable`, `ImageUploader`, `SingleImageUploader`, `StatCard`,
`StatusBadge`, `PageHeader`, `ConfirmDialog`, `DateRangeFilter`,
`BilingualField`.

Beyond plan: live theme/branding editor with a draft → preview → publish flow
(`/admin/theme` → `lib/theme.ts` injects CSS-var overrides at runtime; the
preview uses Next's `draftMode()` gated on an admin session, never a public
query string), a media library (`/admin/media`, backed by `models/Media.ts`,
folder-scoped uploads shared with `ImageUploader`/`SingleImageUploader`), a
per-product inventory module (`/admin/inventory` — All/Low/Out filters,
audited stock adjustments via `ActivityLog`), bulk order status actions and
bulk sale pricing (both via the shared `DataTable` selection props), a visual
page-section editor (typed forms per section kind, replacing the original
raw-JSON textarea), admin-editable nav/footer/typography settings, services
catalog, CMS pages, discount and promotion management, team invites, activity
log, support inbox.

---

## Phase 8 — Search + Reviews ✅

Search is a case-insensitive Mongo regex over name/brand/sku
(`app/api/search/route.ts`, `LIMIT = 10`) — not Postgres FTS. Debounced navbar
`SearchBar` with dropdown results plus a full `/[locale]/search` page.

Reviews: 1–5 stars + title + body, admin moderation queue
(`isApproved = false` by default), verified-purchase badge, aggregate rating on
card and detail page.

---

## Phase 9 — Email + Notifications ✅

**nodemailer over SMTP** (not Resend). `lib/email/send.ts` + React Email
templates in `lib/email/templates/`:

```
OrderConfirmation.tsx   OrderShipped.tsx   OrderDelivered.tsx
Welcome.tsx             AdminNewOrder.tsx  Layout.tsx / styles.ts
```

Preview at `/email-preview`. Telegram notifications also exist
(`lib/telegram.ts`). Needs SMTP credentials to send.

- [ ] Password reset (token + email link) — templates exist, flow not wired

---

## Phase 10 — Deployment + CI/CD 🟡

### Infrastructure

```
Vercel        Next.js hosting
MongoDB Atlas database
Cloudinary    image CDN
Flitt         payments
SMTP          transactional email
```

### Environment variables

```
# DB
MONGODB_URI

# Auth
NEXTAUTH_SECRET
NEXTAUTH_URL

# Cloudinary
CLOUDINARY_URL
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

# Payments (Flitt)
FLITT_MERCHANT_ID
FLITT_PAYMENT_KEY

# Email (SMTP)
SMTP_HOST  SMTP_PORT  SMTP_USER  SMTP_PASS
EMAIL_FROM
ADMIN_EMAIL

# Notifications (optional)
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID

# App
NEXT_PUBLIC_SITE_URL
```

### CI/CD

`.github/workflows/ci.yml` runs on push to `main` and every PR:
checkout → `npm ci` → lint → `tsc --noEmit` → build, with placeholder env so
the build compiles without real secrets.

### Deployment checklist

- [x] GitHub Actions CI
- [ ] Link GitHub repo to Vercel
- [ ] Add env vars in Vercel (preview + production)
- [ ] Vercel preview deploys on every PR
- [ ] Custom domain: `mobax.ge` + `www.mobax.ge`
- [ ] Enable Vercel Analytics + Speed Insights
- [ ] Add a test job once a suite exists

---

## Technical decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Database | MongoDB + Mongoose | flexible schema for a fast-moving catalog; no migration step |
| Auth | NextAuth v5 | integrates with App Router, flexible |
| Payments | Flitt | single Georgian gateway, hosted checkout — no PCI scope |
| Search | Mongo regex | adequate at current catalog size; revisit if it grows |
| Email | nodemailer + React Email | SMTP works with any provider; templates stay in React |
| Images | Cloudinary | generous free tier, transform API |
| State | Zustand | cart, persisted to localStorage |
| Forms | native + zod | `lib/validations.ts`, shared client + server |
| Theming | CSS vars + next-themes | admin can restyle the brand live without a deploy |

---

## Design system

Committed in `PRODUCT.md` (register: product) and enforced in
`app/globals.css` + `tailwind.config.ts`.

- **Palette:** neutral-led, single cobalt accent (`#2E5BFF`; `#5C7CFF` lifted for
  dark mode). Brand tokens are stored as space-separated RGB channels so
  Tailwind opacity modifiers work and `/admin/theme` can override them live.
- **Contrast:** WCAG 2.1 AA in both themes. `graphite` (secondary text) is
  var-driven so it tracks the theme — it must, since a hardcoded value silently
  failed AA across the whole dark-mode storefront.
  Interactive pills pin to `#2E5BFF` because the lifted dark cobalt drops white
  text below 4.5:1.
- **Type:** Inter (EN) / BPG Nino Mtavruli + Noto Sans Georgian (KA). Both
  locales are first-class; check KA for wrapping when changing any layout.
- **Motion:** reveals must enhance an already-visible default — never gate
  content on a viewport trigger, or it ships blank to crawlers and prerenders
  (`components/shop/Reveal.tsx` documents the failure mode).

---

## Folder structure (actual)

```
app/
  [locale]/
    (shop)/     page, products/[slug], cart, checkout, search,
                services, orders/[id], account/{orders,messages}
    (auth)/     login, register
  admin/        dashboard + 15 modules (see Phase 7) — not locale-prefixed
  api/          products, categories, brands, search, orders, reviews,
                payments/{webhook,success,fail}, admin/*, auth/*, chat, support
  email-preview/
components/
  ui/           shadcn primitives
  shop/         ProductCard, CartDrawer, HeroProduct, Reveal, FaqSection, …
  layout/       Navbar, Footer, LocaleSwitcher, ThemeToggle, AccountMenu
  admin/        DataTable, ImageUploader, SingleImageUploader, StatCard,
                StatusBadge, BilingualField, …
lib/            mongodb, store, utils, rbac, theme, faq, catalog, catalog-map,
                revalidate, media-folders, payments/, email/, cloudinary,
                validations, mock-data (→ seed fixtures + types)
models/         18 Mongoose models
scripts/seed.ts
messages/       en.json · ka.json
```
