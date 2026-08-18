# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # eslint
npm run seed     # wipe + reseed MongoDB from lib/mock-data fixtures
npx tsc --noEmit # typecheck (CI runs this)
```

```bash
npm test         # vitest — 46 unit tests (lib/catalog.ts, lib/page-sections.ts, validations)
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + build. It does not yet
run `npm test`, even though a real test suite exists now — worth adding a step.

Note: running `npm run build` while `npm run dev` is live corrupts `.next` and
makes the dev server 500. Stop dev first, or `rm -rf .next` and restart after.

## Project

MoBax — bilingual (EN/KA) mobile accessories e-commerce for the Georgia market.
A full-stack app: storefront, MongoDB, auth, payments, and a 16-module admin
panel (dashboard + 15 sections). Roadmap and current status live in `plan.md`;
product/brand intent and the design bar live in `PRODUCT.md`.

## Architecture

**Stack:** Next.js 14 App Router · TypeScript · Tailwind · MongoDB + Mongoose ·
NextAuth v5 · Zustand · next-intl · shadcn/ui (Radix primitives)

**Routing layout:**
```
app/[locale]/
  (shop)/      ← public storefront (home, products, cart, checkout, search,
                 services, account, guest order tracking)
  (auth)/      ← login, register
app/admin/     ← admin panel, NOT locale-prefixed (English-only by design)
app/api/       ← route handlers
```
Storefront routes are locale-prefixed (`/en/...`, `/ka/...`). `middleware.ts`
handles locale routing via `next-intl` and guards `/account` and `/admin`
(`/admin/setup` stays public for invite redemption). Config in `i18n/request.ts`.

**i18n:** Two locales — `en` and `ka` (Georgian). Keys live in `messages/en.json`
and `messages/ka.json`. Every user-facing string needs both translations.
Access via `useTranslations()` (client) or `getTranslations()` (server).
Georgian is first-class, not an afterthought: check KA for text wrapping and
overflow whenever you change a layout.

**Data layer.** The storefront and the admin panel both read the same
MongoDB data now — there is one source, not two:

- `models/*.ts` + `lib/mongodb.ts` — MongoDB. The admin panel and `/api/*`
  routes read and write here.
- `lib/catalog.ts` — the storefront's read layer over MongoDB (`getProducts`,
  `getCategories`, `getBrands`, `getDiscountedProducts`, `getPopularProducts`,
  etc.), built on the mapping helpers in `lib/catalog-map.ts` (`mapProduct` /
  `mapCategory` / `mapBrand` / `isOnSale` / `discountPercent`). Storefront pages
  call `lib/catalog.ts`, never the models directly. An eslint
  `no-restricted-imports` rule blocks importing `@/lib/mock-data` (or any
  relative path to it) from outside `scripts/seed.ts`, so a page cannot
  silently regress back to the old fixture data.
- `lib/mock-data.ts` — **seed fixtures only.** `scripts/seed.ts` reads it to
  populate MongoDB; it also still defines the canonical `Product` / `Category`
  / `Brand` TypeScript types (imported for typing, not for data). Nothing in
  the storefront or admin reads product data from this file anymore.

Editing a product, category, brand, or theme setting in admin now changes the
public site without a redeploy — the storefront pages carry ISR
(`revalidate = 60`) and mutating admin routes call `revalidateStorefront()`
(`lib/revalidate.ts`) to bust the cache on write, so most changes are visible
immediately rather than waiting for the 60s window.

**Update schemas — never write `CreateXSchema.partial()`.** `lib/validations.ts`
defines a `toUpdateSchema()` helper for exactly this reason: Zod's `.partial()`
only makes keys optional, it does not remove `.default()` — so a bare
`.partial()` update schema still fills in every omitted field with its create
default during `parse()`, and a `PATCH { stock: 5 }` silently wipes
descriptions, resets tags, and can re-activate a disabled record. This shipped
as a real bug earlier in this project (see `plan.md` → "Out-of-plan bugs") and
was fixed by switching every update schema to `toUpdateSchema()`, which uses
Zod's `removeDefault()` so `.max()` / `.url()` / enum / nested constraints are
still enforced. Any new update schema must use `toUpdateSchema()`, not
`.partial()`.

**Auth:** NextAuth v5 Credentials + JWT. Four roles — owner / admin / staff /
customer (`lib/rbac.ts`, `models/User.ts`), with an invite flow for staff.

**Payments:** Flitt hosted checkout only (`lib/payments/`). Server call returns a
`checkout_url`; Flitt POSTs a SHA1-signed callback to `/api/payments/webhook`,
which is the authoritative order status. Amounts in minor units (tetri = GEL×100).
Currently on the sandbox merchant — swapping env vars takes it live.

**Email:** nodemailer over SMTP (`lib/email/send.ts`) with React Email templates
in `lib/email/templates/`. Preview at `/email-preview`. (`resend` is in
package.json but unused.) Telegram notifications in `lib/telegram.ts`.

**State:** Zustand cart store (`lib/store.ts`) — persisted to localStorage under
`mobax-cart`. Also controls `CartDrawer` open/close via `isCartOpen`.

**Components:**
- `components/ui/` — shadcn primitives
- `components/shop/` — ProductCard, CartDrawer, HeroProduct, Reveal, FaqSection,
  StarRating, BeforeAfterSlider, SearchBar, ReviewSection, SupportChat
- `components/layout/` — Navbar, Footer, LocaleSwitcher, ThemeToggle, AccountMenu
- `components/admin/` — DataTable (with opt-in row-selection props shared by
  bulk order actions and bulk sale pricing), ImageUploader, SingleImageUploader,
  StatCard, StatusBadge, PageHeader, ConfirmDialog, DateRangeFilter,
  BilingualField (EN/KA field pair with an accessible missing-translation warning)

**Admin modules beyond the original plan:** `/admin/media` (media library,
`models/Media.ts`, folder-scoped uploads) and `/admin/inventory` (per-product
stock thresholds, All/Low/Out filters, audited adjustments via `ActivityLog`).

## Design system

`PRODUCT.md` holds the brand and accessibility commitments. Enforced in
`app/globals.css` + `tailwind.config.ts`.

**Color — "Ink & Signal".** Near-neutral surfaces carry the page; a single amber
signal (`#F5A623`) marks actions, selection, and state, never decoration. Ink
(`--primary`) carries neutral primary actions and inverts by theme. Brand tokens
are stored as space-separated RGB channels (`--cobalt: 245 166 35` — the token
name is historical, the value is amber) so Tailwind opacity modifiers like
`bg-cobalt/10` work via `rgb(var(--x) / <alpha-value>)`, and so `/admin/theme`
can override the brand at runtime (`lib/theme.ts` injects the override block).
`THEME_DEFAULTS` must stay in sync with the `:root` defaults in `globals.css`,
or the injected block silently overrides them.

**Contrast is a hard requirement — WCAG 2.1 AA, verified in both themes.**
- Semantic text colors must be var-driven so they track the theme. `graphite`
  (secondary text) was once hardcoded in `tailwind.config.ts`, so it stayed
  identical in dark mode and silently failed AA everywhere it was used.
- **Never put white text on an amber fill.** White on `#F5A623` is 2.03:1. Amber
  is a light color in both themes, so text on it must be ink (9.70:1). Use the
  `.signal-fill` component class rather than hand-rolling the pair; it owns this
  rule in one place. (The old palette had the mirror-image problem — the lifted
  dark-mode cobalt failed with white text — which is why ~20 literal
  `bg-[#2E5BFF] text-white` fills existed. Don't reintroduce that pattern.)
- **Amber is not a text color in light mode.** `#F5A623` on paper is 1.94:1. Use
  `text-amber-ink` (a deep burnt amber, 5.9:1 on paper) which resolves to real
  amber in dark mode where it clears AA at 9.1:1.
- Focus rings use `--ring` (ink on light, amber on dark). A single amber ring is
  invisible on paper.

**Motion.** Reveal animations must enhance an already-visible default. Never gate
content behind a viewport/class trigger — observers don't fire during prerender,
in headless renderers, or in background tabs, and the section ships blank. See
the comment in `components/shop/Reveal.tsx`; this shipped as a ~1500px hole where
the featured-product grid should have been. Respect `prefers-reduced-motion`.

**Verify visually.** This codebase has had real bugs that read fine in source and
only appear in a browser (blank sections, 768px horizontal overflow, a
self-scrolling carousel). For UI changes, screenshot the running page at
several widths, in both themes and both locales.

## Home page

Sections (`app/[locale]/(shop)/page.tsx`): Hero → Categories → Featured Products
→ New Arrivals rail → FAQ → Trust badges. Section padding is deliberately
non-uniform for rhythm — don't normalize it.

- `HeroProduct` — hero visual with an inline quick-add (shortest path to cart).
- `Reveal` — scroll-reveal wrapper; see the motion rule above before editing.
- `FaqSection` — async server component. Reads the admin-managed FAQ setting via
  `lib/faq.ts` and falls back to `faqQ1`–`faqQ5` / `faqA1`–`faqA5` in the `home`
  namespace **only when the saved list is empty**. Note: `useTranslations('home')`
  scopes keys, so `faq.title` won't resolve from `t()` on this page.
- `BeforeAfterSlider` — drag-to-compare, plain `<img>` not `next/image`. Assets in
  `public/compare/`; both frames must share canvas size, background, and phone
  position or the drag transition jumps.

**Theming:** `next-themes`, dark/light via `ThemeToggle`, Tailwind
`darkMode: 'class'`.
