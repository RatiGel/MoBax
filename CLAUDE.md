# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # eslint
```

No test suite yet (Phase 2+).

## Project

MoBax — bilingual (EN/KA) mobile accessories e-commerce for Georgia market. Currently Phase 1 complete (static frontend). Phases 2–10 are planned in `plan.md`.

## Architecture

**Stack:** Next.js 14 App Router · TypeScript · Tailwind · Zustand · next-intl · shadcn/ui (Radix primitives)

**Routing layout:**
```
app/[locale]/
  (shop)/      ← public storefront (home, products, cart, checkout)
  (auth)/      ← login, register
```
All routes are locale-prefixed (`/en/...`, `/ka/...`). Middleware (`middleware.ts`) handles locale routing via `next-intl`. Config in `i18n/request.ts`.

**i18n:** Two locales — `en` and `ka` (Georgian). Translation keys live in `messages/en.json` and `messages/ka.json`. Every user-facing string must have both translations. Access via `useTranslations()` (client) or `getTranslations()` (server).

**State:** Zustand cart store (`lib/store.ts`) — persisted to localStorage under key `mobax-cart`. Cart state also controls the `CartDrawer` open/close via `isCartOpen`.

**Data layer (Phase 1):** All product and category data comes from `lib/mock-data.ts`. This will be replaced with Prisma + API routes in Phase 2. The `Product` and `Category` types defined there are the canonical shapes.

**Components:**
- `components/ui/` — shadcn primitives (button, card, input, etc.)
- `components/shop/` — domain components (ProductCard, CartDrawer, StarRating, BeforeAfterSlider)
- `components/layout/` — Navbar, Footer, LocaleSwitcher, ThemeToggle

**Home page sections** (`app/[locale]/(shop)/page.tsx`): Hero → Categories → Featured Products → Editorial banner → Before/After comparison → FAQ → Trust badges.

- `BeforeAfterSlider` — client component, drag-to-compare two images (clip-path on the before layer, pointer events, keyboard arrows). Uses plain `<img>`, not `next/image`. Assets in `public/compare/` (`phone-naked.png` / `phone-cased.png`) — composited from product photos; both frames must share identical canvas size, background, and phone position or the drag transition jumps.
- FAQ strings live in the `home` namespace as `faqQ1`–`faqQ5` / `faqA1`–`faqA5` in both `messages/*.json`. Note: `useTranslations('home')` scopes keys — top-level namespaces like `faq.title` won't resolve from `t()` on this page.

**Theming:** `next-themes` — dark/light toggle via `ThemeToggle`. Tailwind `darkMode: 'class'`.

## Phase 2+ context

When adding DB + API (Phase 2), the plan calls for Prisma + PostgreSQL (Neon). Schema is defined in `plan.md`. Seed script should import current `mock-data.ts` fixtures. After Phase 2, pages should fetch from `/api/...` instead of importing from `lib/mock-data.ts`.

Auth (Phase 3) will use NextAuth v5. Middleware will be extended to protect `/checkout`, `/account`, and `/api/admin/*` routes.

Image hosting: Cloudinary (Phase 4). Add remote patterns to `next.config.js` when setting up.

Payments: Stripe (cards) + TBC Pay / BOG Pay (Georgian banks) + Cash on Delivery (Phase 6).
