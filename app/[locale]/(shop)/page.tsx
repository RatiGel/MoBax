import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RotateCcw, Headphones, Star } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { HeroProduct } from '@/components/shop/HeroProduct';
import { Reveal } from '@/components/shop/Reveal';
import { FaqSection } from '@/components/shop/FaqSection';
import { BrandStrip } from '@/components/shop/BrandStrip';
import { SocialVideos } from '@/components/shop/SocialVideos';
import {
  getFeaturedProducts,
  getNewArrivals,
  getPopularProducts,
  getParentCategories,
  getCategoryProductCounts,
  getBrands,
} from '@/lib/catalog';
import { getSocialVideos } from '@/lib/theme';
import { getPageSection, getPageSeo, pickLocalized, pickPlain } from '@/lib/page-content';

interface HomePageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: HomePageProps) {
  // SEO title/description are admin-editable (Admin → Content → Home → SEO).
  // Blank or unsaved falls back to the built-in default.
  const seo = await getPageSeo('home');
  const fallback = `MoBax — ${locale === 'ka' ? 'პრემიუმ მობილური აქსესუარები' : 'Premium Mobile Accessories'}`;
  return {
    title: seo?.title || fallback,
    ...(seo?.description ? { description: seo.description } : {}),
  };
}

// Storefront reads the DB; ISR keeps it cheap. Admin catalog writes call
// revalidateStorefront(), so edits land immediately rather than within 60s.
export const revalidate = 60;

export default async function HomePage({ params: { locale } }: HomePageProps) {
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const [
    featured,
    popular,
    newArrivals,
    allParents,
    categoryCounts,
    brands,
    socialVideos,
    heroContent,
  ] = await Promise.all([
    getFeaturedProducts(),
    getPopularProducts(),
    getNewArrivals(),
    getParentCategories(),
    getCategoryProductCounts(),
    getBrands(),
    getSocialVideos(),
    getPageSection('home', 'hero'),
  ]);

  // "Popular" ranks by review volume then rating. Most of the catalogue has no
  // reviews yet, so that ordering is near-arbitrary today and improves on its
  // own as reviews arrive; falling back to the featured set keeps the section
  // from looking randomly assembled in the meantime.
  const popularItems = popular.length > 0 ? popular : featured;

  // Hero copy is admin-editable (Admin → Content → Home → Hero section). Every
  // field falls back to the i18n default, so an unsaved or partly-filled hero
  // section renders exactly as it did before the CMS was wired in.
  const hero = {
    badge:
      pickLocalized(heroContent, 'badge', locale) ??
      (locale === 'ka' ? '5+ წლიანი გამოცდილება' : '5+ Years of Experience'),
    heading: pickLocalized(heroContent, 'heading', locale) ?? t('heroTitle'),
    subheading: pickLocalized(heroContent, 'subheading', locale) ?? t('heroSubtitle'),
    rating: pickPlain(heroContent, 'rating') ?? '4.8',
    trust: pickLocalized(heroContent, 'trust', locale) ?? t('heroTrust'),
    ctaLabel: pickLocalized(heroContent, 'ctaLabel', locale) ?? t('heroShop'),
    ctaHref: pickPlain(heroContent, 'ctaHref') ?? `/${locale}/products`,
    ctaSecondaryLabel: pickLocalized(heroContent, 'ctaSecondaryLabel', locale) ?? t('heroBrowse'),
    ctaSecondaryHref: pickPlain(heroContent, 'ctaSecondaryHref') ?? `/${locale}/products`,
  };
  // Exclude the "most-popular" pseudo-category — it's a /products filter,
  // not a real product group, so it doesn't belong in the home grid.
  const categories = allParents.filter((c) => c.slug !== 'most-popular');

  // Hero products — a rotating set of new arrivals, so the buyer sees
  // something to buy above the fold instead of an empty column, and gets a
  // sense of the range's breadth rather than one SKU. Falls back to featured
  // if new arrivals are empty; the component handles a single-item list by
  // rendering a static tile with no controls.
  const heroProducts = (newArrivals.length > 0 ? newArrivals : featured).slice(0, 5);

  return (
    <>
      {/* ── Hero — copy + proof left, product right ──────── */}
      <section className="relative overflow-hidden border-b border-hairline-light bg-paper dark:border-hairline-dark dark:bg-ink">
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            {/* Copy + social proof */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-amber-ink">
                <span className="h-1 w-1 rounded-full bg-cobalt" />
                {hero.badge}
              </span>
              {/* Type scale is deliberately lower than before. At the old
                  text-7xl a Georgian heading like "მობილურის პრემიუმ
                  აქსესუარები საუკეთესო ფასად" filled the entire mobile
                  viewport, pushing every product below the fold — the exact
                  opposite of design principle #3 (fast path to checkout).
                  Georgian also sets wider than Latin at equal size, so the
                  ceiling here is set by the KA copy, not the EN. */}
              <h1 className="mt-4 text-balance font-display text-[1.75rem] font-semibold leading-[1.1] tracking-display text-ink sm:text-4xl lg:text-5xl dark:text-white">
                {hero.heading}
              </h1>
              <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-graphite lg:text-lg">
                {hero.subheading}
              </p>

              {/* Social proof — stars + customer count, the moment trust is built */}
              <div className="mt-7 flex items-center gap-3">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-cobalt text-cobalt" />
                  ))}
                </div>
                <span className="text-sm font-medium text-ink dark:text-white">{hero.rating}</span>
                <span className="text-sm text-graphite">· {hero.trust}</span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {/* One signal action, one quiet alternative. Both were
                    equally weighted before, which left neither reading as
                    the primary path. */}
                <Link
                  href={hero.ctaHref}
                  className="signal-fill group inline-flex items-center gap-2.5 rounded-md px-6 py-3.5 text-sm font-semibold transition-colors"
                >
                  {hero.ctaLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </Link>
                <Link
                  href={hero.ctaSecondaryHref}
                  className="inline-flex items-center gap-2.5 rounded-md border border-hairline-light px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink dark:border-hairline-dark dark:text-white dark:hover:border-white"
                >
                  {hero.ctaSecondaryLabel}
                </Link>
              </div>
            </div>

            {/* Product visual with inline quick-add — shortest path to cart */}
            {heroProducts.length > 0 && <HeroProduct products={heroProducts} />}
          </div>
        </div>
      </section>

      {/* ── Shop by category — lets buyers self-segment ──── */}
      {/* Rhythm note: this section rides tight under the hero, which carries
          its own bottom space. Sections below alternate paper/raised and are
          separated by hairline rules rather than by large pad differences, so
          the page reads as a sequence of bands. Order is fixed here rather
          than admin-sortable — see the note on the page-level comment. */}
      {categories.length > 0 && (
        <section className="pt-4 pb-16 lg:pt-6 lg:pb-24 bg-paper dark:bg-ink">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8">
              <h2 className="font-display text-2xl font-semibold tracking-display text-ink sm:text-3xl dark:text-white">
                {t('categoriesTitle')}
              </h2>
              <p className="mt-1.5 text-sm text-graphite">{t('categoriesSubtitle')}</p>
            </Reveal>

            {/* 3-up on desktop, not 6: at 1440px a six-column row left each tile
                ~88px wide — too small to read the product in the photo, and the
                labels started clipping. Fewer, larger tiles identify better. */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-5">
              {categories.map((cat) => {
                const name = locale === 'ka' ? cat.nameKa : cat.nameEn;
                return (
                  <Link
                    key={cat.id}
                    href={`/${locale}/products?category=${cat.slug}`}
                    className="group relative overflow-hidden rounded-lg border border-hairline-light bg-panel-light transition-colors hover:border-cobalt dark:border-hairline-dark dark:bg-panel-dark"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-raised-light dark:bg-raised-dark">
                      {cat.image ? (
                        <Image
                          src={cat.image}
                          alt={name}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                      ) : (
                        /* Most categories have no image yet (18 of 25 at the
                           time of writing), and an empty grey box reads as a
                           broken image. A typographic tile is a deliberate
                           state instead: the category's own initial, set
                           large and quiet, with the accent kept for hover. */
                        <div
                          aria-hidden
                          className="flex h-full w-full items-center justify-center bg-raised-light dark:bg-raised-dark"
                        >
                          <span className="select-none font-display text-4xl font-semibold text-graphite/25 transition-colors group-hover:text-cobalt/45 sm:text-5xl">
                            {name.trim().charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Stacked on small screens: side-by-side made long names wrap
                        to two lines while the count stayed pinned to the corner. */}
                    <div className="flex flex-col gap-0.5 p-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 sm:p-4">
                      <p className="text-sm font-semibold text-ink dark:text-white leading-tight">{name}</p>
                      <p className="shrink-0 text-xs text-graphite tabular-nums">
                        {t('productsCount', { count: categoryCounts[cat.slug] ?? 0 })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── All Brands ────────────────────────────────────── */}
      <BrandStrip
        brands={brands}
        locale={locale}
        title={t('brandsTitle')}
        viewAllLabel={t('viewAll')}
      />

      {/* ── Popular Items ─────────────────────────────────── */}
      {popularItems.length > 0 && (
        <section className="border-t border-hairline-light bg-raised-light py-14 lg:py-20 dark:border-hairline-dark dark:bg-raised-dark">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold tracking-display text-ink sm:text-3xl dark:text-white">
                {t('popularTitle')}
              </h2>
              <Link
                href={`/${locale}/products`}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
              >
                {t('viewAll')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>

            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {popularItems.map((product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 3) * 0.06}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── New Arrivals — horizontal rail, distinct from the grid above ── */}
      {newArrivals.length > 0 && (
        <section className="border-t border-hairline-light bg-paper py-14 lg:py-20 dark:border-hairline-dark dark:bg-ink">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold tracking-display text-ink sm:text-3xl dark:text-white">
                {t('newArrivalsTitle')}
              </h2>
              <Link
                href={`/${locale}/products`}
                className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
              >
                {t('viewAll')} <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>

          {/* Edge-bleed scroll rail — flick through breadth without a wall of cards.
              The rail aligns to the max-w-7xl gutter via scroll-padding rather than a
              spacer element: a `100vw`-sized spacer overshoots by the scrollbar width,
              and snap-mandatory then jumps the rail forward and clips the first card.
              `snap-proximity` keeps the flick feel without fighting the resting position. */}
          <div className="flex snap-x snap-proximity gap-5 overflow-x-auto px-4 sm:px-6 lg:px-8 pb-4 scroll-px-4 sm:scroll-px-6 lg:scroll-px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newArrivals.map((product) => (
              <div key={product.id} className="snap-start shrink-0 w-44 sm:w-52 lg:w-60">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ — admin-managed, falls back to i18n defaults ─ */}
      <FaqSection locale={locale} />

      {/* ── Social — TikTok videos, admin-managed. Renders nothing until
             videos are saved (Admin → Settings → Social videos). ─────── */}
      <SocialVideos
        videos={socialVideos.videos}
        handle={socialVideos.handle}
        profileUrl={socialVideos.profileUrl}
        locale={locale}
        title={t('socialTitle')}
        followLabel={t('socialFollow')}
        watchLabel={t('socialWatch')}
      />

      {/* ── Trust badges ─────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-paper dark:bg-ink border-t border-border-light dark:border-border-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4">
            {(
              [
                { Icon: Truck, title: t('trust1Title'), desc: t('trust1Desc') },
                { Icon: Shield, title: t('trust2Title'), desc: t('trust2Desc') },
                { Icon: RotateCcw, title: t('trust3Title'), desc: t('trust3Desc') },
                { Icon: Headphones, title: t('trust4Title'), desc: t('trust4Desc') },
              ] as const
            ).map((badge) => (
              <div key={badge.title} className="flex flex-col items-center text-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cobalt-soft dark:bg-cloud-dark text-cobalt dark:text-cobalt-dark">
                  <badge.Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink dark:text-neutral-100">
                    {badge.title}
                  </h3>
                  <p className="text-sm text-graphite mt-1.5 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
