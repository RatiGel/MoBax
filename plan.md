# MoBax — Full Site Plan

> Bilingual (EN/KA) mobile accessories e-commerce for Georgia market.
> Stack: Next.js 14 App Router · TypeScript strict · PostgreSQL · Prisma · Zustand · next-intl · Tailwind

---

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Frontend foundation | ✅ Done |
| 2 | Database + API routes | ✅ Done (MongoDB + Mongoose) |
| 3 | Authentication | ✅ Done (NextAuth v5 Credentials) |
| 4 | File uploads + media | ⬜ |
| 5 | Order management | ⬜ |
| 6 | Payment integration | ⬜ |
| 7 | Admin panel | ⬜ |
| 8 | Search + Reviews | ⬜ |
| 9 | Email + Notifications | ⬜ |
| 10 | Deployment + CI/CD | ⬜ |

---

## Phase 1 — Frontend Foundation ✅

Already built. See `lib/mock-data.ts` for current fixtures.

Pages: home, product listing, product detail, cart, checkout, login, register.
Components: Navbar, Footer, LocaleSwitcher, ThemeToggle, ProductCard, CartDrawer.
State: Zustand cart persisted to localStorage.

---

## Phase 2 — Database + API Routes

### Database schema (PostgreSQL via Prisma)

```
User            id, email, passwordHash, firstName, lastName, role, createdAt
Address         id, userId, firstName, lastName, address, city, zipCode, country, isDefault
Category        id, slug, nameEn, nameKa, parentId?, image
Product         id, slug, nameEn, nameKa, descriptionEn, descriptionKa,
                price, originalPrice?, sku, stock, categoryId, brandId,
                isActive, isFeatured, isNew, createdAt
Brand           id, name, logoUrl?
ProductImage    id, productId, url, position, isMain
ProductSpec     id, productId, key, value
Order           id, userId?, guestEmail?, status, subtotal, shippingCost,
                total, addressSnapshot(JSON), createdAt, updatedAt
OrderItem       id, orderId, productId, nameSnapshot, priceSnapshot, quantity
Review          id, userId, productId, rating(1-5), title, body, isApproved, createdAt
```

### Enums

```
OrderStatus:  PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED
UserRole:     CUSTOMER | ADMIN
```

### API routes (Next.js route handlers)

```
GET    /api/products                   list + filter + sort + paginate
GET    /api/products/[slug]            single product
GET    /api/categories                 all categories
GET    /api/brands                     all brands

POST   /api/orders                     create order (guest or authed)
GET    /api/orders/[id]                get order by id (owner or admin)
PATCH  /api/orders/[id]/status         admin: update status

GET    /api/reviews/[productSlug]      reviews for product
POST   /api/reviews                    submit review (authed)

GET    /api/admin/products             admin product list
POST   /api/admin/products             create product
PATCH  /api/admin/products/[id]        update product
DELETE /api/admin/products/[id]        soft-delete

GET    /api/admin/orders               admin order list with filters
GET    /api/admin/stats                dashboard numbers
```

### Tasks

- [ ] `prisma init` + schema.prisma with all models
- [ ] Seed script (`prisma/seed.ts`) — import current mock-data fixtures
- [ ] Replace all `lib/mock-data.ts` calls with API `fetch()` in pages
- [ ] Add loading skeletons on product listing and detail
- [ ] Error boundaries + 404 / empty state pages
- [ ] Rate limiting on POST routes (upstash/ratelimit or simple IP check)

---

## Phase 3 — Authentication

### Approach: NextAuth.js v5 (Auth.js)

Providers: Credentials (email + bcrypt), Google OAuth (optional later).

### Files

```
auth.ts                       NextAuth config, session strategy: jwt
app/api/auth/[...nextauth]/route.ts
lib/auth-helpers.ts           getServerSession wrapper, requireAuth(), requireAdmin()
middleware.ts                 extend existing — protect /checkout, /account, /api/admin/*
```

### Pages

```
/[locale]/login              ← already built, wire to signIn()
/[locale]/register           ← already built, POST /api/auth/register
/[locale]/account            new — profile, order history, saved addresses
/[locale]/account/orders     order list
/[locale]/account/orders/[id] order detail
```

### Tasks

- [ ] Install: `next-auth@beta`, `bcryptjs`, `@types/bcryptjs`
- [ ] Add User/Account/Session models to Prisma schema
- [ ] Implement Credentials provider with email + password
- [ ] Hash passwords on register, verify on login
- [ ] Session includes: `id`, `email`, `role`
- [ ] Protect checkout + account routes in middleware
- [ ] Wire Navbar login/logout to NextAuth session
- [ ] Account page: update name, change password, address book

---

## Phase 4 — File Uploads + Media

### Approach: Cloudinary (free tier) or Vercel Blob

Product images uploaded by admin, stored in cloud, URLs saved to `ProductImage` table.

### Tasks

- [ ] Setup Cloudinary account + env vars: `CLOUDINARY_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- [ ] `lib/cloudinary.ts` — upload helper (server-side only)
- [ ] `POST /api/admin/upload` — multipart form, returns `{ url, publicId }`
- [ ] Admin product form: drag-drop image uploader, reorder images, set main image
- [ ] Implement `next/image` remote patterns for Cloudinary domain
- [ ] Add image optimization: auto format WebP, lazy loading, blur placeholder

---

## Phase 5 — Order Management

### Order flow

```
Cart → Checkout (address) → Checkout (payment) → Order created (PENDING)
  → Payment confirmed → CONFIRMED
  → Admin picks + packs → PROCESSING
  → Handed to courier → SHIPPED (tracking number added)
  → Delivered → DELIVERED
  → Optional: CANCELLED / REFUNDED
```

### Guest checkout

Guest can place order with email only — no account required.
Order lookup by email + order ID.

### Tasks

- [ ] `POST /api/orders` — validate cart items vs real stock, decrement stock, create order
- [ ] Stock reservation: lock stock on order create, release on cancel
- [ ] `GET /[locale]/orders/[id]?email=...` — guest order tracking page
- [ ] Order confirmation page after successful checkout
- [ ] Admin can bulk update order status
- [ ] CSV export of orders (admin)

---

## Phase 6 — Payment Integration

### Primary: TBC Pay / BOG Pay (Georgian banks)

Both support redirect-based payment (hosted page) and webhook callbacks.

```
POST /api/payments/initiate        create payment session, redirect to bank
GET  /api/payments/success         bank redirects here on success
GET  /api/payments/fail            bank redirects here on fail
POST /api/payments/webhook         bank posts status update (verify HMAC)
```

### Fallback: Cash on delivery (COD)

Available for Tbilisi delivery only — no payment gateway needed.

### Stripe (for cards, international)

- [ ] Install `stripe` + `@stripe/stripe-js`
- [ ] `POST /api/payments/stripe/intent` — create PaymentIntent
- [ ] Stripe Elements embedded in checkout step 2
- [ ] Stripe webhook at `POST /api/payments/stripe/webhook`

### Tasks

- [ ] Env vars: `TBC_MERCHANT_ID`, `TBC_SECRET`, `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Payment method selector in checkout step 2: Card (Stripe) | TBC Pay | BOG Pay | Cash on Delivery
- [ ] Idempotency: do not double-charge on webhook retry
- [ ] Refund flow: admin triggers refund via Stripe/bank API

---

## Phase 7 — Admin Panel

### Route group: `app/[locale]/(admin)/admin/`

Protected by middleware — only `role === ADMIN` allowed.

### Pages

```
/admin                       dashboard: revenue, orders today, low stock alerts
/admin/products              table: search, filter, bulk actions
/admin/products/new          create product form
/admin/products/[id]/edit    edit product form (images, specs, pricing, stock)
/admin/orders                orders table: status filter, date range, search by email/id
/admin/orders/[id]           order detail: items, customer info, status change, add tracking
/admin/categories            manage categories (CRUD, reorder)
/admin/brands                manage brands
/admin/customers             customer list (read-only for now)
/admin/settings              store name, contact info, delivery zones
```

### Components needed

```
DataTable          sortable, filterable, paginated table (Tanstack Table or custom)
ImageUploader      drag-drop, reorder, set primary
RichTextEditor     product description (TipTap or Quill)
StatusBadge        color-coded order status
StatsCard          metric + trend arrow
```

### Tasks

- [ ] Admin layout with sidebar nav (collapsed on mobile)
- [ ] `requireAdmin()` server-side check on every admin page
- [ ] Product CRUD with image upload
- [ ] Inline order status update (select + save)
- [ ] Tracking number field on order
- [ ] Low stock threshold alert (configurable per product)
- [ ] Dashboard chart: last 30 days revenue (Recharts or Chart.js)

---

## Phase 8 — Search + Reviews

### Search

Option A: PostgreSQL full-text search (`tsvector`) — free, no external dep  
Option B: Algolia InstantSearch — better UX, 10k operations/month free

Recommendation: start with Postgres FTS, migrate to Algolia if needed.

```sql
-- Postgres FTS index
ALTER TABLE "Product" ADD COLUMN search_vector tsvector;
CREATE INDEX product_search_idx ON "Product" USING gin(search_vector);
-- trigger to update on insert/update
```

```
GET /api/search?q=iphone+case&locale=en     returns products scored by relevance
```

### Search UI

- Navbar search bar — debounced input, dropdown results (top 5)
- Full `/[locale]/search?q=...` page with filters

### Reviews

- Star rating (1–5) + title + body
- Moderation: admin approves before publish (`isApproved = false` by default)
- Verified purchase badge (check if user has a DELIVERED order for that product)
- Aggregate rating displayed on product card + detail page (already has StarRating component)

### Tasks

- [ ] Search: add tsvector columns, update index on product save
- [ ] `GET /api/search` endpoint
- [ ] SearchBar component in Navbar (mobile: full-screen overlay)
- [ ] Review form on product detail (show only if user is logged in)
- [ ] `POST /api/reviews` — create review, check verified purchase
- [ ] Admin review moderation queue at `/admin/reviews`
- [ ] Update ProductCard + ProductPage to fetch live rating from DB

---

## Phase 9 — Email + Notifications

### Approach: Resend (simple API, generous free tier)

```
lib/email/
  templates/
    order-confirmation.tsx    React Email template
    order-shipped.tsx
    order-delivered.tsx
    password-reset.tsx
    welcome.tsx
  send.ts                     wrapper around Resend client
```

### Trigger points

| Event | Recipient | Template |
|-------|-----------|----------|
| Order created | Customer | order-confirmation |
| Order status → SHIPPED | Customer | order-shipped (includes tracking) |
| Order status → DELIVERED | Customer | order-delivered |
| Register | Customer | welcome |
| Forgot password | Customer | password-reset |
| New order (any) | Admin | admin-new-order |
| Low stock | Admin | admin-low-stock |

### Tasks

- [ ] Install `resend`, `@react-email/components`
- [ ] Env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`
- [ ] Order confirmation email sent inside `POST /api/orders`
- [ ] Status change emails triggered in `PATCH /api/orders/[id]/status`
- [ ] Password reset: generate token (stored in DB), email link, verify + update
- [ ] React Email preview at `/email-preview` (dev only)

---

## Phase 10 — Deployment + CI/CD

### Infrastructure

```
Vercel                  Next.js hosting (Hobby → Pro when needed)
Neon / Supabase         Serverless PostgreSQL (free tier)
Cloudinary              Image CDN
Resend                  Transactional email
```

### Environment variables

```
# DB
DATABASE_URL

# Auth
NEXTAUTH_SECRET
NEXTAUTH_URL

# Cloudinary
CLOUDINARY_URL
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

# Payments
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
TBC_MERCHANT_ID
TBC_SECRET
BOG_CLIENT_ID
BOG_CLIENT_SECRET

# Email
RESEND_API_KEY
EMAIL_FROM
ADMIN_EMAIL

# App
NEXT_PUBLIC_SITE_URL
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  build:
    - checkout
    - npm ci
    - npx prisma generate
    - npm run build
    - npm run lint
  test:              # Phase 2+
    - npm run test
```

### Deployment checklist

- [ ] Link GitHub repo to Vercel
- [ ] Add all env vars in Vercel dashboard (preview + production)
- [ ] `vercel env pull .env.local` for local dev
- [ ] Vercel preview deploys on every PR
- [ ] `prisma migrate deploy` runs in postbuild script
- [ ] Production branch: `main`
- [ ] Custom domain: `mobax.ge` + `www.mobax.ge`
- [ ] SSL auto-provisioned by Vercel
- [ ] Enable Vercel Analytics + Speed Insights

---

## Technical decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ORM | Prisma | type-safe, migrations, good DX |
| Auth | NextAuth v5 | integrates with App Router, flexible |
| Payments | Stripe + BOG/TBC | Stripe for cards, local banks for Georgian users |
| Search | Postgres FTS → Algolia | start free, upgrade if needed |
| Email | Resend + React Email | simple API, React templates |
| Images | Cloudinary | generous free tier, transform API |
| DB host | Neon | serverless Postgres, free tier, Vercel-native |
| State | Zustand | already in place for cart |
| Forms | native + zod | no heavy form lib needed |

---

## Folder structure (target state)

```
app/
  [locale]/
    (shop)/
      page.tsx
      products/
        page.tsx
        [slug]/page.tsx
      cart/page.tsx
      checkout/page.tsx
      search/page.tsx               ← Phase 8
      orders/[id]/page.tsx          ← Phase 5
    (auth)/
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx      ← Phase 9
      reset-password/page.tsx       ← Phase 9
    (account)/
      account/page.tsx              ← Phase 3
      account/orders/page.tsx       ← Phase 3
      account/orders/[id]/page.tsx  ← Phase 3
    (admin)/
      admin/page.tsx                ← Phase 7
      admin/products/page.tsx
      admin/products/new/page.tsx
      admin/products/[id]/edit/page.tsx
      admin/orders/page.tsx
      admin/orders/[id]/page.tsx
      admin/categories/page.tsx
      admin/brands/page.tsx
      admin/reviews/page.tsx
      admin/settings/page.tsx
  api/
    products/route.ts
    products/[slug]/route.ts
    categories/route.ts
    brands/route.ts
    orders/route.ts
    orders/[id]/route.ts
    orders/[id]/status/route.ts
    reviews/route.ts
    reviews/[productSlug]/route.ts
    search/route.ts
    payments/
      stripe/intent/route.ts
      stripe/webhook/route.ts
      tbc/initiate/route.ts
      tbc/webhook/route.ts
      bog/initiate/route.ts
      bog/webhook/route.ts
    admin/
      products/route.ts
      products/[id]/route.ts
      orders/route.ts
      stats/route.ts
      upload/route.ts
    auth/[...nextauth]/route.ts
  layout.tsx
components/
  ui/                               ← done
  shop/                             ← done
  layout/                           ← done
  admin/
    DataTable.tsx
    ImageUploader.tsx
    StatsCard.tsx
    StatusBadge.tsx
  email/
    order-confirmation.tsx
    order-shipped.tsx
    welcome.tsx
lib/
  mock-data.ts                      ← replace with DB calls in Phase 2
  store.ts                          ← done (cart)
  utils.ts                          ← done
  auth-helpers.ts                   ← Phase 3
  cloudinary.ts                     ← Phase 4
  email/send.ts                     ← Phase 9
  validations.ts                    ← zod schemas shared client+server
prisma/
  schema.prisma
  seed.ts
  migrations/
messages/
  en.json                           ← done
  ka.json                           ← done
```

---

## Priority order

1. **Phase 2** — DB + API (unlocks everything else)
2. **Phase 3** — Auth (needed before orders, account, admin)
3. **Phase 7** — Admin panel (needed to manage products in production)
4. **Phase 5** — Orders (core business flow)
5. **Phase 6** — Payments (revenue)
6. **Phase 4** — File uploads (admin needs this to add products)
7. **Phase 9** — Email (operational necessity)
8. **Phase 10** — Deploy (go live)
9. **Phase 8** — Search + Reviews (nice to have, improves UX)
