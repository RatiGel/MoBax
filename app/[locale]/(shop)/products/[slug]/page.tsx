import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getProductBySlug, getRelatedProducts, getCategoryBySlug } from '@/lib/catalog';
import { JsonLd } from '@/components/JsonLd';
import {
  pageMetadata,
  productSeo,
  productJsonLd,
  breadcrumbJsonLd,
  type Locale,
} from '@/lib/seo';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductPageProps {
  params: { slug: string; locale: string };
}

// Storefront reads the DB; ISR keeps it cheap. Admin catalog writes call
// revalidateStorefront(), so edits land immediately rather than within 60s.
export const revalidate = 60;

/**
 * Every product page used to inherit the layout's single title, so the whole
 * catalog was one duplicate title in search results. This gives each product
 * its own title, description, canonical and hreflang.
 */
export async function generateMetadata({
  params: { slug, locale },
}: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const { title, description } = productSeo(product, locale as Locale);

  return pageMetadata({
    title,
    description,
    path: `/products/${product.slug}`,
    locale: locale as Locale,
    images: product.images,
  });
}

export default async function ProductPage({ params: { slug, locale } }: ProductPageProps) {
  setRequestLocale(locale);

  const product = await getProductBySlug(slug);
  if (!product) return notFound();

  const [related, category] = await Promise.all([
    getRelatedProducts(product),
    getCategoryBySlug(product.category),
  ]);

  const isKa = locale === 'ka';
  const crumbs = [
    { name: isKa ? 'მთავარი' : 'Home', path: '/' },
    { name: isKa ? 'პროდუქტები' : 'Products', path: '/products' },
    ...(category
      ? [
          {
            name: isKa ? category.nameKa : category.nameEn,
            path: `/products?category=${category.slug}`,
          },
        ]
      : []),
    {
      name: isKa ? product.nameKa : product.nameEn,
      path: `/products/${product.slug}`,
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product, locale as Locale),
          breadcrumbJsonLd(crumbs, locale as Locale),
        ]}
      />
      <ProductDetailClient product={product} related={related} />
    </>
  );
}
