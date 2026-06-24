import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RotateCcw, Headphones } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { CompareSlider } from '@/components/shop/CompareSlider';
import { getFeaturedProducts, getPopularProducts, getNewArrivals } from '@/lib/mock-data';

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
  const popular = getPopularProducts();
  const newArrivals = getNewArrivals();

  return (
    <>
      {/* ── Hero — weightless, product-led ───────────────── */}
      <section className="relative overflow-hidden bg-paper dark:bg-ink">
        {/* ambient cobalt wash, very low key */}
        <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-cobalt/10 blur-3xl dark:bg-cobalt-dark/10" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-36">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border-light dark:border-border-dark px-3.5 py-1.5 text-xs font-medium text-graphite">
              <span className="h-1.5 w-1.5 rounded-full bg-cobalt" />
              {locale === 'ka' ? '100% ორიგინალი · თბილისი' : '100% Original · Tbilisi'}
            </span>
            <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-semibold text-ink dark:text-white leading-[1.04] tracking-display">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 text-lg text-graphite leading-relaxed max-w-md">
              {t('heroSubtitle')}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
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
        </div>
      </section>

      {/* ── Split lifestyle banner ───────────────────────── */}
      <section className="bg-paper dark:bg-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 lg:pb-24">
          <div className="grid grid-cols-1 overflow-hidden rounded-4xl bg-cloud-light dark:bg-cloud-dark lg:grid-cols-2">
            <div className="relative min-h-[280px] lg:min-h-[440px]">
              <Image
                src="https://images.unsplash.com/photo-1592286927505-1def25115558?w=1200&h=900&fit=crop"
                alt="Charging accessories"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-5 p-8 sm:p-12 lg:p-16">
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white leading-[1.08] tracking-display">
                {locale === 'ka'
                  ? 'დატენე უსწრაფესად. დღის ბოლომდე.'
                  : 'Power that keeps up with your day.'}
              </h2>
              <p className="text-base text-graphite leading-relaxed max-w-md">
                {locale === 'ka'
                  ? 'GaN დამტენები, MagSafe და სწრაფი კაბელები — ყველა მოწყობილობისთვის.'
                  : 'GaN chargers, MagSafe pads and braided cables — built for every device you own.'}
              </p>
              <Link
                href={`/${locale}/products?category=chargers`}
                className="group inline-flex w-fit items-center gap-2.5 bg-ink dark:bg-white text-white dark:text-ink px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
              >
                {locale === 'ka' ? 'დამტენების ნახვა' : 'Shop chargers'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-cloud-light/40 dark:bg-cloud-dark/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
              {t('featuredTitle')}
            </h2>
            <Link
              href={`/${locale}/products`}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
            >
              {locale === 'ka' ? 'ყველა' : 'View all'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Most Popular ──────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-paper dark:bg-ink">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
              {t('popularTitle')}
            </h2>
            <Link
              href={`/${locale}/products?category=most-popular`}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
            >
              {locale === 'ka' ? 'ყველა' : 'View all'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {popular.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── New Arrivals ──────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-cloud-light/40 dark:bg-cloud-dark/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-display">
              {t('newArrivalsTitle')}
            </h2>
            <Link
              href={`/${locale}/products`}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-graphite hover:text-cobalt dark:hover:text-cobalt-dark transition-colors"
            >
              {locale === 'ka' ? 'ყველა' : 'View all'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial banner ─────────────────────────────── */}
      <section className="relative py-28 lg:py-36 bg-ink overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=1800&h=700&fit=crop"
            alt="Original products"
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cobalt/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/80 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cobalt-dark" />
            {locale === 'ka' ? '100% ავთენტური' : '100% Authentic'}
          </span>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6 leading-[1.05] tracking-display">
            {locale === 'ka' ? 'ორიგინალი. პრემიუმი.' : 'Original. Premium. Guaranteed.'}
          </h2>
          <p className="text-neutral-400 max-w-lg mx-auto mb-9 text-base leading-relaxed">
            {locale === 'ka'
              ? 'ჩვენს მაღაზიაში ყველა პროდუქტი 100% ავთენტურია, პირდაპირ ავტორიზებული დისტრიბუტორებისგან.'
              : 'Every product in our store is 100% authentic, sourced directly from authorized distributors.'}
          </p>
          <Link
            href={`/${locale}/products?category=original`}
            className="group inline-flex items-center gap-2.5 bg-white text-ink px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-cobalt hover:text-white transition-colors"
          >
            {locale === 'ka' ? 'ორიგინალები' : 'Shop Originals'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ── Before / After comparison ────────────────────── */}
      <section className="py-20 lg:py-24 bg-paper dark:bg-ink">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white mb-3 tracking-display">
              {t('compareTitle')}
            </h2>
            <p className="text-base text-graphite max-w-md mx-auto">
              {t('compareSubtitle')}
            </p>
          </div>
          <CompareSlider
            locale={locale}
            beforeLabel={t('compareBefore')}
            afterLabel={t('compareAfter')}
          />
          <div className="mt-10 flex justify-center">
            <Link
              href={`/${locale}/products?category=phone-cases`}
              className="group inline-flex items-center gap-2.5 bg-ink dark:bg-white text-white dark:text-ink px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-cobalt dark:hover:bg-cobalt dark:hover:text-white transition-colors"
            >
              {locale === 'ka' ? 'ქეისების ნახვა' : 'Shop phone cases'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Full-bleed photo banner ──────────────────────── */}
      <section className="relative h-[420px] lg:h-[520px] overflow-hidden flex items-center">
        <Image
          src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1900&h=1000&fit=crop"
          alt="Premium mobile gear"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent" />
        <div className="relative mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg">
            <p className="text-5xl sm:text-6xl font-display font-semibold text-white tracking-display leading-none">
              10k+
            </p>
            <p className="mt-3 text-lg text-white/90 leading-relaxed">
              {locale === 'ka'
                ? 'მომხმარებელი თბილისში გვენდობა აქსესუარების შერჩევაში.'
                : 'Customers across Tbilisi trust MoBax to kit out their devices.'}
            </p>
            <Link
              href={`/${locale}/products`}
              className="group mt-7 inline-flex items-center gap-2.5 bg-white text-ink px-7 py-3.5 text-sm font-semibold rounded-full hover:bg-cobalt hover:text-white transition-colors"
            >
              {locale === 'ka' ? 'დაიწყე ყიდვა' : 'Start shopping'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-cloud-light/40 dark:bg-cloud-dark/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white mb-10 text-center tracking-display">
            {locale === 'ka' ? 'ხშირად დასმული კითხვები' : 'Frequently Asked Questions'}
          </h2>
          <div className="flex flex-col gap-3">
            {(['1','2','3','4','5'] as const).map((n) => (
              <details key={n} className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl px-6 py-5 open:border-cobalt/30 transition-colors">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="text-base font-semibold text-ink dark:text-white">
                    {t(`faqQ${n}` as any)}
                  </span>
                  <span className="flex-shrink-0 text-graphite group-open:text-cobalt transition-colors">
                    <svg className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </summary>
                <p className="mt-4 text-sm text-graphite leading-relaxed">
                  {t(`faqA${n}` as any)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────── */}
      <section className="py-20 lg:py-24 bg-paper dark:bg-ink border-t border-border-light dark:border-border-dark">
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
