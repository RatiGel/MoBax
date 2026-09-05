import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { ProductCard } from '@/components/shop/ProductCard';
import { getDiscountedProducts } from '@/lib/catalog';
import { pageMetadata, SITE_NAME, type Locale } from '@/lib/seo';

// Storefront reads the DB; ISR keeps it cheap. Admin catalog writes call
// revalidateStorefront(), which already targets this path, so a sale edit
// lands immediately rather than within 60s.
export const revalidate = 60;

interface DiscountsPageProps {
  params: { locale: string };
}

export async function generateMetadata({
  params: { locale },
}: DiscountsPageProps): Promise<Metadata> {
  const isKa = locale === 'ka';
  return pageMetadata({
    title: isKa
      ? `ფასდაკლებები — აქსესუარები ფასდაკლებით | ${SITE_NAME}`
      : `Sale — Discounted Mobile Accessories | ${SITE_NAME}`,
    description: isKa
      ? 'ფასდაკლებული დამტენები, კაბელები, ქეისები და ყურსასმენები. შეზღუდული რაოდენობა, მიტანა თბილისში და საქართველოში.'
      : 'Discounted chargers, cables, cases and headphones. Limited stock, with delivery in Tbilisi and across Georgia.',
    path: '/products/discounts',
    locale: locale as Locale,
  });
}

export default async function DiscountsPage({ params: { locale } }: DiscountsPageProps) {
  setRequestLocale(locale);
  const t = await getTranslations('discounts');
  const products = await getDiscountedProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-display text-4xl font-semibold text-ink dark:text-white">{t('title')}</h1>
      <p className="mt-3 text-graphite">{t('subtitle')}</p>

      {products.length === 0 ? (
        <p className="mt-12 text-graphite">{t('empty')}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-graphite">{t('count', { count: products.length })}</p>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
