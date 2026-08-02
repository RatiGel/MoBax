import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RotateCcw, Headphones, Star } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { HeroProduct } from '@/components/shop/HeroProduct';
import { Reveal } from '@/components/shop/Reveal';
import { FaqSection } from '@/components/shop/FaqSection';
import {
  getFeaturedProducts,
  getNewArrivals,
  getParentCategories,
} from '@/lib/mock-data';

interface HomePageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: HomePageProps) {
  return {
    title: `MoBax — ${locale === 'ka' ? 'პრემიუმ მობილური აქსესუარები' : 'Premium Mobile Accessories'}`,
  };
}

export default function HomePage({ params: { locale } }: HomePageProps) {
  setRequestLocale(locale);
  const t = useTranslations('home');
  const featured = getFeaturedProducts();
  const newArrivals = getNewArrivals();
  // Exclude the "most-popular" pseudo-category — it's a /products filter,
  // not a real product group, so it doesn't belong in the home grid.
  const categories = getParentCategories().filter((c) => c.slug !== 'most-popular');

  // Hero products — a rotating set of new arrivals, so the buyer sees
  // something to buy above the fold instead of an empty column, and gets a
  // sense of the range's breadth rather than one SKU. Falls back to featured
  // if new arrivals are empty; the component handles a single-item list by
  // rendering a static tile with no controls.
  const heroProducts = (newArrivals.length > 0 ? newArrivals : featured).slice(0, 5);

  return (
    <>
      {/* ── Hero — copy + proof left, product right ──────── */}
      <section className="relative overflow-hidden bg-paper dark:bg-ink">
        <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-cobalt/10 blur-3xl dark:bg-cobalt-dark/10" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            {/* Copy + social proof */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark px-3.5 py-1.5 text-xs font-medium text-graphite">
                <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
                {locale === 'ka' ? '5+ წლიანი გამოცდილება' : '5+ Years of Experience'}
              </span>
              <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink dark:text-white leading-[1.04] tracking-display">
                {t('heroTitle')}
              </h1>
              <p className="mt-6 text-lg text-graphite leading-relaxed max-w-md">
                {t('heroSubtitle')}
              </p>

              {/* Social proof — stars + customer count, the moment trust is built */}
              <div className="mt-7 flex items-center gap-3">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-cobalt text-cobalt dark:fill-cobalt-dark dark:text-cobalt-dark" />
                  ))}
                </div>
                <span className="text-sm font-medium text-ink dark:text-white">4.8</span>
                <span className="text-sm text-graphite">· {t('heroTrust')}</span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/products`}
                  className="group inline-flex items-center gap-2.5 bg-ink dark:bg-white text-white dark:text-ink px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
                >
                  {t('heroShop')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={`/${locale}/products`}
                  className="inline-flex items-center gap-2.5 border border-border-light dark:border-border-dark text-ink dark:text-white px-7 py-3.5 text-sm font-semibold rounded-full hover:border-ink dark:hover:border-white transition-colors"
                >
                  {t('heroBrowse')}
                </Link>
              </div>
            </div>

            {/* Product visual with inline quick-add — shortest path to cart */}
            {heroProducts.length > 0 && <HeroProduct products={heroProducts} />}
          </div>
        </div>
      </section>

      {/* ── Shop by category — lets buyers self-segment ──── */}
      {/* Rhythm note: sections deliberately don't share one uniform pad. This
          one rides tight under the hero (which carries its own bottom space);
          the tinted product sections below open up, and the FAQ gets the most
          air as the page's resting point. */}
      <section className="pt-4 pb-16 lg:pt-6 lg:pb-24 bg-paper dark:bg-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-8">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
              {t('categoriesTitle')}
            </h2>
            <p className="mt-2 text-base text-graphite">{t('categoriesSubtitle')}</p>
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
                  className="group relative overflow-hidden rounded-2xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark transition-colors hover:border-cobalt/40"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-cloud-light dark:bg-cloud-dark">
                    {cat.image && (
                      <Image
                        src={cat.image}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    )}
                  </div>
                  {/* Stacked on small screens: side-by-side made long names wrap
                      to two lines while the count stayed pinned to the corner. */}
                  <div className="flex flex-col gap-0.5 p-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 sm:p-4">
                    <p className="text-sm font-semibold text-ink dark:text-white leading-tight">{name}</p>
                    <p className="shrink-0 text-xs text-graphite tabular-nums">
                      {t('productsCount', { count: cat.productCount })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────── */}
      <section className="py-20 lg:py-28 bg-cloud-light/40 dark:bg-cloud-dark/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
              {t('featuredTitle')}
            </h2>
            <Link
              href={`/${locale}/products`}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
            >
              {t('viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product, i) => (
              <Reveal key={product.id} delay={Math.min(i, 3) * 0.06}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── New Arrivals — horizontal rail, distinct from the grid above ── */}
      <section className="py-20 lg:py-28 bg-paper dark:bg-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
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

      {/* ── FAQ — admin-managed, falls back to i18n defaults ─ */}
      <FaqSection locale={locale} />

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
