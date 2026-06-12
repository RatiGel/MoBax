import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RotateCcw, Headphones } from 'lucide-react';
import { ProductCard } from '@/components/shop/ProductCard';
import { BeforeAfterSlider } from '@/components/shop/BeforeAfterSlider';
import { getParentCategories, getFeaturedProducts } from '@/lib/mock-data';

interface HomePageProps {
  params: { locale: string };
}

export async function generateMetadata({ params: { locale } }: HomePageProps) {
  return {
    title: `MoBax — ${locale === 'ka' ? 'პრემიუმ მობილური აქსესუარები' : 'Premium Mobile Accessories'}`,
  };
}

export default function HomePage({ params: { locale } }: HomePageProps) {
  const t = useTranslations('home');
  const featured = getFeaturedProducts();
  const parentCategories = getParentCategories();

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[620px] flex items-center bg-primary overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1800&h=900&fit=crop"
            alt="MoBax hero"
            fill
            className="object-cover opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-28">
          <div className="max-w-xl">
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] text-left">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 text-base text-neutral-400 leading-relaxed max-w-md">
              {t('heroSubtitle')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={`/${locale}/products`}
                className="inline-flex items-center gap-2.5 bg-accent text-primary px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent-dark transition-colors"
              >
                {t('heroShop')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/${locale}/products`}
                className="inline-flex items-center gap-2.5 border border-white/25 text-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:border-white/50 transition-colors"
              >
                {t('heroBrowse')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────── */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-5xl font-bold text-neutral-950 dark:text-white">
                {t('categoriesTitle')}
              </h2>
            </div>
            <Link
              href={`/${locale}/products`}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              {locale === 'ka' ? 'ყველა' : 'View all'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {parentCategories.map((cat) => {
              const catName = locale === 'ka' ? cat.nameKa : cat.nameEn;
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/products?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-4 bg-primary dark:bg-surface-dark border border-primary dark:border-border-dark hover:border-accent dark:hover:border-accent transition-all duration-200"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden flex items-center justify-center">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={catName}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                        {cat.icon}
                      </span>
                    )}
                  </div>
                  <div className="text-center pb-2">
                    <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-white leading-tight">
                      {catName}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-surface-dark">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl font-bold text-neutral-950 dark:text-white">
                {t('featuredTitle')}
              </h2>
            </div>
            <Link
              href={`/${locale}/products`}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              {locale === 'ka' ? 'ყველა' : 'View all'} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Editorial banner ─────────────────────────────── */}
      <section className="relative py-36 bg-primary overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=1800&h=700&fit=crop"
            alt="Original products"
            fill
            className="object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-primary/60" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-[0.35em] mb-5">
            {locale === 'ka' ? '100% ავთენტური' : '100% Authentic'}
          </p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-7 leading-[1.1]">
            {locale === 'ka' ? 'ორიგინალი. პრემიუმი.' : 'Original. Premium. Guaranteed.'}
          </h2>
          <p className="text-neutral-400 max-w-lg mx-auto mb-10 text-sm leading-relaxed">
            {locale === 'ka'
              ? 'ჩვენს მაღაზიაში ყველა პროდუქტი 100% ავთენტურია, პირდაპირ ავტორიზებული დისტრიბუტორებისგან.'
              : 'Every product in our store is 100% authentic, sourced directly from authorized distributors.'}
          </p>
          <Link
            href={`/${locale}/products?category=original`}
            className="inline-flex items-center gap-2.5 bg-accent text-primary px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent-dark transition-colors"
          >
            {locale === 'ka' ? 'ორიგინალები' : 'Shop Originals'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Before / After comparison ────────────────────── */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold text-neutral-950 dark:text-white mb-4">
              {t('compareTitle')}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              {t('compareSubtitle')}
            </p>
          </div>
          <BeforeAfterSlider
            beforeSrc="/compare/phone-naked.png"
            afterSrc="/compare/phone-cased.png"
            beforeLabel={t('compareBefore')}
            afterLabel={t('compareAfter')}
            beforeAlt="Phone without case"
            afterAlt="Phone with premium case"
          />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-surface-dark">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl font-bold text-neutral-950 dark:text-white mb-10 text-center">
            {locale === 'ka' ? 'ხშირად დასმული კითხვები' : 'Frequently Asked Questions'}
          </h2>
          <div className="flex flex-col gap-4">
            {(['1','2','3','4','5'] as const).map((n) => (
              <details key={n} className="group bg-neutral-100 dark:bg-neutral-800 rounded-xl px-6 py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="text-base font-bold text-neutral-950 dark:text-white">
                    {t(`faqQ${n}` as any)}
                  </span>
                  <span className="flex-shrink-0 text-neutral-500 dark:text-neutral-400">
                    <svg className="h-5 w-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </summary>
                <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {t(`faqA${n}` as any)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────── */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {(
              [
                { Icon: Truck, title: t('trust1Title'), desc: t('trust1Desc') },
                { Icon: Shield, title: t('trust2Title'), desc: t('trust2Desc') },
                { Icon: RotateCcw, title: t('trust3Title'), desc: t('trust3Desc') },
                { Icon: Headphones, title: t('trust4Title'), desc: t('trust4Desc') },
              ] as const
            ).map((badge) => (
              <div key={badge.title} className="flex flex-col items-center text-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center border border-primary/20 dark:border-border-dark">
                  <badge.Icon className="h-5 w-5 text-primary dark:text-accent" />
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-neutral-900 dark:text-neutral-100">
                    {badge.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
